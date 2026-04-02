import { prisma } from "@/lib/prisma";

export async function isBlockedBetweenUsers(
  userAId: string,
  userBId: string,
): Promise<boolean> {
  const blockedPair = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { userId: userAId, blockedId: userBId },
        { userId: userBId, blockedId: userAId },
      ],
    },
    select: { id: true },
  });

  return Boolean(blockedPair);
}

export async function getBlockedCounterpartyIds(
  currentUserId: string,
): Promise<Set<string>> {
  const relations = await prisma.blockedUser.findMany({
    where: {
      OR: [{ userId: currentUserId }, { blockedId: currentUserId }],
    },
    select: {
      userId: true,
      blockedId: true,
    },
  });

  const blockedIds = new Set<string>();

  for (const relation of relations) {
    if (relation.userId === currentUserId) {
      blockedIds.add(relation.blockedId);
    } else {
      blockedIds.add(relation.userId);
    }
  }

  return blockedIds;
}
