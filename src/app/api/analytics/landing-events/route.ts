import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { landingEventSchema } from "@/lib/analytics/landing-events-schema";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-with-limit";
import { sanitizeForLog } from "@/lib/logging/sanitize";
import { persistMarketingEvent } from "@/lib/analytics/event-store";
import {
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

const LANDING_EVENTS_RATE_LIMIT_ERROR =
  "Too many analytics requests. Please try again shortly.";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIpFromHeaders(req.headers) || "unknown";
    const limitResult = enforceRateLimits("public.analytics.landing", [
      {
        suffix: `ip:${clientIp}`,
        limit: 120,
        windowMs: 60 * 1000,
      },
    ]);

    if (!limitResult.ok) {
      return NextResponse.json(
        { ok: false, error: LANDING_EVENTS_RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    const parsedBody = await readJsonBodyWithLimit<Record<string, unknown>>(
      req,
      {
        maxBytes: 12_000,
        expectObject: true,
      },
    );

    if (!parsedBody.ok) {
      return NextResponse.json(
        { ok: false, error: parsedBody.error },
        { status: parsedBody.status },
      );
    }

    const parsed = landingEventSchema.safeParse(parsedBody.data);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid event" },
        { status: 400 },
      );
    }

    const hdrs = await headers();
    const userAgent = sanitizeForLog(hdrs.get("user-agent") ?? undefined, 220);
    const forwardedFor = sanitizeForLog(
      hdrs.get("x-forwarded-for") ?? undefined,
      140,
    );

    const payload = {
      ...parsed.data,
      ctaLabel: sanitizeForLog(parsed.data.ctaLabel, 120),
      searchQuery: sanitizeForLog(parsed.data.searchQuery, 120),
      location: sanitizeForLog(parsed.data.location, 120),
      country: sanitizeForLog(parsed.data.country, 8),
      url: sanitizeForLog(parsed.data.url, 220),
      referrer: sanitizeForLog(parsed.data.referrer, 220),
      timestamp: parsed.data.timestamp ?? Date.now(),
      userAgent,
      forwardedFor,
    };

    await persistMarketingEvent({
      channel: "landing",
      event: parsed.data.event,
      payload,
    });

    console.info("[landing-event]", {
      event: payload.event,
      variant: payload.variant,
      ctaLocation: payload.ctaLocation,
      timestamp: payload.timestamp,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("landing event capture failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
