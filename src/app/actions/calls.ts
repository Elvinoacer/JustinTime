'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export type CallType = 'AUDIO' | 'VIDEO';
export type CallStatus = 'INITIATED' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED';

export async function logCallStart(receiverId: string, type: CallType) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  try {
    const call = await prisma.call.create({
      data: {
        callerId: session.user.id,
        receiverId: receiverId,
        type: type,
        status: 'INITIATED',
      }
    });
    return { success: true, callId: call.id };
  } catch (error) {
    console.error('Error starting call:', error);
    return { success: false, error: 'Failed to start call' };
  }
}

export async function logCallStatus(callId: string, status: CallStatus) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  try {
    const data: any = { status };
    if (status === 'ENDED') {
      data.endedAt = new Date();
    }
    if (status === 'ONGOING') {
      data.startedAt = new Date();
    }

    await prisma.call.update({
      where: { id: callId },
      data
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating call status:', error);
    return { success: false, error: 'Failed to update call status' };
  }
}

export async function getCallHistory(partnerId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  try {
    const where: any = {
      OR: [
        { callerId: session.user.id },
        { receiverId: session.user.id }
      ]
    };

    // Filter by a specific partner if provided
    if (partnerId) {
      where.AND = {
        OR: [
          { callerId: partnerId },
          { receiverId: partnerId }
        ]
      };
    }

    const calls = await prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        caller: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } }
      }
    });
    return { success: true, calls };
  } catch (error) {
    console.error('Error fetching call history:', error);
    return { success: false, error: 'Failed to fetch history' };
  }
}
