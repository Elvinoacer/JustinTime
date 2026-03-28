import { NextResponse } from "next/server";
import { headers } from "next/headers";

type LandingEventName =
  | "landing:variant_assigned"
  | "landing:variant_switched"
  | "landing:cta_clicked"
  | "landing:search_initiated"
  | "landing:secondary_cta_clicked";

interface LandingEventPayload {
  event?: LandingEventName;
  variant?: "booking" | "pro";
  ctaLabel?: string;
  ctaLocation?: "hero" | "final_cta" | "narrative_rail";
  searchQuery?: string;
  location?: string;
  country?: string;
  timestamp?: number;
  url?: string;
  referrer?: string;
}

const ALLOWED_EVENTS = new Set<LandingEventName>([
  "landing:variant_assigned",
  "landing:variant_switched",
  "landing:cta_clicked",
  "landing:search_initiated",
  "landing:secondary_cta_clicked",
]);

function truncate(value: string | undefined, max = 120): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LandingEventPayload;

    if (!body?.event || !ALLOWED_EVENTS.has(body.event)) {
      return NextResponse.json(
        { ok: false, error: "Invalid event" },
        { status: 400 },
      );
    }

    const hdrs = await headers();
    const userAgent = truncate(hdrs.get("user-agent") ?? undefined, 220);
    const forwardedFor = truncate(
      hdrs.get("x-forwarded-for") ?? undefined,
      140,
    );

    // Lightweight event log for CRO analysis without schema changes.
    console.info("[landing-event]", {
      event: body.event,
      variant: body.variant,
      ctaLabel: truncate(body.ctaLabel),
      ctaLocation: body.ctaLocation,
      searchQuery: truncate(body.searchQuery),
      location: truncate(body.location),
      country: truncate(body.country, 8),
      url: truncate(body.url, 180),
      referrer: truncate(body.referrer, 180),
      timestamp: body.timestamp ?? Date.now(),
      userAgent,
      forwardedFor,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("landing event capture failed", error);
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
