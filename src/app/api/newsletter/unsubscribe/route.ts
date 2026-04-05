import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-with-limit";
import { createHash } from "crypto";
import { persistMarketingEvent } from "@/lib/analytics/event-store";

type NewsletterUnsubscribeBody = {
  email?: string;
  token?: string;
  website?: string;
};

const IDENTIFIER_PREFIX = "newsletter:";
const NEWSLETTER_RATE_LIMIT_ERROR =
  "Too many newsletter requests. Please try again shortly.";

function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function normalizeInput(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function resolveEmailFromToken(token: string): Promise<string | null> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    select: { identifier: true },
  });

  if (!verificationToken) {
    return null;
  }

  if (!verificationToken.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return null;
  }

  return normalizeEmail(
    verificationToken.identifier.slice(IDENTIFIER_PREFIX.length),
  );
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await readJsonBodyWithLimit<NewsletterUnsubscribeBody>(
      request,
      {
        maxBytes: 6_000,
        expectObject: true,
      },
    );

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status },
      );
    }

    const honeypot = normalizeInput(parsedBody.data.website);
    if (honeypot) {
      return NextResponse.json(
        { message: "You have been unsubscribed." },
        { status: 200 },
      );
    }

    const clientIp = getClientIpFromHeaders(request.headers) || "unknown";
    const limitResult = enforceRateLimits("public.newsletter.unsubscribe", [
      {
        suffix: `ip:${clientIp}`,
        limit: 10,
        windowMs: 10 * 60 * 1000,
      },
    ]);

    if (!limitResult.ok) {
      return NextResponse.json(
        { error: NEWSLETTER_RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    const token = normalizeInput(parsedBody.data.token);
    const emailFromBody = normalizeEmail(normalizeInput(parsedBody.data.email));

    if (!token && emailFromBody && !isValidEmail(emailFromBody)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    const email = token ? await resolveEmailFromToken(token) : emailFromBody;

    if (!email) {
      return NextResponse.json(
        { error: "A valid email or token is required" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.newsletterSubscriber.updateMany({
        where: { email },
        data: { isActive: false },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: `${IDENTIFIER_PREFIX}${email}` },
      }),
    ]);

    await persistMarketingEvent({
      channel: "newsletter",
      event: "newsletter_unsubscribed",
      payload: {
        emailHash: hashEmail(email),
        timestamp: Date.now(),
        usedToken: Boolean(token),
      },
    });

    return NextResponse.json(
      { message: "You have been unsubscribed.", email },
      { status: 200 },
    );
  } catch (error) {
    console.error("Newsletter unsubscribe error", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to unsubscribe. Please try again later." },
      { status: 500 },
    );
  }
}
