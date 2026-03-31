import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

const jobsEventSchema = z.object({
  event: z.enum([
    "job_post_started",
    "job_post_minimal_submitted",
    "job_post_details_completed",
    "job_post_published",
    "proposal_first_received",
    "proposal_card_viewed",
    "proposal_compare_opened",
    "proposal_accepted",
    "provider_apply_started",
    "provider_apply_submitted",
    "pricing_hint_seen",
    "pricing_hint_applied",
    "risk_badge_seen",
  ]),
  userRole: z.enum(["CLIENT", "PROVIDER", "ADMIN", "GUEST"]).optional(),
  jobCategory: z.string().max(80).optional(),
  budgetBand: z.string().max(40).optional(),
  locationBand: z.string().max(80).optional(),
  sourcePage: z.string().max(120).optional(),
  experimentVariant: z.string().max(80).optional(),
  timestamp: z.number().int().positive().optional(),
  jobId: z.string().max(64).optional(),
  proposalId: z.string().max(64).optional(),
  url: z.string().max(220).optional(),
  referrer: z.string().max(220).optional(),
});

function truncate(value: string | null, max = 220): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = jobsEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid jobs event payload" },
        { status: 400 },
      );
    }

    const hdrs = await headers();
    const userAgent = truncate(hdrs.get("user-agent"), 220);
    const forwardedFor = truncate(hdrs.get("x-forwarded-for"), 140);

    console.info("[jobs-event]", {
      ...parsed.data,
      timestamp: parsed.data.timestamp ?? Date.now(),
      userAgent,
      forwardedFor,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("jobs event capture failed", error);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
