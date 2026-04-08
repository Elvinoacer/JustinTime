import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import { getWebhookIntentReconciliation } from "../../../../../lib/payments/webhook-intent-reconciliation";

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: new NextResponse("Unauthorized", { status: 401 }),
    };
  }

  if (!hasRole(session.user, "ADMIN")) {
    return {
      ok: false as const,
      response: new NextResponse("Forbidden", { status: 403 }),
    };
  }

  return { ok: true as const, session };
}

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseBoundedInt(searchParams.get("limit"), 50, 10, 250);
    const lookbackHours = parseBoundedInt(
      searchParams.get("lookbackHours"),
      72,
      1,
      24 * 30,
    );

    const reconciliation = await getWebhookIntentReconciliation({
      limit,
      lookbackHours,
    });

    return NextResponse.json(reconciliation);
  } catch (error) {
    console.error("[ADMIN_RECONCILIATION_PAYMENT_INTENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
