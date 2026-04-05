import prisma from "@/lib/prisma";

type PartnerScopeSuccess = {
  ok: true;
  partnerId: string;
};

type PartnerScopeFailure = {
  ok: false;
  status: 400 | 403;
  error: string;
  partnerIds?: string[];
};

export type PartnerScopeResolution = PartnerScopeSuccess | PartnerScopeFailure;

function normalizePartnerId(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function resolvePartnerScopeForUser(
  userId: string,
  requestedPartnerId?: string | null,
): Promise<PartnerScopeResolution> {
  const normalizedPartnerId = normalizePartnerId(requestedPartnerId);

  const memberships = await prisma.partnerUser.findMany({
    where: {
      userId,
      isActive: true,
      partner: {
        isActive: true,
      },
      ...(normalizedPartnerId ? { partnerId: normalizedPartnerId } : {}),
    },
    select: {
      partnerId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (memberships.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
    };
  }

  if (normalizedPartnerId) {
    return {
      ok: true,
      partnerId: normalizedPartnerId,
    };
  }

  const partnerIds = Array.from(
    new Set(memberships.map((membership) => membership.partnerId)),
  );

  if (partnerIds.length === 1) {
    return {
      ok: true,
      partnerId: partnerIds[0],
    };
  }

  return {
    ok: false,
    status: 400,
    error: "actorPartnerId is required for multi-partner accounts",
    partnerIds,
  };
}
