import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import { getStkPhoneTelemetrySummary } from "@/lib/analytics/event-store";

function parseDateInput(
  value: string | null,
  options?: { endOfDay?: boolean },
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return undefined;
  }

  const timePart = options?.endOfDay ? "23:59:59.999" : "00:00:00.000";
  const parsed = new Date(`${trimmed}T${timePart}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export const GET = auth(async (request) => {
  try {
    const actor = request.auth?.user;

    if (!actor?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasRole(actor, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = parseDateInput(searchParams.get("startDate"));
    const endDate = parseDateInput(searchParams.get("endDate"), {
      endOfDay: true,
    });

    const summary = await getStkPhoneTelemetrySummary({
      startDate,
      endDate,
    });

    return NextResponse.json(
      {
        ok: true,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        summary,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ADMIN_STK_SUMMARY_ERROR]", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { ok: false, error: "Failed to load STK summary" },
      { status: 500 },
    );
  }
});
