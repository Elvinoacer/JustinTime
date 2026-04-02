"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isBlockedBetweenUsers } from "@/lib/messaging/blocking";
import type { Prisma } from "@/generated/prisma/client";

export type CallType = "AUDIO" | "VIDEO";
export type CallStatus =
  | "INITIATED"
  | "ONGOING"
  | "ENDED"
  | "MISSED"
  | "REJECTED"
  | "ACCEPTED";

export async function logCallStart(receiverId: string, type: CallType) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (receiverId === session.user.id) {
    return { success: false, error: "Cannot call yourself" };
  }

  try {
    const blocked = await isBlockedBetweenUsers(session.user.id, receiverId);
    if (blocked) {
      return { success: false, error: "Call is not allowed for this user" };
    }

    const call = await prisma.call.create({
      data: {
        callerId: session.user.id,
        receiverId: receiverId,
        type: type,
        status: "INITIATED",
      },
    });
    return { success: true, callId: call.id };
  } catch (error) {
    console.error("Error starting call:", error);
    return { success: false, error: "Failed to start call" };
  }
}

export async function logCallStatus(callId: string, status: CallStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: {
        id: true,
        callerId: true,
        receiverId: true,
        startedAt: true,
      },
    });

    if (!call) {
      return { success: false, error: "Call not found" };
    }

    if (
      call.callerId !== session.user.id &&
      call.receiverId !== session.user.id
    ) {
      return { success: false, error: "Forbidden" };
    }

    const now = new Date();
    const data: Prisma.CallUpdateInput = { status };

    if ((status === "ONGOING" || status === "ACCEPTED") && !call.startedAt) {
      data.startedAt = now;
    }

    if (status === "ONGOING" && call.startedAt) {
      data.duration = Math.max(
        0,
        Math.floor((now.getTime() - call.startedAt.getTime()) / 1000),
      );
    }

    if (status === "ENDED" || status === "MISSED" || status === "REJECTED") {
      data.endedAt = new Date();
      if (call.startedAt) {
        data.duration = Math.max(
          0,
          Math.floor((now.getTime() - call.startedAt.getTime()) / 1000),
        );
      }
    }

    await prisma.call.update({
      where: { id: callId },
      data,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating call status:", error);
    return { success: false, error: "Failed to update call status" };
  }
}

export async function heartbeatCall(callId: string, elapsedSeconds: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: {
        id: true,
        callerId: true,
        receiverId: true,
        startedAt: true,
        status: true,
      },
    });

    if (!call) {
      return { success: false, error: "Call not found" };
    }

    if (
      call.callerId !== session.user.id &&
      call.receiverId !== session.user.id
    ) {
      return { success: false, error: "Forbidden" };
    }

    if (
      call.status === "ENDED" ||
      call.status === "MISSED" ||
      call.status === "REJECTED"
    ) {
      return { success: false, error: "Call already finished" };
    }

    await prisma.call.update({
      where: { id: callId },
      data: {
        status: "ONGOING",
        duration: Math.max(0, Math.floor(elapsedSeconds)),
        startedAt: call.startedAt || new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending call heartbeat:", error);
    return { success: false, error: "Failed to send call heartbeat" };
  }
}

export async function getCallHistory(partnerId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const where: Prisma.CallWhereInput = {
      OR: [{ callerId: session.user.id }, { receiverId: session.user.id }],
    };

    // Filter by a specific partner if provided
    if (partnerId) {
      where.AND = {
        OR: [{ callerId: partnerId }, { receiverId: partnerId }],
      };
    }

    const calls = await prisma.call.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        caller: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });
    return { success: true, calls };
  } catch (error) {
    console.error("Error fetching call history:", error);
    return { success: false, error: "Failed to fetch history" };
  }
}
