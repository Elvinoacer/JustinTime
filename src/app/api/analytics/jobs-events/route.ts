import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { jobsEventSchema } from "@/lib/analytics/jobs-events-schema";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-with-limit";
import { sanitizeForLog } from "@/lib/logging/sanitize";
import { persistMarketingEvent } from "@/lib/analytics/event-store";
import {
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

const JOBS_EVENTS_RATE_LIMIT_ERROR =
  "Too many analytics requests. Please try again shortly.";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIpFromHeaders(req.headers) || "unknown";
    const limitResult = enforceRateLimits("public.analytics.jobs", [
      {
        suffix: `ip:${clientIp}`,
        limit: 90,
        windowMs: 60 * 1000,
      },
    ]);

    if (!limitResult.ok) {
      return NextResponse.json(
        { ok: false, error: JOBS_EVENTS_RATE_LIMIT_ERROR },
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

    const parsed = jobsEventSchema.safeParse(parsedBody.data);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid jobs event payload" },
        { status: 400 },
      );
    }

    const hdrs = await headers();
    const userAgent = sanitizeForLog(hdrs.get("user-agent"), 220);
    const forwardedFor = sanitizeForLog(hdrs.get("x-forwarded-for"), 140);
    const payload = {
      ...parsed.data,
      recommendationLabel: sanitizeForLog(parsed.data.recommendationLabel, 120),
      sourcePage: sanitizeForLog(parsed.data.sourcePage, 120),
      url: sanitizeForLog(parsed.data.url, 220),
      referrer: sanitizeForLog(parsed.data.referrer, 220),
      timestamp: parsed.data.timestamp ?? Date.now(),
      userAgent,
      forwardedFor,
    };

    await persistMarketingEvent({
      channel: "jobs",
      event: parsed.data.event,
      payload,
    });

    console.info("[jobs-event]", {
      event: payload.event,
      userRole: payload.userRole,
      sourcePage: payload.sourcePage,
      recommendationLabel: payload.recommendationLabel,
      isRecommended: payload.isRecommended,
      timestamp: payload.timestamp,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("jobs event capture failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
