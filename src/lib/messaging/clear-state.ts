import { prisma } from "@/lib/prisma";

export async function getConversationClearCutoff(
  userId: string,
  otherUserId: string,
): Promise<Date | null> {
  const state = await prisma.messageConversationState.findUnique({
    where: {
      userId_otherUserId: {
        userId,
        otherUserId,
      },
    },
    select: {
      clearedAt: true,
    },
  });

  return state?.clearedAt ?? null;
}

export async function getConversationClearCutoffs(
  userId: string,
): Promise<Map<string, Date>> {
  const rows = await prisma.messageConversationState.findMany({
    where: {
      userId,
      clearedAt: {
        not: null,
      },
    },
    select: {
      otherUserId: true,
      clearedAt: true,
    },
  });

  const cutoffs = new Map<string, Date>();
  for (const row of rows) {
    if (row.clearedAt) {
      cutoffs.set(row.otherUserId, row.clearedAt);
    }
  }

  return cutoffs;
}
