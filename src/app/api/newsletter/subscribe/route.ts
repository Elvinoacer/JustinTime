import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import {
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-with-limit";
import { sendNewsletterConfirmationEmail } from "@/lib/email";
import { buildAppUrl } from "@/lib/app-url";
import { persistMarketingEvent } from "@/lib/analytics/event-store";

type NewsletterSubscribeBody = {
  email?: string;
  source?: string;
  website?: string;
};

const NEWSLETTER_RATE_LIMIT_ERROR =
  "Too many newsletter requests. Please try again shortly.";

function normalizeInput(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createNewsletterToken(): string {
  return randomBytes(32).toString("hex");
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = await readJsonBodyWithLimit<NewsletterSubscribeBody>(
      req,
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

    const email = normalizeInput(parsedBody.data.email).toLowerCase();
    const source = normalizeInput(parsedBody.data.source).slice(0, 120);
    const honeypot = normalizeInput(parsedBody.data.website);

    if (honeypot) {
      return NextResponse.json(
        {
          message:
            "Please check your inbox to confirm your newsletter subscription.",
          pendingConfirmation: true,
        },
        { status: 202 },
      );
    }

    const clientIp = getClientIpFromHeaders(req.headers) || "unknown";
    const limitResult = enforceRateLimits("public.newsletter.subscribe", [
      {
        suffix: `ip:${clientIp}`,
        limit: 8,
        windowMs: 10 * 60 * 1000,
      },
      {
        suffix: `email:${email || "missing"}`,
        limit: 4,
        windowMs: 60 * 60 * 1000,
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

    // Validate email
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingSubscriber?.isActive) {
      await persistMarketingEvent({
        channel: "newsletter",
        event: "newsletter_subscribe_duplicate",
        payload: {
          emailHash: hashEmail(normalizedEmail),
          source: source || "website",
          timestamp: Date.now(),
          status: "already_active",
        },
      });

      return NextResponse.json(
        {
          error: "This email is already subscribed to our newsletter",
          exists: true,
        },
        { status: 409 },
      );
    }

    if (!existingSubscriber) {
      await prisma.newsletterSubscriber.create({
        data: {
          email: normalizedEmail,
          isActive: false,
        },
      });
    }

    const token = createNewsletterToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const identifier = `newsletter:${normalizedEmail}`;

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { identifier },
      }),
      prisma.verificationToken.create({
        data: {
          identifier,
          token,
          expires,
        },
      }),
    ]);

    const confirmationUrl = buildAppUrl(
      `/api/newsletter/confirm?token=${encodeURIComponent(token)}`,
    );
    const emailSent = await sendNewsletterConfirmationEmail(
      normalizedEmail,
      confirmationUrl,
      source || "website",
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send confirmation email. Please try again." },
        { status: 500 },
      );
    }

    await persistMarketingEvent({
      channel: "newsletter",
      event: "newsletter_subscribe_requested",
      payload: {
        emailHash: hashEmail(normalizedEmail),
        source: source || "website",
        timestamp: Date.now(),
        status: "pending_confirmation",
      },
    });

    return NextResponse.json(
      {
        message:
          "Please check your inbox to confirm your newsletter subscription.",
        pendingConfirmation: true,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Newsletter subscription error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again later." },
      { status: 500 },
    );
  }
}
