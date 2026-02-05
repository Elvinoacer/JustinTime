"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TeamRole } from "@/generated/prisma/index"; // Ensure this matches your generated path
import { TeamPermission, OWNER_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from "@/lib/permissions";

// Create a Team
export async function createTeam(name: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    // Check if user already owns a team
    const existingTeam = await prisma.team.findUnique({
      where: { ownerId: session.user.id },
    });

    if (existingTeam) {
      return { success: false, error: "You already have a team." };
    }

    const team = await prisma.team.create({
      data: {
        name,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER", // Prisma Enum
            permissions: OWNER_PERMISSIONS,
          },
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, team };
  } catch (error) {
    console.error("Create Team Error:", error);
    return { success: false, error: "Failed to create team" };
  }
}

// Get My Team Context (Owned or Member)
export async function getMyTeam() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // 1. Check if Owner
  const ownedTeam = await prisma.team.findUnique({
    where: { ownerId: session.user.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  if (ownedTeam) return { ...ownedTeam, myRole: "OWNER", myPermissions: OWNER_PERMISSIONS };

  // 2. Check if Member
  const membership = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
            members: {
                include: { user: { select: { id: true, name: true, email: true, image: true } } },
            }
        }
      },
    },
  });

  if (membership) {
    return {
      ...membership.team,
      myRole: membership.role,
      myPermissions: membership.permissions,
    };
  }

  return null;
}

// Invite Member (By Email - Simplified for MVP: Requires user to exist for now)
export async function addMember(email: string, role: string = "MEMBER", permissions: string[] = DEFAULT_MEMBER_PERMISSIONS) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    // Verify requester is OWNER or ADMIN
    const requesterTeam = await prisma.team.findUnique({
      where: { ownerId: session.user.id },
    });
    
    // Simplification: Only Owner can invite for now to avoid looking up membership recursively efficiently without caching permissions
    if (!requesterTeam) {
         // Check if they are an admin member
         // For MVP let's restrict to Owner to keep it simple and safe
         return { success: false, error: "Only the Team Owner can invite members." };
    }

    const teamId = requesterTeam.id;

    // Find User by Email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return { success: false, error: "User not found. They must sign up first." };
    }

    // Check if already member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return { success: false, error: "User is already a member of this team." };
    }
    
    // Should verify role is valid enum
    const validRole = (role === "ADMIN" || role === "MEMBER") ? role : "MEMBER";

    await prisma.teamMember.create({
      data: {
        teamId,
        userId: userToAdd.id,
        role: validRole as any, // Cast to enum
        permissions,
      },
    });

    revalidatePath("/dashboard/team");
    return { success: true };
  } catch (error) {
    console.error("Add Member Error:", error);
    return { success: false, error: "Failed to add member" };
  }
}

export async function removeMember(memberId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        // Verify requester is Owner
        const requesterTeam = await prisma.team.findUnique({ where: { ownerId: session.user.id } });
        if (!requesterTeam) return { success: false, error: "Unauthorized" };

        await prisma.teamMember.delete({
            where: { id: memberId },
        });

        revalidatePath("/dashboard/team");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to remove member" };
    }
}

export async function updateMemberPermissions(memberId: string, permissions: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const requesterTeam = await prisma.team.findUnique({ where: { ownerId: session.user.id } });
        if (!requesterTeam) return { success: false, error: "Unauthorized" };

        await prisma.teamMember.update({
            where: { id: memberId },
            data: { permissions },
        });

        revalidatePath("/dashboard/team");
        return { success: true };
    } catch (error) {
         return { success: false, error: "Failed to update permissions" };
    }
}
