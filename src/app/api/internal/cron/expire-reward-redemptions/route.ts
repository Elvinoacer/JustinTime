import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { expireStaleRedemptions } from "@/lib/loyalty/reward-manager";

function hasSecretAccess(request: Request) {
  const expectedSecret = process.env.REWARD_EXPIRY_CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

async function executeExpiryJob(request: Request) {
  const secretAuthorized = hasSecretAccess(request);

  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const result = await expireStaleRedemptions();

  return NextResponse.json({
    success: true,
    expiredCount: result.expired,
  });
}

export async function GET(request: Request) {
  try {
    return await executeExpiryJob(request);
  } catch (error) {
    console.error("[EXPIRE_REWARD_REDEMPTIONS_CRON_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await executeExpiryJob(request);
  } catch (error) {
    console.error("[EXPIRE_REWARD_REDEMPTIONS_CRON_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
