import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { recordLanguageSwitchAttempt } from "@/lib/n8n-language-switch-monitor";

const SUPPORTED_LOCALES = new Set(["en", "sw", "sheng"]);
const LANGUAGE_SWITCH_ENABLED =
  process.env.ENABLE_LANGUAGE_SWITCHING === "true";

function buildWebhookHeaders(token?: string) {
  const webhookHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    webhookHeaders.Authorization = `Bearer ${token}`;
  }

  return webhookHeaders;
}

async function postWithTimeout(
  url: string,
  payload: unknown,
  token?: string,
  timeoutMs = 4000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: buildWebhookHeaders(token),
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const locale = typeof body?.locale === "string" ? body.locale : "";
    const previousLocale =
      typeof body?.previousLocale === "string" ? body.previousLocale : null;
    const source = typeof body?.source === "string" ? body.source : "unknown";

    if (!LANGUAGE_SWITCH_ENABLED) {
      recordLanguageSwitchAttempt({
        locale: locale || null,
        source,
        success: false,
        status: 503,
        detail: "language-switch-disabled",
      });

      return NextResponse.json({
        ok: true,
        forwarded: false,
        skipped: "Language switching is disabled",
      });
    }

    if (!SUPPORTED_LOCALES.has(locale)) {
      recordLanguageSwitchAttempt({
        locale: locale || null,
        source,
        success: false,
        status: 400,
        detail: "unsupported-locale",
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported locale",
        },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.N8N_LANGUAGE_SWITCH_WEBHOOK_URL;
    if (!webhookUrl) {
      recordLanguageSwitchAttempt({
        locale,
        source,
        success: false,
        status: 503,
        detail: "webhook-not-configured",
      });

      return NextResponse.json({
        ok: true,
        forwarded: false,
        skipped: "N8N_LANGUAGE_SWITCH_WEBHOOK_URL is not configured",
      });
    }

    const webhookToken = process.env.N8N_LANGUAGE_SWITCH_WEBHOOK_TOKEN;
    const session = await auth();
    const requestHeaders = await headers();

    const payload = {
      event: "language.switch",
      locale,
      previousLocale,
      source,
      timestamp: new Date().toISOString(),
      user: {
        id: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        role: session?.user?.role ?? null,
      },
      request: {
        userAgent: requestHeaders.get("user-agent"),
        ip:
          requestHeaders.get("x-forwarded-for") ||
          requestHeaders.get("x-real-ip") ||
          null,
      },
    };

    const webhookResponse = await postWithTimeout(
      webhookUrl,
      payload,
      webhookToken,
    );

    if (!webhookResponse.ok) {
      recordLanguageSwitchAttempt({
        locale,
        source,
        success: false,
        status: webhookResponse.status,
        detail: "n8n-non-success-status",
      });

      return NextResponse.json(
        {
          ok: false,
          forwarded: false,
          status: webhookResponse.status,
          message: "n8n webhook returned a non-success status",
        },
        { status: 502 },
      );
    }

    recordLanguageSwitchAttempt({
      locale,
      source,
      success: true,
      status: 200,
      detail: "forwarded",
    });

    return NextResponse.json({ ok: true, forwarded: true });
  } catch (error) {
    console.error("[N8N_LANGUAGE_SWITCH_ERROR]", error);

    recordLanguageSwitchAttempt({
      locale: null,
      source: null,
      success: false,
      status: 500,
      detail: "exception",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process language switch webhook",
      },
      { status: 500 },
    );
  }
}
