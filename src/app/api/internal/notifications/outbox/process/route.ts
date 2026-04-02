import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { processNotificationOutboxBatch } from "@/lib/notifications/outbox";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type ProcessPayload = {
  limit?: unknown;
  notificationId?: unknown;
  processorId?: unknown;
};

function hasSecretAccess(request: Request): boolean {
  const expectedSecret = process.env.NOTIFICATION_OUTBOX_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-notification-outbox-secret");

  if (headerSecret && headerSecret === expectedSecret) {
    return true;
  }

  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  return false;
}

function parseLimit(request: Request): number {
  const { searchParams } = new URL(request.url);
  const parsed = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function parseOptionalString(
  value: unknown,
  maxLength = 128,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function parseLimitFromUnknown(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

async function parsePostPayload(
  request: Request,
): Promise<ProcessPayload | null> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ProcessPayload;
    }
    return null;
  } catch {
    throw new Error("INVALID_JSON_BODY");
  }
}

function resolveParams(request: Request, payload: ProcessPayload | null) {
  const { searchParams } = new URL(request.url);

  return {
    limit:
      parseLimitFromUnknown(payload?.limit) ??
      parseLimitFromUnknown(searchParams.get("limit")) ??
      parseLimit(request),
    notificationId:
      parseOptionalString(payload?.notificationId) ??
      parseOptionalString(searchParams.get("notificationId")),
    requestedProcessorId:
      parseOptionalString(payload?.processorId) ??
      parseOptionalString(
        request.headers.get("x-notification-outbox-processor"),
      ),
  };
}

async function executeProcessor(
  request: Request,
  payload: ProcessPayload | null,
) {
  const secretAuthorized = hasSecretAccess(request);
  const params = resolveParams(request, payload);

  let processorId = params.requestedProcessorId || "notification-outbox-cron";

  if (!secretAuthorized) {
    const session = await auth();
    if (!session?.user?.id || !hasRole(session.user, "ADMIN")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    processorId = params.requestedProcessorId || `admin:${session.user.id}`;
  }

  const result = await processNotificationOutboxBatch({
    limit: params.limit,
    notificationId: params.notificationId,
    processorId,
  });

  return NextResponse.json({
    ...result,
    processorId,
    limit: params.limit,
    notificationId: params.notificationId ?? null,
  });
}

export async function POST(request: Request) {
  try {
    const payload = await parsePostPayload(request);
    return await executeProcessor(request, payload);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    console.error("[NOTIFICATION_OUTBOX_PROCESS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    return await executeProcessor(request, null);
  } catch (error) {
    console.error("[NOTIFICATION_OUTBOX_PROCESS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
