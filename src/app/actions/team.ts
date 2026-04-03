"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createTeamJob,
  assignJobToMembers,
  updateJobStatus,
  markJobCollected,
  respondToAssignment,
  getTodaysJobs,
  findNearestAvailable,
} from "@/lib/teams/job-dispatcher";
import {
  processJobEarnings,
  getTodaysCollections,
  getMemberBalance,
} from "@/lib/teams/earnings-calculator";
import {
  generatePayroll,
  processPayroll,
  cancelPayroll,
  getPendingPayrollSummary,
} from "@/lib/teams/payroll-processor";
import {
  ADMIN_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  OWNER_PERMISSIONS,
} from "@/lib/permissions";
import { broadcastRealtimeEvent } from "@/lib/realtime-broadcast";
import { Prisma, type TeamJobStatus } from "@/generated/prisma/client";

const TEAM_PATHS = [
  "/dashboard/team",
  "/dashboard/team/jobs",
  "/dashboard/team/members",
  "/dashboard/team/payroll",
  "/dashboard/team/settings",
];

const ALLOWED_PAYROLL_CYCLES = new Set(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
const ALLOWED_ANNOUNCEMENT_PRIORITIES = new Set([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);
const TEAM_INVITATION_TTL_DAYS = 7;

type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

interface TeamAccessContext {
  teamId: string;
  ownerId: string;
  role: TeamRole;
  isOwner: boolean;
  membershipId: string;
}

function revalidateTeamRoutes() {
  for (const path of TEAM_PATHS) {
    revalidatePath(path);
  }
}

function sanitizeString(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function getRolePermissions(role: TeamRole): string[] {
  if (role === "OWNER") {
    return OWNER_PERMISSIONS;
  }

  if (role === "ADMIN") {
    return ADMIN_PERMISSIONS;
  }

  return DEFAULT_MEMBER_PERMISSIONS;
}

function isActivePermissions(permissions: string[]) {
  return Array.isArray(permissions) && permissions.length > 0;
}

function normalizePeriodStart(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function normalizePeriodEnd(date: Date) {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function getInvitationExpiryDate(days: number = TEAM_INVITATION_TTL_DAYS) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

function generateInvitationToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function ensureOwnerMembership(teamId: string, ownerId: string) {
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: ownerId } },
  });

  if (!existing) {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId: ownerId,
        role: "OWNER",
        permissions: OWNER_PERMISSIONS,
        status: "ONLINE",
      },
    });
  }

  const shouldRepair =
    existing.role !== "OWNER" || !isActivePermissions(existing.permissions);

  if (!shouldRepair) {
    return existing;
  }

  return prisma.teamMember.update({
    where: { id: existing.id },
    data: {
      role: "OWNER",
      permissions: OWNER_PERMISSIONS,
      status: existing.status === "ON_JOB" ? existing.status : "ONLINE",
    },
  });
}

async function listMyTeamsInternal(userId: string) {
  const [ownedTeams, memberTeams] = await Promise.all([
    prisma.team.findMany({
      where: {
        ownerId: userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.teamMember.findMany({
      where: {
        userId,
        permissions: { isEmpty: false },
        team: { isActive: true },
      },
      select: {
        role: true,
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    }),
  ]);

  const byId = new Map<
    string,
    { id: string; name: string; role: TeamRole; isOwner: boolean }
  >();

  for (const team of ownedTeams) {
    byId.set(team.id, {
      id: team.id,
      name: team.name,
      role: "OWNER",
      isOwner: true,
    });
  }

  for (const membership of memberTeams) {
    const existing = byId.get(membership.team.id);
    if (existing?.isOwner) {
      continue;
    }

    byId.set(membership.team.id, {
      id: membership.team.id,
      name: membership.team.name,
      role: (membership.team.ownerId === userId
        ? "OWNER"
        : membership.role) as TeamRole,
      isOwner: membership.team.ownerId === userId,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function resolveTeamAccessForUser(
  userId: string,
  requestedTeamId?: string,
): Promise<TeamAccessContext | null> {
  if (requestedTeamId) {
    const team = await prisma.team.findUnique({
      where: { id: requestedTeamId },
      select: { id: true, ownerId: true, isActive: true },
    });

    if (!team || !team.isActive) {
      return null;
    }

    if (team.ownerId === userId) {
      const ownerMembership = await ensureOwnerMembership(team.id, userId);
      return {
        teamId: team.id,
        ownerId: team.ownerId,
        role: "OWNER",
        isOwner: true,
        membershipId: ownerMembership.id,
      };
    }

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
      select: { id: true, role: true, permissions: true },
    });

    if (!membership || !isActivePermissions(membership.permissions)) {
      return null;
    }

    return {
      teamId: team.id,
      ownerId: team.ownerId,
      role: membership.role as TeamRole,
      isOwner: false,
      membershipId: membership.id,
    };
  }

  const ownedTeam = await prisma.team.findFirst({
    where: {
      ownerId: userId,
      isActive: true,
    },
    select: { id: true, ownerId: true },
  });

  if (ownedTeam) {
    const ownerMembership = await ensureOwnerMembership(ownedTeam.id, userId);
    return {
      teamId: ownedTeam.id,
      ownerId: ownedTeam.ownerId,
      role: "OWNER",
      isOwner: true,
      membershipId: ownerMembership.id,
    };
  }

  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      permissions: { isEmpty: false },
      team: { isActive: true },
    },
    select: {
      id: true,
      role: true,
      teamId: true,
      team: { select: { ownerId: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    return null;
  }

  return {
    teamId: membership.teamId,
    ownerId: membership.team.ownerId,
    role: membership.role as TeamRole,
    isOwner: false,
    membershipId: membership.id,
  };
}

async function assertTeamMember(teamId: string, userId: string) {
  const context = await resolveTeamAccessForUser(userId, teamId);
  if (!context) {
    throw new Error("Not authorized for this team");
  }

  return context;
}

async function assertTeamOwnerOrAdmin(teamId: string, userId: string) {
  const context = await assertTeamMember(teamId, userId);
  if (!(context.isOwner || context.role === "ADMIN")) {
    throw new Error("Owner or admin access required");
  }

  return context;
}

async function expireStaleTeamInvitations(teamId?: string) {
  const now = new Date();
  await prisma.teamInvitation.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: now },
      ...(teamId ? { teamId } : {}),
    },
    data: {
      status: "EXPIRED",
      respondedAt: now,
    },
  });
}

async function getJobActorContext(jobId: string, userId: string) {
  const job = await prisma.teamJob.findUnique({
    where: { id: jobId },
    include: {
      team: {
        select: {
          id: true,
          ownerId: true,
          isActive: true,
        },
      },
      assignments: {
        include: {
          member: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!job || !job.team.isActive) {
    return null;
  }

  let membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: job.team.id,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
      permissions: true,
    },
  });

  const isOwner = job.team.ownerId === userId;
  if (isOwner && !membership) {
    membership = await ensureOwnerMembership(job.team.id, userId);
  }

  const activeMember =
    membership && isActivePermissions(membership.permissions);
  const isAdmin = Boolean(activeMember && membership?.role === "ADMIN");
  const isAssignedWorker = job.assignments.some(
    (assignment) => assignment.member.userId === userId,
  );

  return {
    job,
    membership,
    isOwner,
    isAdmin,
    isAssignedWorker,
  };
}

function canManageTerminalJobState(
  status: TeamJobStatus,
  isOwnerOrAdmin: boolean,
) {
  if (["PENDING", "ASSIGNED", "CANCELLED"].includes(status)) {
    return isOwnerOrAdmin;
  }

  return true;
}

// ============ TEAM MANAGEMENT ============

/**
 * Create a new team
 */
export async function createTeam(name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const cleanName = sanitizeString(name);
    if (!cleanName) {
      return { success: false, error: "Team name is required" };
    }

    const [existingOwnedTeam, existingMembership] = await Promise.all([
      prisma.team.findUnique({
        where: { ownerId: session.user.id },
        select: { id: true },
      }),
      prisma.teamMember.findFirst({
        where: {
          userId: session.user.id,
          permissions: { isEmpty: false },
        },
        select: { id: true },
      }),
    ]);

    if (existingOwnedTeam || existingMembership) {
      return {
        success: false,
        error:
          "You are already part of a team. Leave your current team before creating another.",
      };
    }

    const team = await prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          name: cleanName,
          description: sanitizeString(description) || null,
          ownerId: session.user.id,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: createdTeam.id,
          userId: session.user.id,
          role: "OWNER",
          permissions: OWNER_PERMISSIONS,
          status: "ONLINE",
        },
      });

      return createdTeam;
    });

    revalidateTeamRoutes();
    return { success: true, team };
  } catch (error) {
    console.error("[createTeam]", error);
    return { success: false, error: "Failed to create team" };
  }
}

export async function getMyTeams() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "Unauthorized",
      teams: [] as Array<{
        id: string;
        name: string;
        role: TeamRole;
        isOwner: boolean;
      }>,
    };
  }

  try {
    const teams = await listMyTeamsInternal(session.user.id);
    return { success: true, teams };
  } catch (error) {
    console.error("[getMyTeams]", error);
    return {
      success: false,
      error: "Failed to load teams",
      teams: [] as Array<{
        id: string;
        name: string;
        role: TeamRole;
        isOwner: boolean;
      }>,
    };
  }
}

export async function getMyTeamInvitationsAction(limit: number = 20) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized", invitations: [] };
  }

  try {
    await expireStaleTeamInvitations();

    const sessionEmail = sanitizeString(session.user.email).toLowerCase();
    const take = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 50)
      : 20;

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { gt: new Date() },
        OR: [
          { invitedUserId: session.user.id },
          ...(sessionEmail ? [{ invitedEmail: sessionEmail }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return { success: true, invitations };
  } catch (error) {
    console.error("[getMyTeamInvitationsAction]", error);
    return {
      success: false,
      error: "Failed to load invitations",
      invitations: [],
    };
  }
}

/**
 * Get user's team (owned or member)
 */
export async function getMyTeam(teamId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const teams = await listMyTeamsInternal(session.user.id);
    const access = await resolveTeamAccessForUser(session.user.id, teamId);

    if (!access) {
      return {
        success: true,
        team: null,
        isOwner: false,
        role: null,
        teams,
      };
    }

    const team = await prisma.team.findUnique({
      where: { id: access.teamId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            phone: true,
          },
        },
        members: {
          where: { permissions: { isEmpty: false } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            jobs: true,
            members: true,
          },
        },
      },
    });

    if (!team) {
      return {
        success: true,
        team: null,
        isOwner: false,
        role: null,
        teams,
      };
    }

    return {
      success: true,
      team,
      isOwner: access.isOwner,
      role: access.role,
      teams,
      activeTeamId: access.teamId,
    };
  } catch (error) {
    console.error("[getMyTeam]", error);
    return { success: false, error: "Failed to get team" };
  }
}

/**
 * Update team settings
 */
export async function updateTeamSettings(
  teamId: string,
  data: {
    name?: string;
    description?: string;
    defaultSplit?: number;
    payrollCycle?: string;
  },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamOwnerOrAdmin(teamId, session.user.id);

    const payload: {
      name?: string;
      description?: string | null;
      defaultSplit?: number;
      payrollCycle?: string;
    } = {};

    if (typeof data.name === "string") {
      const cleanName = sanitizeString(data.name);
      if (!cleanName) {
        return { success: false, error: "Team name cannot be empty" };
      }
      payload.name = cleanName;
    }

    if (typeof data.description === "string") {
      payload.description = sanitizeString(data.description) || null;
    }

    if (typeof data.defaultSplit === "number") {
      if (
        Number.isNaN(data.defaultSplit) ||
        data.defaultSplit < 0 ||
        data.defaultSplit > 100
      ) {
        return {
          success: false,
          error: "Default split must be between 0 and 100",
        };
      }
      payload.defaultSplit = data.defaultSplit;
    }

    if (typeof data.payrollCycle === "string") {
      const cycle = sanitizeString(data.payrollCycle).toUpperCase();
      if (!ALLOWED_PAYROLL_CYCLES.has(cycle)) {
        return { success: false, error: "Invalid payroll cycle" };
      }
      payload.payrollCycle = cycle;
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: payload,
    });

    revalidateTeamRoutes();
    return { success: true, team: updated };
  } catch (error) {
    console.error("[updateTeamSettings]", error);
    return { success: false, error: "Failed to update team" };
  }
}

// ============ MEMBER MANAGEMENT ============

/**
 * Invite member to team
 */
export async function inviteTeamMember(
  teamId: string,
  email: string,
  role: "ADMIN" | "MEMBER" = "MEMBER",
  permissions?: string[],
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamOwnerOrAdmin(teamId, session.user.id);

    const cleanEmail = sanitizeString(email).toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Email is required" };
    }

    const sessionEmail = sanitizeString(session.user.email).toLowerCase();
    if (sessionEmail && sessionEmail === cleanEmail) {
      return { success: false, error: "You are already in this team" };
    }

    const normalizedRole = role === "ADMIN" ? "ADMIN" : "MEMBER";
    const customPermissions = Array.isArray(permissions)
      ? Array.from(
          new Set(
            permissions
              .map((permission) => sanitizeString(permission))
              .filter(Boolean),
          ),
        )
      : [];
    const invitationPermissions =
      customPermissions.length > 0
        ? customPermissions
        : getRolePermissions(normalizedRole);
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (user?.id === session.user.id) {
      return { success: false, error: "You are already in this team" };
    }

    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user?.id || "",
        },
      },
      select: { id: true, permissions: true },
    });

    if (existing) {
      return isActivePermissions(existing.permissions)
        ? { success: false, error: "User is already a team member" }
        : {
            success: false,
            error:
              "This user was previously removed. Ask them to accept a new invitation.",
          };
    }

    if (user) {
      const [ownedTeamConflict, membershipConflict] = await Promise.all([
        prisma.team.findFirst({
          where: {
            ownerId: user.id,
            isActive: true,
            id: { not: teamId },
          },
          select: { id: true },
        }),
        prisma.teamMember.findFirst({
          where: {
            userId: user.id,
            teamId: { not: teamId },
            permissions: { isEmpty: false },
            team: { isActive: true },
          },
          select: { id: true },
        }),
      ]);

      if (ownedTeamConflict || membershipConflict) {
        return {
          success: false,
          error: "This user is already active in another team.",
        };
      }
    }

    await expireStaleTeamInvitations(teamId);

    const existingPending = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        invitedEmail: cleanEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPending) {
      const refreshed = await prisma.teamInvitation.update({
        where: { id: existingPending.id },
        data: {
          invitedById: session.user.id,
          invitedUserId: user?.id || existingPending.invitedUserId,
          role: normalizedRole,
          permissions: invitationPermissions,
          expiresAt: getInvitationExpiryDate(),
          token: generateInvitationToken(),
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        invitation: refreshed,
        message: "An existing pending invitation was updated.",
      };
    }

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        invitedById: session.user.id,
        invitedEmail: cleanEmail,
        invitedUserId: user?.id || null,
        role: normalizedRole,
        permissions: invitationPermissions,
        token: generateInvitationToken(),
        expiresAt: getInvitationExpiryDate(),
      },
    });

    if (user?.id) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Team Invitation",
          message: "You have been invited to join a team.",
          type: "TEAM_INVITATION",
          entityType: "team_invitation",
          entityId: invitation.id,
          actorId: session.user.id,
          actionUrl: "/dashboard/team",
        },
      });
    }

    revalidateTeamRoutes();
    return { success: true, invitation };
  } catch (error) {
    console.error("[inviteTeamMember]", error);
    return { success: false, error: "Failed to invite member" };
  }
}

export async function addMemberToMyTeam(
  email: string,
  role: "ADMIN" | "MEMBER" = "MEMBER",
  permissions?: string[],
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const teamContext = await resolveTeamAccessForUser(session.user.id);
  if (!teamContext) {
    return { success: false, error: "No active team found" };
  }

  return inviteTeamMember(teamContext.teamId, email, role, permissions);
}

export async function respondToTeamInvitationAction(
  invitationId: string,
  accept: boolean,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await expireStaleTeamInvitations();

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: {
        team: {
          select: {
            id: true,
            ownerId: true,
            isActive: true,
          },
        },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: "This invitation is no longer pending" };
    }

    if (invitation.expiresAt <= new Date()) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "EXPIRED",
          respondedAt: new Date(),
        },
      });
      return { success: false, error: "Invitation has expired" };
    }

    const sessionEmail = sanitizeString(session.user.email).toLowerCase();
    const invitationEmail = sanitizeString(
      invitation.invitedEmail,
    ).toLowerCase();
    const isIntendedRecipient =
      invitation.invitedUserId === session.user.id ||
      (sessionEmail.length > 0 && invitationEmail === sessionEmail);

    if (!isIntendedRecipient) {
      return { success: false, error: "Not authorized for this invitation" };
    }

    if (!accept) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
          invitedUserId: session.user.id,
        },
      });

      revalidateTeamRoutes();
      return { success: true };
    }

    if (!invitation.team.isActive) {
      return { success: false, error: "This team is no longer active" };
    }

    const [ownedTeamConflict, membershipConflict] = await Promise.all([
      prisma.team.findFirst({
        where: {
          ownerId: session.user.id,
          isActive: true,
          id: { not: invitation.team.id },
        },
        select: { id: true },
      }),
      prisma.teamMember.findFirst({
        where: {
          userId: session.user.id,
          teamId: { not: invitation.team.id },
          permissions: { isEmpty: false },
          team: { isActive: true },
        },
        select: { id: true },
      }),
    ]);

    if (ownedTeamConflict || membershipConflict) {
      return {
        success: false,
        error:
          "You are already active in another team. Leave it before accepting this invitation.",
      };
    }

    const normalizedRole = invitation.role === "ADMIN" ? "ADMIN" : "MEMBER";
    const safePermissions =
      Array.isArray(invitation.permissions) && invitation.permissions.length > 0
        ? invitation.permissions
        : getRolePermissions(normalizedRole);

    const member = await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: invitation.teamId,
            userId: session.user.id,
          },
        },
      });

      const upsertedMember = existingMembership
        ? await tx.teamMember.update({
            where: { id: existingMembership.id },
            data: {
              role: normalizedRole,
              permissions: safePermissions,
              status: "OFFLINE",
            },
          })
        : await tx.teamMember.create({
            data: {
              teamId: invitation.teamId,
              userId: session.user.id,
              role: normalizedRole,
              permissions: safePermissions,
              status: "OFFLINE",
            },
          });

      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          respondedAt: new Date(),
          invitedUserId: session.user.id,
        },
      });

      return upsertedMember;
    });

    await prisma.notification.create({
      data: {
        userId: invitation.team.ownerId,
        title: "Invitation Accepted",
        message: "A team invitation has been accepted.",
        type: "TEAM_INVITATION",
        entityType: "team_invitation",
        entityId: invitation.id,
        actorId: session.user.id,
        actionUrl: `/dashboard/team?teamId=${invitation.team.id}`,
      },
    });

    revalidateTeamRoutes();
    return { success: true, member };
  } catch (error) {
    console.error("[respondToTeamInvitationAction]", error);
    return { success: false, error: "Failed to respond to invitation" };
  }
}

export async function revokeTeamInvitationAction(invitationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        teamId: true,
        status: true,
        invitedUserId: true,
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    await assertTeamOwnerOrAdmin(invitation.teamId, session.user.id);

    if (invitation.status !== "PENDING") {
      return {
        success: false,
        error: "Only pending invitations can be revoked",
      };
    }

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "REVOKED",
        respondedAt: new Date(),
      },
    });

    if (invitation.invitedUserId) {
      await prisma.notification.create({
        data: {
          userId: invitation.invitedUserId,
          title: "Invitation Revoked",
          message: "A team invitation was revoked by the team admin.",
          type: "TEAM_INVITATION",
          entityType: "team_invitation",
          entityId: invitation.id,
          actorId: session.user.id,
          actionUrl: "/dashboard/team",
        },
      });
    }

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[revokeTeamInvitationAction]", error);
    return { success: false, error: "Failed to revoke invitation" };
  }
}

export async function updateMemberRole(
  memberId: string,
  role: "ADMIN" | "MEMBER",
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        team: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    const access = await assertTeamOwnerOrAdmin(
      member.team.id,
      session.user.id,
    );
    if (member.userId === member.team.ownerId) {
      return { success: false, error: "Owner role cannot be changed" };
    }

    if (!access.isOwner && member.role === "ADMIN") {
      return { success: false, error: "Only the owner can demote an admin" };
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        role,
        permissions: getRolePermissions(role),
      },
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[updateMemberRole]", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function updateMemberPermissions(
  memberId: string,
  permissions: string[],
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        team: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    const access = await assertTeamOwnerOrAdmin(
      member.team.id,
      session.user.id,
    );
    if (!access.isOwner && member.role === "ADMIN") {
      return {
        success: false,
        error: "Only the owner can edit admin permissions",
      };
    }

    if (member.userId === member.team.ownerId || member.role === "OWNER") {
      return { success: false, error: "Owner permissions cannot be changed" };
    }

    const normalizedPermissions = Array.from(
      new Set(
        (permissions || [])
          .map((permission) => sanitizeString(permission))
          .filter(Boolean),
      ),
    );

    if (normalizedPermissions.length === 0) {
      return { success: false, error: "At least one permission is required" };
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { permissions: normalizedPermissions },
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[updateMemberPermissions]", error);
    return { success: false, error: "Failed to update permissions" };
  }
}

/**
 * Remove member from team
 */
export async function removeTeamMember(memberId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        team: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    const access = await assertTeamOwnerOrAdmin(
      member.team.id,
      session.user.id,
    );

    if (member.userId === member.team.ownerId || member.role === "OWNER") {
      return { success: false, error: "Team owner cannot be removed" };
    }

    if (!access.isOwner && member.role === "ADMIN") {
      return { success: false, error: "Only the owner can remove an admin" };
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        permissions: [],
        role: "MEMBER",
        status: "OFFLINE",
        lastLocation: Prisma.DbNull,
        lastLocationAt: null,
      },
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[removeTeamMember]", error);
    return { success: false, error: "Failed to remove member" };
  }
}

export async function leaveTeamAction(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true, isActive: true },
    });

    if (!team || !team.isActive) {
      return { success: false, error: "Team not found" };
    }

    if (team.ownerId === session.user.id) {
      return {
        success: false,
        error: "Team owner cannot leave directly. Transfer ownership first.",
      };
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.user.id,
        },
      },
      select: { id: true, permissions: true },
    });

    if (!membership || !isActivePermissions(membership.permissions)) {
      return { success: false, error: "You are not an active member" };
    }

    await prisma.teamMember.update({
      where: { id: membership.id },
      data: {
        permissions: [],
        role: "MEMBER",
        status: "OFFLINE",
        lastLocation: Prisma.DbNull,
        lastLocationAt: null,
      },
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[leaveTeamAction]", error);
    return { success: false, error: "Failed to leave team" };
  }
}

export async function transferTeamOwnershipAction(
  teamId: string,
  newOwnerMemberId: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true, isActive: true },
    });

    if (!team || !team.isActive) {
      return { success: false, error: "Team not found" };
    }

    if (team.ownerId !== session.user.id) {
      return { success: false, error: "Only owner can transfer ownership" };
    }

    const newOwnerMember = await prisma.teamMember.findUnique({
      where: { id: newOwnerMemberId },
      select: {
        id: true,
        teamId: true,
        userId: true,
        permissions: true,
      },
    });

    if (!newOwnerMember || newOwnerMember.teamId !== teamId) {
      return { success: false, error: "Selected member is invalid" };
    }

    if (!isActivePermissions(newOwnerMember.permissions)) {
      return { success: false, error: "Selected member is inactive" };
    }

    if (newOwnerMember.userId === session.user.id) {
      return { success: false, error: "You already own this team" };
    }

    await prisma.$transaction(async (tx) => {
      const oldOwnerMembership = await tx.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: session.user.id,
          },
        },
      });

      if (oldOwnerMembership) {
        await tx.teamMember.update({
          where: { id: oldOwnerMembership.id },
          data: {
            role: "ADMIN",
            permissions: ADMIN_PERMISSIONS,
            status:
              oldOwnerMembership.status === "ON_JOB" ? "ON_JOB" : "ONLINE",
          },
        });
      }

      await tx.teamMember.update({
        where: { id: newOwnerMember.id },
        data: {
          role: "OWNER",
          permissions: OWNER_PERMISSIONS,
          status: "ONLINE",
        },
      });

      await tx.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerMember.userId },
      });

      await tx.notification.create({
        data: {
          userId: newOwnerMember.userId,
          title: "Team Ownership Transferred",
          message: "You are now the owner of this team.",
          type: "TEAM_INVITATION",
          entityType: "team",
          entityId: teamId,
          actorId: session.user.id,
          actionUrl: `/dashboard/team?teamId=${teamId}`,
        },
      });
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[transferTeamOwnershipAction]", error);
    return { success: false, error: "Failed to transfer ownership" };
  }
}

/**
 * Update member location
 */
export async function updateMemberLocation(
  location: {
    lat: number;
    lng: number;
    address?: string;
  },
  teamId?: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const access = await resolveTeamAccessForUser(session.user.id, teamId);
    if (!access) {
      return { success: false, error: "Not a team member" };
    }

    if (
      typeof location?.lat !== "number" ||
      typeof location?.lng !== "number" ||
      Number.isNaN(location.lat) ||
      Number.isNaN(location.lng)
    ) {
      return { success: false, error: "Invalid location coordinates" };
    }

    await prisma.teamMember.update({
      where: { id: access.membershipId },
      data: {
        lastLocation: { ...location, timestamp: new Date().toISOString() },
        lastLocationAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[updateMemberLocation]", error);
    return { success: false, error: "Failed to update location" };
  }
}

/**
 * Update member status
 */
export async function updateMemberStatus(
  status: "ONLINE" | "BUSY" | "OFFLINE" | "ON_JOB",
  teamId?: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const access = await resolveTeamAccessForUser(session.user.id, teamId);
    if (!access) {
      return { success: false, error: "Not a team member" };
    }

    const allowedStatuses = new Set(["ONLINE", "BUSY", "OFFLINE", "ON_JOB"]);
    if (!allowedStatuses.has(status)) {
      return { success: false, error: "Invalid status" };
    }

    await prisma.teamMember.update({
      where: { id: access.membershipId },
      data: { status },
    });

    return { success: true };
  } catch (error) {
    console.error("[updateMemberStatus]", error);
    return { success: false, error: "Failed to update status" };
  }
}

// ============ JOB MANAGEMENT ============

/**
 * Create a team job
 */
export async function createJob(data: {
  teamId: string;
  title: string;
  description?: string;
  location?: { address: string; lat?: number; lng?: number };
  scheduledAt: Date;
  estimatedDuration?: number;
  amount: number;
  clientName?: string;
  clientPhone?: string;
  bookingId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const access = await assertTeamOwnerOrAdmin(data.teamId, session.user.id);

    const cleanTitle = sanitizeString(data.title);
    if (!cleanTitle) {
      return { success: false, error: "Job title is required" };
    }

    if (!Number.isFinite(data.amount) || data.amount < 0) {
      return { success: false, error: "Invalid amount" };
    }

    if (data.bookingId) {
      const teamUserIds = await prisma.teamMember.findMany({
        where: {
          teamId: data.teamId,
          permissions: { isEmpty: false },
        },
        select: { userId: true },
      });

      const providerIds = Array.from(
        new Set([...teamUserIds.map((item) => item.userId), access.ownerId]),
      );
      const booking = await prisma.booking.findFirst({
        where: {
          id: data.bookingId,
          providerId: { in: providerIds },
        },
        select: { id: true },
      });

      if (!booking) {
        return {
          success: false,
          error: "Selected booking is not accessible to this team",
        };
      }
    }

    const job = await createTeamJob(data);
    revalidateTeamRoutes();
    return { success: true, job };
  } catch (error) {
    console.error("[createJob]", error);
    return { success: false, error: "Failed to create job" };
  }
}

/**
 * Assign members to a job
 */
export async function assignMembersToJob(
  jobId: string,
  memberIds: string[],
  role: string = "WORKER",
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const job = await prisma.teamJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    await assertTeamOwnerOrAdmin(job.teamId, session.user.id);

    const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));
    if (uniqueMemberIds.length === 0) {
      return { success: false, error: "Select at least one member" };
    }

    const members = await prisma.teamMember.findMany({
      where: {
        id: { in: uniqueMemberIds },
        teamId: job.teamId,
        permissions: { isEmpty: false },
      },
      select: { id: true },
    });

    if (members.length !== uniqueMemberIds.length) {
      return {
        success: false,
        error: "One or more selected members are invalid or inactive",
      };
    }

    const assignments = await assignJobToMembers(
      jobId,
      uniqueMemberIds.map((id) => ({ memberId: id, role })),
    );

    revalidateTeamRoutes();
    return { success: true, assignments };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "One or more members are already assigned to this job",
      };
    }

    console.error("[assignMembersToJob]", error);
    return { success: false, error: "Failed to assign members" };
  }
}

export async function unassignMemberFromJobAction(
  jobId: string,
  memberId: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const job = await prisma.teamJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        teamId: true,
        status: true,
      },
    });

    if (!job) {
      return { success: false, error: "Job not found" };
    }

    await assertTeamOwnerOrAdmin(job.teamId, session.user.id);

    const assignment = await prisma.teamJobAssignment.findUnique({
      where: {
        jobId_memberId: {
          jobId,
          memberId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    if (["IN_PROGRESS", "COMPLETED"].includes(assignment.status)) {
      return {
        success: false,
        error: "Cannot unassign a member from an active/completed assignment",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamJobAssignment.delete({
        where: {
          jobId_memberId: {
            jobId,
            memberId,
          },
        },
      });

      const activeAssignmentsForMember = await tx.teamJobAssignment.count({
        where: {
          memberId,
          status: {
            in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
          },
        },
      });

      if (activeAssignmentsForMember === 0) {
        await tx.teamMember.update({
          where: { id: memberId },
          data: { status: "ONLINE" },
        });
      }

      const remainingAssignments = await tx.teamJobAssignment.count({
        where: { jobId },
      });

      if (remainingAssignments === 0 && job.status === "ASSIGNED") {
        await tx.teamJob.update({
          where: { id: jobId },
          data: { status: "PENDING" },
        });
      }
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[unassignMemberFromJobAction]", error);
    return { success: false, error: "Failed to unassign member" };
  }
}

export async function respondToAssignmentAction(
  assignmentId: string,
  accepted: boolean,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const assignment = await prisma.teamJobAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        member: {
          select: {
            id: true,
            userId: true,
            teamId: true,
          },
        },
      },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    const isSelf = assignment.member.userId === session.user.id;
    if (!isSelf) {
      await assertTeamOwnerOrAdmin(assignment.member.teamId, session.user.id);
    }

    const updated = await respondToAssignment(assignmentId, accepted);
    revalidateTeamRoutes();
    return { success: true, assignment: updated };
  } catch (error) {
    console.error("[respondToAssignmentAction]", error);
    return { success: false, error: "Failed to update assignment" };
  }
}

/**
 * Update job status
 */
export async function updateJobStatusAction(
  jobId: string,
  status: TeamJobStatus,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const actor = await getJobActorContext(jobId, session.user.id);
    if (!actor) {
      return { success: false, error: "Job not found" };
    }

    const hasTeamPrivilege = actor.isOwner || actor.isAdmin;
    const canAct = hasTeamPrivilege || actor.isAssignedWorker;
    if (!canAct) {
      return { success: false, error: "Not authorized to update this job" };
    }

    if (!canManageTerminalJobState(status, hasTeamPrivilege)) {
      return {
        success: false,
        error: "Only owner/admin can perform this job transition",
      };
    }

    const job = await updateJobStatus(jobId, status);

    // If completed, process earnings
    if (status === "COMPLETED") {
      const existingJob = await prisma.teamJob.findUnique({
        where: { id: jobId },
      });
      if (existingJob?.collected) {
        await processJobEarnings(jobId);
      }
    }

    revalidateTeamRoutes();
    return { success: true, job };
  } catch (error) {
    console.error("[updateJobStatusAction]", error);
    return { success: false, error: "Failed to update job status" };
  }
}

/**
 * Mark job as collected
 */
export async function markJobAsCollected(
  jobId: string,
  paymentMethod: "CASH" | "MPESA" | "CARD",
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const actor = await getJobActorContext(jobId, session.user.id);
    if (!actor) {
      return { success: false, error: "Job not found" };
    }

    const hasTeamPrivilege = actor.isOwner || actor.isAdmin;
    if (!(hasTeamPrivilege || actor.isAssignedWorker)) {
      return { success: false, error: "Not authorized to mark collection" };
    }

    let collectedByMemberId = actor.membership?.id;
    if (!collectedByMemberId) {
      const ownerMember = await ensureOwnerMembership(
        actor.job.team.id,
        session.user.id,
      );
      collectedByMemberId = ownerMember.id;
    }

    const job = await markJobCollected(
      jobId,
      collectedByMemberId,
      paymentMethod,
    );

    // If job is already completed, process earnings now
    if (job.status === "COMPLETED") {
      await processJobEarnings(jobId);
    }

    revalidateTeamRoutes();
    return { success: true, job };
  } catch (error) {
    console.error("[markJobAsCollected]", error);
    return { success: false, error: "Failed to mark as collected" };
  }
}

/**
 * Get today's jobs
 */
export async function getTodaysJobsAction(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamMember(teamId, session.user.id);
    const jobs = await getTodaysJobs(teamId);
    return { success: true, jobs };
  } catch (error) {
    console.error("[getTodaysJobsAction]", error);
    return { success: false, error: "Failed to get jobs" };
  }
}

// ============ EARNINGS & PAYROLL ============

/**
 * Get today's collections
 */
export async function getTodaysCollectionsAction(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamMember(teamId, session.user.id);
    const collections = await getTodaysCollections(teamId);
    return { success: true, ...collections };
  } catch (error) {
    console.error("[getTodaysCollectionsAction]", error);
    return { success: false, error: "Failed to get collections" };
  }
}

/**
 * Get member balance
 */
export async function getMemberBalanceAction(memberId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { id: true, teamId: true, userId: true },
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    if (member.userId !== session.user.id) {
      await assertTeamOwnerOrAdmin(member.teamId, session.user.id);
    }

    const balance = await getMemberBalance(memberId);
    return { success: true, ...balance };
  } catch (error) {
    console.error("[getMemberBalanceAction]", error);
    return { success: false, error: "Failed to get balance" };
  }
}

/**
 * Generate payroll
 */
export async function generatePayrollAction(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamOwnerOrAdmin(teamId, session.user.id);

    const start = normalizePeriodStart(periodStart);
    const end = normalizePeriodEnd(periodEnd);

    if (end < start) {
      return { success: false, error: "Period end must be after period start" };
    }

    const result = await generatePayroll(teamId, start, end);
    revalidateTeamRoutes();
    return { success: true, ...result };
  } catch (error: unknown) {
    console.error("[generatePayrollAction]", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to generate payroll"),
    };
  }
}

/**
 * Process payroll
 */
export async function processPayrollAction(payrollId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const payrollRecord = await prisma.teamPayroll.findUnique({
      where: { id: payrollId },
      select: {
        id: true,
        teamId: true,
        status: true,
      },
    });

    if (!payrollRecord) {
      return { success: false, error: "Payroll not found" };
    }

    if (payrollRecord.status !== "PENDING") {
      return { success: false, error: "Only pending payroll can be processed" };
    }

    await assertTeamOwnerOrAdmin(payrollRecord.teamId, session.user.id);

    const payroll = await processPayroll(payrollId, session.user.id, notes);
    revalidateTeamRoutes();
    return { success: true, payroll };
  } catch (error) {
    console.error("[processPayrollAction]", error);
    return { success: false, error: "Failed to process payroll" };
  }
}

export async function cancelPayrollAction(payrollId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const payrollRecord = await prisma.teamPayroll.findUnique({
      where: { id: payrollId },
      select: {
        id: true,
        teamId: true,
        status: true,
      },
    });

    if (!payrollRecord) {
      return { success: false, error: "Payroll not found" };
    }

    if (payrollRecord.status !== "PENDING") {
      return { success: false, error: "Only pending payroll can be cancelled" };
    }

    await assertTeamOwnerOrAdmin(payrollRecord.teamId, session.user.id);
    await cancelPayroll(payrollId);

    revalidateTeamRoutes();
    return { success: true };
  } catch (error: unknown) {
    console.error("[cancelPayrollAction]", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to cancel payroll"),
    };
  }
}

/**
 * Get pending payroll summary
 */
export async function getPendingPayrollAction(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamMember(teamId, session.user.id);
    const summary = await getPendingPayrollSummary(teamId);
    return { success: true, ...summary };
  } catch (error) {
    console.error("[getPendingPayrollAction]", error);
    return { success: false, error: "Failed to get pending payroll" };
  }
}

/**
 * Get team dashboard data
 */
export async function getTeamDashboard(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamMember(teamId, session.user.id);

    const [todaysJobs, collections, pendingPayroll, members, announcements] =
      await Promise.all([
        getTodaysJobs(teamId),
        getTodaysCollections(teamId),
        getPendingPayrollSummary(teamId),
        prisma.teamMember.findMany({
          where: {
            teamId,
            permissions: { isEmpty: false },
          },
          include: {
            user: { select: { name: true, image: true, phone: true } },
          },
          orderBy: { status: "asc" },
        }),
        prisma.teamAnnouncement.findMany({
          where: { teamId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    const collectorNames: Record<string, { name: string }> = {};
    for (const member of members) {
      collectorNames[member.id] = { name: member.user.name || "Unknown" };
    }

    return {
      success: true,
      todaysJobs,
      collections: {
        ...collections,
        collectorNames,
      },
      pendingPayroll,
      members,
      announcements,
      stats: {
        totalMembers: members.length,
        onlineMembers: members.filter((m) => m.status === "ONLINE").length,
        busyMembers: members.filter(
          (m) => m.status === "BUSY" || m.status === "ON_JOB",
        ).length,
        todaysJobCount: todaysJobs.length,
        todaysCollection: collections.totalCollected,
      },
    };
  } catch (error) {
    console.error("[getTeamDashboard]", error);
    return { success: false, error: "Failed to get dashboard data" };
  }
}

export async function getTeamMembersPageData(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const access = await assertTeamMember(teamId, session.user.id);
    await expireStaleTeamInvitations(teamId);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!team) {
      return { success: false, error: "Team not found" };
    }

    const [members, pendingInvitations, paidEarningsByMember] =
      await Promise.all([
        prisma.teamMember.findMany({
          where: {
            teamId,
            permissions: { isEmpty: false },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                phone: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        }),
        access.isOwner || access.role === "ADMIN"
          ? prisma.teamInvitation.findMany({
              where: {
                teamId,
                status: "PENDING",
                expiresAt: { gt: new Date() },
              },
              orderBy: { createdAt: "desc" },
              take: 30,
              include: {
                invitedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                invitedUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        prisma.teamEarning.groupBy({
          by: ["memberId"],
          where: {
            teamId,
            isPaid: true,
          },
          _sum: {
            amount: true,
          },
          _max: {
            paidAt: true,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    const payoutStatsByMember = Object.fromEntries(
      paidEarningsByMember.map((entry) => [
        entry.memberId,
        {
          paidTotal: Number(entry._sum.amount || 0),
          paidCount: entry._count._all,
          lastPaidAt: entry._max.paidAt,
        },
      ]),
    );

    return {
      success: true,
      team,
      members,
      pendingInvitations,
      payoutStatsByMember,
      isOwner: access.isOwner,
      role: access.role,
    };
  } catch (error) {
    console.error("[getTeamMembersPageData]", error);
    return { success: false, error: "Failed to load team members" };
  }
}

export async function getTeamJobsPageData(
  teamId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const access = await assertTeamMember(teamId, session.user.id);
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(Math.floor(pageSize), 50)
        : 20;
    const skip = (safePage - 1) * safePageSize;

    const [total, jobs, availableMembers, team] = await Promise.all([
      prisma.teamJob.count({ where: { teamId } }),
      prisma.teamJob.findMany({
        where: { teamId },
        include: {
          assignments: {
            include: {
              member: {
                include: {
                  user: {
                    select: { name: true, image: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        skip,
        take: safePageSize,
      }),
      prisma.teamMember.findMany({
        where: {
          teamId,
          permissions: { isEmpty: false },
          status: "ONLINE",
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      }),
      prisma.team.findUnique({
        where: { id: teamId },
        select: {
          ownerId: true,
        },
      }),
    ]);

    const nearestSuggestions: Record<string, string[]> = {};
    for (const job of jobs) {
      const location = job.location as { lat?: number; lng?: number } | null;
      if (
        location?.lat == null ||
        location?.lng == null ||
        job.status !== "PENDING"
      ) {
        nearestSuggestions[job.id] = availableMembers.map(
          (member) => member.id,
        );
        continue;
      }

      const nearest = await findNearestAvailable(
        teamId,
        { lat: location.lat, lng: location.lng },
        10,
      );
      nearestSuggestions[job.id] = nearest.map((member) => member.id);
    }

    let bookingOptions: Array<{
      id: string;
      date: Date;
      totalAmount: Prisma.Decimal;
      clientName: string;
      status: string;
    }> = [];

    if (access.isOwner || access.role === "ADMIN") {
      const teamUserIds = await prisma.teamMember.findMany({
        where: {
          teamId,
          permissions: { isEmpty: false },
        },
        select: { userId: true },
      });

      const providerIds = Array.from(
        new Set(
          [...teamUserIds.map((item) => item.userId), team?.ownerId].filter(
            Boolean,
          ),
        ),
      ) as string[];

      if (providerIds.length > 0) {
        const bookings = await prisma.booking.findMany({
          where: {
            providerId: { in: providerIds },
            status: {
              in: [
                "PENDING",
                "CONFIRMED",
                "IN_PROGRESS",
                "AWAITING_CLIENT_CONFIRMATION",
              ],
            },
          },
          select: {
            id: true,
            date: true,
            totalAmount: true,
            status: true,
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: 50,
        });

        bookingOptions = bookings.map((booking) => ({
          id: booking.id,
          date: booking.date,
          totalAmount: booking.totalAmount,
          status: booking.status,
          clientName: booking.client.name || "Client",
        }));
      }
    }

    return {
      success: true,
      jobs,
      availableMembers,
      nearestSuggestions,
      bookingOptions,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      isOwner: access.isOwner,
      role: access.role,
    };
  } catch (error) {
    console.error("[getTeamJobsPageData]", error);
    return { success: false, error: "Failed to load jobs" };
  }
}

export async function getTeamPayrollPageData(
  teamId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const access = await assertTeamMember(teamId, session.user.id);
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(Math.floor(pageSize), 50)
        : 20;
    const skip = (safePage - 1) * safePageSize;

    const [pending, total, payrolls] = await Promise.all([
      getPendingPayrollSummary(teamId),
      prisma.teamPayroll.count({ where: { teamId } }),
      prisma.teamPayroll.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        skip,
        take: safePageSize,
        include: {
          _count: { select: { earnings: true } },
        },
      }),
    ]);

    return {
      success: true,
      pending,
      payrolls,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      isOwner: access.isOwner,
      role: access.role,
    };
  } catch (error) {
    console.error("[getTeamPayrollPageData]", error);
    return { success: false, error: "Failed to load payroll data" };
  }
}

export async function createAnnouncement(
  teamId: string,
  title: string,
  content: string,
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" = "NORMAL",
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamOwnerOrAdmin(teamId, session.user.id);

    const cleanTitle = sanitizeString(title);
    const cleanContent = sanitizeString(content);
    const cleanPriority = sanitizeString(priority).toUpperCase();

    if (!cleanTitle || !cleanContent) {
      return { success: false, error: "Title and message are required" };
    }

    if (!ALLOWED_ANNOUNCEMENT_PRIORITIES.has(cleanPriority)) {
      return { success: false, error: "Invalid announcement priority" };
    }

    const announcement = await prisma.teamAnnouncement.create({
      data: {
        teamId,
        authorId: session.user.id,
        title: cleanTitle,
        content: cleanContent,
        priority: cleanPriority,
      },
    });

    void broadcastRealtimeEvent({
      event: "team_announcement",
      data: {
        teamId,
        announcementId: announcement.id,
        priority: announcement.priority,
        title: announcement.title,
      },
    });

    revalidateTeamRoutes();
    return { success: true, announcement };
  } catch (error) {
    console.error("[createAnnouncement]", error);
    return { success: false, error: "Failed to create announcement" };
  }
}

export async function getTeamAnnouncementsAction(
  teamId: string,
  limit: number = 20,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await assertTeamMember(teamId, session.user.id);
    const take = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 50)
      : 20;

    const announcements = await prisma.teamAnnouncement.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      take,
    });

    return { success: true, announcements };
  } catch (error) {
    console.error("[getTeamAnnouncementsAction]", error);
    return { success: false, error: "Failed to load announcements" };
  }
}

export async function dismissTeamAnnouncementAction(announcementId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const announcement = await prisma.teamAnnouncement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!announcement) {
      return { success: false, error: "Announcement not found" };
    }

    await assertTeamOwnerOrAdmin(announcement.teamId, session.user.id);

    await prisma.teamAnnouncement.delete({
      where: { id: announcement.id },
    });

    void broadcastRealtimeEvent({
      event: "team_announcement",
      data: {
        teamId: announcement.teamId,
        announcementId: announcement.id,
        action: "dismissed",
      },
    });

    revalidateTeamRoutes();
    return { success: true };
  } catch (error) {
    console.error("[dismissTeamAnnouncementAction]", error);
    return { success: false, error: "Failed to dismiss announcement" };
  }
}
