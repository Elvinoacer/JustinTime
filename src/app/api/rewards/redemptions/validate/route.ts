import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { validateRedemptionCode } from "@/lib/loyalty/reward-manager";
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

    const result = await validateRedemptionCode(code, {
      actorType,
      actorPartnerId,
      actorUserId: session.user.id,
    });

    if (!result.valid) {
      const status =
        "error" in result && result.error === "Forbidden" ? 403 : 404;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[REWARD_REDEMPTION_VALIDATE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
