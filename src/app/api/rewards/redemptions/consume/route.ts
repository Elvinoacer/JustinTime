import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { markRedemptionUsed } from "@/lib/loyalty/reward-manager";
import { resolvePartnerScopeForUser } from "@/lib/loyalty/partner-auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      actorPartnerId?: string;
    };

    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return new NextResponse("Code is required", { status: 400 });
    }

    const requestedActorPartnerId =
      typeof body.actorPartnerId === "string" &&
      body.actorPartnerId.trim().length > 0
        ? body.actorPartnerId.trim()
        : null;

    let actorType: "ADMIN" | "PARTNER" = "PARTNER";
    let actorPartnerId: string | undefined;

    if (hasRole(session.user, "ADMIN")) {
      actorType = "ADMIN";
      actorPartnerId = requestedActorPartnerId || undefined;
    } else {
      const partnerScope = await resolvePartnerScopeForUser(
        session.user.id,
        requestedActorPartnerId,
      );

      if (!partnerScope.ok) {
        return NextResponse.json(
          {
            error: partnerScope.error,
            ...(partnerScope.partnerIds
              ? { partnerIds: partnerScope.partnerIds }
              : {}),
          },
          { status: partnerScope.status },
        );
      }

      actorType = "PARTNER";
      actorPartnerId = partnerScope.partnerId;
    }

    const result = await markRedemptionUsed(code, {
      actorType,
      actorUserId: session.user.id,
      actorPartnerId,
    });

    if (!result.success) {
      const status =
        result.error === "Forbidden"
          ? 403
          : result.error === "Unauthorized"
            ? 401
            : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[REWARD_REDEMPTION_CONSUME_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
