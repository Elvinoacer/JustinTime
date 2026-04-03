/**
 * Team Job Dispatcher
 * Handles job creation, assignment, and status tracking for team operations
 */

import prisma from "@/lib/prisma";
import { TeamJobStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

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
  role?: string;
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
      location: input.location as Prisma.InputJsonValue | undefined,
      scheduledAt: input.scheduledAt,
      estimatedDuration: input.estimatedDuration,
      amount: input.amount,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      bookingId: input.bookingId,
      status: "PENDING",
    },
    include: {
      team: { select: { name: true, ownerId: true } },
    },
  });

  return job;
}

/**
 * Assign team members to a job
 */
export async function assignJobToMembers(
  jobId: string,
  assignments: AssignmentInput[],
) {
  const job = await prisma.teamJob.findUnique({
    where: { id: jobId },
    select: { id: true, teamId: true },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  const uniqueAssignments = Array.from(
    new Map(assignments.map((item) => [item.memberId, item])).values(),
  );

  if (uniqueAssignments.length === 0) {
    return [];
  }

  const validMembers = await prisma.teamMember.findMany({
    where: {
      id: { in: uniqueAssignments.map((item) => item.memberId) },
      teamId: job.teamId,
      permissions: { isEmpty: false },
    },
    select: { id: true },
  });

  if (validMembers.length !== uniqueAssignments.length) {
    throw new Error("Invalid or inactive members in assignment");
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      uniqueAssignments.map((assignment) =>
        tx.teamJobAssignment.upsert({
          where: {
            jobId_memberId: {
              jobId,
              memberId: assignment.memberId,
            },
          },
          update: {
            role: assignment.role || "WORKER",
            status: "PENDING",
            acceptedAt: null,
            startedAt: null,
            completedAt: null,
          },
          create: {
            jobId,
            memberId: assignment.memberId,
            role: assignment.role || "WORKER",
            status: "PENDING",
          },
        }),
      ),
    );

    await tx.teamJob.update({
      where: { id: jobId },
      data: { status: "ASSIGNED" },
    });

    await tx.teamMember.updateMany({
      where: { id: { in: uniqueAssignments.map((item) => item.memberId) } },
      data: { status: "BUSY" },
    });
  });

  return prisma.teamJobAssignment.findMany({
    where: {
      jobId,
      memberId: { in: uniqueAssignments.map((item) => item.memberId) },
    },
    include: {
      member: {
        include: { user: { select: { name: true, phone: true } } },
      },
    },
  });
}

/**
 * Update job status
 */
export async function updateJobStatus(jobId: string, status: TeamJobStatus) {
  const updateData: Prisma.TeamJobUpdateInput = { status };

  if (status === "COMPLETED") {
    updateData.completedAt = new Date();
  } else if (status === "CANCELLED") {
    updateData.completedAt = null;
  }

  if (status === "IN_PROGRESS") {
    // Move both pending and accepted assignments into in-progress.
    await prisma.teamJobAssignment.updateMany({
      where: { jobId, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    await prisma.teamMember.updateMany({
      where: {
        assignments: {
          some: {
            jobId,
            status: "IN_PROGRESS",
          },
        },
      },
      data: { status: "ON_JOB" },
    });
  }

  const job = await prisma.teamJob.update({
    where: { id: jobId },
    data: updateData,
    include: { assignments: true },
  });

  // Release workers from BUSY/ON_JOB when job is terminal.
  if (status === "COMPLETED" || status === "CANCELLED") {
    const memberIds = job.assignments.map((a) => a.memberId);
    await prisma.teamMember.updateMany({
      where: { id: { in: memberIds } },
      data: { status: "ONLINE" },
    });

    if (status === "COMPLETED") {
      await prisma.teamJobAssignment.updateMany({
        where: {
          jobId,
          status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
        },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    if (status === "CANCELLED") {
      await prisma.teamJobAssignment.updateMany({
        where: {
          jobId,
          status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
        },
        data: { status: "DECLINED", completedAt: null },
      });
    }
  }

  return job;
}

/**
 * Mark job as money collected
 */
export async function markJobCollected(
  jobId: string,
  collectedBy: string,
  paymentMethod: "CASH" | "MPESA" | "CARD",
) {
  const existing = await prisma.teamJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      collected: true,
      collectedAt: true,
      collectedBy: true,
      paymentMethod: true,
      status: true,
      amount: true,
      teamId: true,
      title: true,
      description: true,
      location: true,
      scheduledAt: true,
      estimatedDuration: true,
      clientName: true,
      clientPhone: true,
      bookingId: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
    },
  });

  if (!existing) {
    throw new Error("Job not found");
  }

  if (existing.collected) {
    return existing;
  }

  const job = await prisma.teamJob.update({
    where: { id: jobId },
    data: {
      collected: true,
      collectedAt: new Date(),
      collectedBy,
      paymentMethod,
    },
  });

  return job;
}

/**
 * Accept/decline assignment
 */
export async function respondToAssignment(
  assignmentId: string,
  accepted: boolean,
) {
  const assignment = await prisma.teamJobAssignment.update({
    where: { id: assignmentId },
    data: {
      status: accepted ? "ACCEPTED" : "DECLINED",
      acceptedAt: accepted ? new Date() : null,
    },
  });

  if (!accepted) {
    // Update member status back to ONLINE if they decline
    await prisma.teamMember.update({
      where: { id: assignment.memberId },
      data: { status: "ONLINE" },
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
  limit: number = 5,
) {
  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      permissions: { isEmpty: false },
      status: "ONLINE",
    },
    include: {
      user: { select: { name: true, image: true, phone: true } },
    },
    take: limit,
  });

  // If we have target location, sort by distance
  if (targetLocation && members.length > 0) {
    return members.sort((a, b) => {
      if (!a.lastLocation || !b.lastLocation) return 0;
      const locA = parseLatLng(a.lastLocation);
      const locB = parseLatLng(b.lastLocation);

      if (!locA || !locB) {
        return 0;
      }

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
  const { startUtc, endUtc } = getNairobiDayBounds();

  const jobs = await prisma.teamJob.findMany({
    where: {
      teamId,
      scheduledAt: { gte: startUtc, lt: endUtc },
    },
    include: {
      assignments: {
        include: {
          member: {
            include: { user: { select: { name: true, image: true } } },
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return jobs;
}

function getNairobiDayBounds(reference: Date = new Date()) {
  const nairobiOffsetMs = 3 * 60 * 60 * 1000;
  const nairobiNow = new Date(reference.getTime() + nairobiOffsetMs);

  const y = nairobiNow.getUTCFullYear();
  const m = nairobiNow.getUTCMonth();
  const d = nairobiNow.getUTCDate();

  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - nairobiOffsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    startUtc: new Date(startUtcMs),
    endUtc: new Date(endUtcMs),
  };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number },
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function parseLatLng(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const latValue =
    typeof record.lat === "number"
      ? record.lat
      : typeof record.lat === "string"
        ? Number(record.lat)
        : NaN;
  const lngValue =
    typeof record.lng === "number"
      ? record.lng
      : typeof record.lng === "string"
        ? Number(record.lng)
        : NaN;

  if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
    return null;
  }

  return { lat: latValue, lng: lngValue };
}
