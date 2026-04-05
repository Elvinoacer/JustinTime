import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNewsletterWelcomeEmail } from "@/lib/email";
import { readJsonBodyWithLimit } from "@/lib/http/read-json-with-limit";
import { createHash } from "crypto";
import { persistMarketingEvent } from "@/lib/analytics/event-store";

const IDENTIFIER_PREFIX = "newsletter:";

function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

type ConfirmationState = {
  ok: boolean;
  status: number;
  message: string;
};

function renderConfirmationHtml(state: ConfirmationState): string {
  const title = state.ok ? "Subscription Confirmed" : "Unable to Confirm";
  const accent = state.ok ? "#059669" : "#dc2626";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
  <main style="max-width:520px;margin:48px auto;padding:24px;">
    <section style="background:#fff;border-radius:14px;padding:28px;border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(17,24,39,0.08)">
      <h1 style="margin:0 0 10px;color:${accent};font-size:24px;">${title}</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">${state.message}</p>
      <p style="margin:18px 0 0;font-size:13px;color:#6b7280;">You may now close this tab.</p>
    </section>
  </main>
</body>
</html>`;
}

async function confirmByToken(token: string): Promise<ConfirmationState> {
  if (!token) {
    return {
      ok: false,
      status: 400,
      message: "Missing confirmation token.",
    };
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    select: {
      identifier: true,
      token: true,
      expires: true,
    },
  });

  if (!verificationToken) {
    return {
      ok: false,
      status: 404,
      message: "This confirmation link is invalid or has already been used.",
    };
  }

  if (!verificationToken.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return {
      ok: false,
      status: 400,
      message: "Invalid confirmation token scope.",
    };
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { token: verificationToken.token },
    });

    return {
      ok: false,
      status: 410,
      message: "This confirmation link has expired. Please subscribe again.",
    };
  }

  const email = verificationToken.identifier.slice(IDENTIFIER_PREFIX.length);

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { email },
    select: { email: true, isActive: true },
  });

  if (!subscriber) {
    await prisma.verificationToken.delete({
      where: { token: verificationToken.token },
    });

    return {
      ok: false,
      status: 404,
      message: "No pending newsletter subscription was found for this token.",
    };
  }

  await prisma.$transaction([
    prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive: true },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: verificationToken.identifier },
    }),
  ]);

  if (!subscriber.isActive) {
    await sendNewsletterWelcomeEmail(email);
  }

  await persistMarketingEvent({
    channel: "newsletter",
    event: "newsletter_subscribe_confirmed",
    payload: {
      emailHash: hashEmail(email),
      timestamp: Date.now(),
      wasAlreadyActive: subscriber.isActive,
    },
  });

  return {
    ok: true,
    status: 200,
    message: "Your newsletter subscription is now active.",
  };
}

function isHtmlRequest(request: NextRequest): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim() || "";
    const result = await confirmByToken(token);

    if (isHtmlRequest(request)) {
      return new NextResponse(renderConfirmationHtml(result), {
        status: result.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return NextResponse.json(
      { message: result.message, confirmed: result.ok },
      { status: result.status },
    );
  } catch (error) {
    console.error("Newsletter confirmation error", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Unable to confirm subscription." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await readJsonBodyWithLimit<{ token?: string }>(
      request,
      {
        maxBytes: 4_000,
        expectObject: true,
      },
    );

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status },
      );
    }

    const token =
      typeof parsedBody.data.token === "string"
        ? parsedBody.data.token.trim()
        : "";
    const result = await confirmByToken(token);

    return NextResponse.json(
      { message: result.message, confirmed: result.ok },
      { status: result.status },
    );
  } catch (error) {
    console.error("Newsletter confirmation error", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Unable to confirm subscription." },
      { status: 500 },
    );
  }
}
