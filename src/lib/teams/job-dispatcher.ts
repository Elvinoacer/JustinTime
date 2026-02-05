/**
 * Team Job Dispatcher
 * Handles job creation, assignment, and status tracking for team operations
 */

import prisma from "@/lib/prisma";
import { TeamJobStatus, AssignmentStatus, MemberStatus } from "@/generated/prisma";

export interface JobCreateInput {
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
}

export interface AssignmentInput {
  memberId: string;
  role?: 'LEAD' | 'WORKER' | 'HELPER';
}

/**
 * Create a new team job
 */
export async function createTeamJob(input: JobCreateInput) {
  const job = await prisma.teamJob.create({
    data: {
      teamId: input.teamId,
      title: input.title,
      description: input.description,
      location: input.location as any,
      scheduledAt: input.scheduledAt,
      estimatedDuration: input.estimatedDuration,
      amount: input.amount,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      bookingId: input.bookingId,
      status: 'PENDING'
    },
    include: {
      team: { select: { name: true, ownerId: true } }
    }
  });

  return job;
}

/**
 * Assign team members to a job
 */
export async function assignJobToMembers(
  jobId: string, 
  assignments: AssignmentInput[]
) {
  const results = await Promise.all(
    assignments.map(async (a) => {
      const assignment = await prisma.teamJobAssignment.create({
        data: {
          jobId,
          memberId: a.memberId,
          role: a.role || 'WORKER',
          status: 'PENDING'
        },
        include: {
          member: {
            include: { user: { select: { name: true, phone: true } } }
          }
        }
      });
      return assignment;
    })
  );

  // Update job status to ASSIGNED
  await prisma.teamJob.update({
    where: { id: jobId },
    data: { status: 'ASSIGNED' }
  });

  // Update member status to BUSY
  await prisma.teamMember.updateMany({
    where: { id: { in: assignments.map(a => a.memberId) } },
    data: { status: 'BUSY' }
  });

  return results;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string, 
  status: TeamJobStatus,
  completedBy?: string
) {
  const updateData: any = { status };
  
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }
  
  if (status === 'IN_PROGRESS') {
    // Update all pending assignments to in_progress
    await prisma.teamJobAssignment.updateMany({
      where: { jobId, status: 'ACCEPTED' },
      data: { status: 'IN_PROGRESS', startedAt: new Date() }
    });
  }

  const job = await prisma.teamJob.update({
    where: { id: jobId },
    data: updateData,
    include: { assignments: true }
  });

  // If completed, update member statuses back to ONLINE
  if (status === 'COMPLETED') {
    const memberIds = job.assignments.map(a => a.memberId);
    await prisma.teamMember.updateMany({
      where: { id: { in: memberIds } },
      data: { status: 'ONLINE' }
    });
    
    await prisma.teamJobAssignment.updateMany({
      where: { jobId },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
  }

  return job;
}

/**
 * Mark job as money collected
 */
export async function markJobCollected(
  jobId: string,
  collectedBy: string,
  paymentMethod: 'CASH' | 'MPESA' | 'CARD'
) {
  const job = await prisma.teamJob.update({
    where: { id: jobId },
    data: {
      collected: true,
      collectedAt: new Date(),
      collectedBy,
      paymentMethod
    }
  });

  return job;
}

/**
 * Accept/decline assignment
 */
export async function respondToAssignment(
  assignmentId: string,
  accepted: boolean
) {
  const assignment = await prisma.teamJobAssignment.update({
    where: { id: assignmentId },
    data: {
      status: accepted ? 'ACCEPTED' : 'DECLINED',
      acceptedAt: accepted ? new Date() : null
    }
  });

  if (!accepted) {
    // Update member status back to ONLINE if they decline
    await prisma.teamMember.update({
      where: { id: assignment.memberId },
      data: { status: 'ONLINE' }
    });
  }

  return assignment;
}

/**
 * Find nearest available team members
 */
export async function findNearestAvailable(
  teamId: string,
  targetLocation?: { lat: number; lng: number },
  limit: number = 5
) {
  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      status: { in: ['ONLINE', 'OFFLINE'] } // Not busy or on_job
    },
    include: {
      user: { select: { name: true, image: true, phone: true } }
    },
    take: limit
  });

  // If we have target location, sort by distance
  if (targetLocation && members.length > 0) {
    return members.sort((a, b) => {
      if (!a.lastLocation || !b.lastLocation) return 0;
      const locA = a.lastLocation as any;
      const locB = b.lastLocation as any;
      
      const distA = calculateDistance(targetLocation, locA);
      const distB = calculateDistance(targetLocation, locB);
      
      return distA - distB;
    });
  }

  return members;
}

/**
 * Get team jobs for today
 */
export async function getTodaysJobs(teamId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const jobs = await prisma.teamJob.findMany({
    where: {
      teamId,
      scheduledAt: { gte: today, lt: tomorrow }
    },
    include: {
      assignments: {
        include: {
          member: {
            include: { user: { select: { name: true, image: true } } }
          }
        }
      }
    },
    orderBy: { scheduledAt: 'asc' }
  });

  return jobs;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
