import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email";
import { VALIDATION } from "@/lib/constants/validation";
import prisma from "@/lib/prisma";
import {
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-with-limit";
import { createHash } from "crypto";
import { persistMarketingEvent } from "@/lib/analytics/event-store";

type ContactBody = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  website?: string;
};

const CONTACT_RATE_LIMIT_ERROR =
  "Too many contact requests. Please try again shortly.";
const CONTACT_INTAKE_EMAIL =
  process.env.CONTACT_INTAKE_USER_EMAIL?.trim().toLowerCase() ||
  "contact-intake@justintime.local";

function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function normalizeInput(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getContactIntakeUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: CONTACT_INTAKE_EMAIL },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  try {
    const created = await prisma.user.create({
      data: {
        email: CONTACT_INTAKE_EMAIL,
        name: "Contact Intake",
        role: "CLIENT",
        roles: ["CLIENT"],
        onboardingCompleted: true,
      },
      select: { id: true },
    });

    return created.id;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;

    if (code !== "P2002") {
      throw error;
    }

    const concurrentExisting = await prisma.user.findUnique({
      where: { email: CONTACT_INTAKE_EMAIL },
      select: { id: true },
    });

    if (!concurrentExisting) {
      throw error;
    }

    return concurrentExisting.id;
  }
}

async function persistContactSupportTicket(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<string | null> {
  const existingUser = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true },
  });

  const ticketOwnerId = existingUser?.id || (await getContactIntakeUserId());
  const ticketSubject = `Contact Form: ${params.subject}`;
  const ticketDescription = [
    `Sender: ${params.name}`,
    `Email: ${params.email}`,
    "",
    params.message,
  ].join("\n");
  const dedupeWindowStart = new Date(Date.now() - 10 * 60 * 1000);

  const recentDuplicate = await prisma.supportTicket.findFirst({
    where: {
      userId: ticketOwnerId,
      subject: ticketSubject,
      description: ticketDescription,
      createdAt: { gte: dedupeWindowStart },
    },
    select: { id: true },
  });

  if (recentDuplicate) {
    return recentDuplicate.id;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: ticketOwnerId,
      subject: ticketSubject,
      description: ticketDescription,
      category: "General",
      priority: "MEDIUM",
      relatedEntityType: "CONTACT_FORM",
      relatedEntityId: params.email,
      messages: {
        create: {
          authorId: ticketOwnerId,
          authorRole: "USER",
          message: ticketDescription,
        },
      },
    },
    select: { id: true },
  });

  return ticket.id;
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await readJsonBodyWithLimit<ContactBody>(request, {
      maxBytes: 12_000,
      expectObject: true,
    });

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status },
      );
    }

    const name = normalizeInput(parsedBody.data.name);
    const email = normalizeInput(parsedBody.data.email).toLowerCase();
    const subject = normalizeInput(parsedBody.data.subject);
    const message = normalizeInput(parsedBody.data.message);
    const honeypot = normalizeInput(parsedBody.data.website);

    // Honeypot trap for bot submissions.
    if (honeypot) {
      return NextResponse.json(
        { message: "Message sent successfully!" },
        { status: 200 },
      );
    }

    const clientIp = getClientIpFromHeaders(request.headers) || "unknown";
    const limitResult = enforceRateLimits("public.contact", [
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
        { error: CONTACT_RATE_LIMIT_ERROR },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validate length limits
    if (name.length > VALIDATION.MAX_NAME_LENGTH) {
      return NextResponse.json(
        {
          error: `Name cannot exceed ${VALIDATION.MAX_NAME_LENGTH} characters`,
        },
        { status: 400 },
      );
    }
    if (subject.length > VALIDATION.MAX_SUBJECT_LENGTH) {
      return NextResponse.json(
        {
          error: `Subject cannot exceed ${VALIDATION.MAX_SUBJECT_LENGTH} characters`,
        },
        { status: 400 },
      );
    }
    if (message.length > VALIDATION.MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: `Message cannot exceed ${VALIDATION.MAX_MESSAGE_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const ticketId = await persistContactSupportTicket({
      name,
      email,
      subject,
      message,
    });

    const emailSent = await sendContactFormEmail(name, email, subject, message);

    if (!emailSent && !ticketId) {
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 },
      );
    }

    await persistMarketingEvent({
      channel: "contact",
      event: "contact_form_submitted",
      payload: {
        emailHash: hashEmail(email),
        subject,
        ticketId,
        emailSent,
        timestamp: Date.now(),
      },
    });

    return NextResponse.json(
      {
        message: "Message sent successfully!",
        ticketReference: ticketId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Contact form error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
