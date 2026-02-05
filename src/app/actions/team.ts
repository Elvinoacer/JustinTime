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
  getTodaysJobs 
} from "@/lib/teams/job-dispatcher";
import { 
  processJobEarnings, 
  getTodaysCollections,
  getMemberBalance,
  getTeamEarningsBreakdown 
} from "@/lib/teams/earnings-calculator";
import { 
  generatePayroll, 
  processPayroll, 
  getPayrollHistory,
  getPendingPayrollSummary 
} from "@/lib/teams/payroll-processor";

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
    // Check if user already owns a team
    const existingTeam = await prisma.team.findUnique({
      where: { ownerId: session.user.id }
    });

    if (existingTeam) {
      return { success: false, error: "You already own a team" };
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId: session.user.id
      }
    });

    revalidatePath('/dashboard/team');
    return { success: true, team };
  } catch (error) {
    console.error("[createTeam]", error);
    return { success: false, error: "Failed to create team" };
  }
}

/**
 * Get user's team (owned or member)
 */
export async function getMyTeam() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check if user owns a team
    let team = await prisma.team.findUnique({
      where: { ownerId: session.user.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, image: true, phone: true } } }
        },
        _count: { select: { jobs: true, members: true } }
      }
    });

    // Check if user is a member of a team
    if (!team) {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: session.user.id },
        include: {
          team: {
            include: {
              owner: { select: { name: true, image: true } },
              members: {
                include: { user: { select: { id: true, name: true, image: true } } }
              }
            }
          }
        }
      });

      if (membership) {
        return { 
          success: true, 
          team: membership.team, 
          role: membership.role,
          isOwner: false 
        };
      }
    }

    return { 
      success: true, 
      team, 
      isOwner: true,
      role: 'OWNER' as const
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
  data: { name?: string; description?: string; defaultSplit?: number; payrollCycle?: string }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.ownerId !== session.user.id) {
      return { success: false, error: "Not authorized to update this team" };
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data
    });

    revalidatePath('/dashboard/team');
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
  role: 'ADMIN' | 'MEMBER' = 'MEMBER'
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify team ownership
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.ownerId !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } }
    });

    if (existing) {
      return { success: false, error: "User is already a team member" };
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role
      },
      include: { user: { select: { name: true, email: true } } }
    });

    revalidatePath('/dashboard/team');
    return { success: true, member };
  } catch (error) {
    console.error("[inviteTeamMember]", error);
    return { success: false, error: "Failed to invite member" };
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
      include: { team: true }
    });

    if (!member || member.team.ownerId !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    await prisma.teamMember.delete({ where: { id: memberId } });

    revalidatePath('/dashboard/team');
    return { success: true };
  } catch (error) {
    console.error("[removeTeamMember]", error);
    return { success: false, error: "Failed to remove member" };
  }
}

/**
 * Update member location
 */
export async function updateMemberLocation(
  location: { lat: number; lng: number; address?: string }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const member = await prisma.teamMember.findFirst({
      where: { userId: session.user.id }
    });

    if (!member) {
      return { success: false, error: "Not a team member" };
    }

    await prisma.teamMember.update({
      where: { id: member.id },
      data: {
        lastLocation: { ...location, timestamp: new Date().toISOString() },
        lastLocationAt: new Date()
      }
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
export async function updateMemberStatus(status: 'ONLINE' | 'BUSY' | 'OFFLINE') {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const member = await prisma.teamMember.findFirst({
      where: { userId: session.user.id }
    });

    if (!member) {
      return { success: false, error: "Not a team member" };
    }

    await prisma.teamMember.update({
      where: { id: member.id },
      data: { status }
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
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const job = await createTeamJob(data);
    revalidatePath('/dashboard/team/jobs');
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
  role: string = 'WORKER'
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const assignments = await assignJobToMembers(
      jobId,
      memberIds.map(id => ({ memberId: id, role: role as any }))
    );
    
    revalidatePath('/dashboard/team/jobs');
    return { success: true, assignments };
  } catch (error) {
    console.error("[assignMembersToJob]", error);
    return { success: false, error: "Failed to assign members" };
  }
}

/**
 * Update job status
 */
export async function updateJobStatusAction(
  jobId: string,
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const job = await updateJobStatus(jobId, status);
    
    // If completed, process earnings
    if (status === 'COMPLETED') {
      const existingJob = await prisma.teamJob.findUnique({ where: { id: jobId } });
      if (existingJob?.collected) {
        await processJobEarnings(jobId);
      }
    }
    
    revalidatePath('/dashboard/team/jobs');
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
  paymentMethod: 'CASH' | 'MPESA' | 'CARD'
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Find member ID
    const member = await prisma.teamMember.findFirst({
      where: { userId: session.user.id }
    });

    const job = await markJobCollected(
      jobId,
      member?.id || session.user.id,
      paymentMethod
    );

    // If job is already completed, process earnings now
    if (job.status === 'COMPLETED') {
      await processJobEarnings(jobId);
    }
    
    revalidatePath('/dashboard/team/jobs');
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
  try {
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
  try {
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
  try {
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
  periodEnd: Date
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const result = await generatePayroll(teamId, periodStart, periodEnd);
    revalidatePath('/dashboard/team/payroll');
    return { success: true, ...result };
  } catch (error) {
    console.error("[generatePayrollAction]", error);
    return { success: false, error: "Failed to generate payroll" };
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
    const payroll = await processPayroll(payrollId, session.user.id, notes);
    revalidatePath('/dashboard/team/payroll');
    return { success: true, payroll };
  } catch (error) {
    console.error("[processPayrollAction]", error);
    return { success: false, error: "Failed to process payroll" };
  }
}

/**
 * Get pending payroll summary
 */
export async function getPendingPayrollAction(teamId: string) {
  try {
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
  try {
    const [todaysJobs, collections, pendingPayroll, members] = await Promise.all([
      getTodaysJobs(teamId),
      getTodaysCollections(teamId),
      getPendingPayrollSummary(teamId),
      prisma.teamMember.findMany({
        where: { teamId },
        include: { user: { select: { name: true, image: true, phone: true } } },
        orderBy: { status: 'asc' }
      })
    ]);

    return {
      success: true,
      todaysJobs,
      collections,
      pendingPayroll,
      members,
      stats: {
        totalMembers: members.length,
        onlineMembers: members.filter(m => m.status === 'ONLINE').length,
        busyMembers: members.filter(m => m.status === 'BUSY' || m.status === 'ON_JOB').length,
        todaysJobCount: todaysJobs.length,
        todaysCollection: collections.totalCollected
      }
    };
  } catch (error) {
    console.error("[getTeamDashboard]", error);
    return { success: false, error: "Failed to get dashboard data" };
  }
}
