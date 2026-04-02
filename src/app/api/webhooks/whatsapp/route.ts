import { after, NextRequest, NextResponse } from "next/server";
import { parseIncomingMessage } from "@/lib/whatsapp-service";
import crypto from "crypto";

type NormalizedWhatsAppMessage = {
  from: string;
  body: string;
  type: string;
  mediaId?: string;
  mimeType?: string;
  providerMessageId?: string;
  timestamp?: string;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeIncomingMessages(
  payload: unknown,
): NormalizedWhatsAppMessage[] {
  const normalized: NormalizedWhatsAppMessage[] = [];
  const root = asRecord(payload);
  const entries = asArray(root?.entry);

  for (const entry of entries) {
    const entryRecord = asRecord(entry);
    const changes = asArray(entryRecord?.changes);

    for (const change of changes) {
      const changeRecord = asRecord(change);
      const value = asRecord(changeRecord?.value);
      const messages = asArray(value?.messages);

      for (const message of messages) {
        const messageRecord = asRecord(message);
        const from =
          typeof messageRecord?.from === "string" ? messageRecord.from : "";
        if (!from) {
          continue;
        }

        const type =
          typeof messageRecord?.type === "string" ? messageRecord.type : "text";
        const mediaPayload = asRecord(messageRecord?.[type]);
        const textPayload = asRecord(messageRecord?.text);

        normalized.push({
          from,
          body: typeof textPayload?.body === "string" ? textPayload.body : "",
          type,
          mediaId:
            typeof mediaPayload?.id === "string" ? mediaPayload.id : undefined,
          mimeType:
            typeof mediaPayload?.mime_type === "string"
              ? mediaPayload.mime_type
              : undefined,
          providerMessageId:
            typeof messageRecord?.id === "string"
              ? messageRecord.id
              : undefined,
          timestamp:
            typeof messageRecord?.timestamp === "string"
              ? messageRecord.timestamp
              : undefined,
        });
      }
    }
  }

  return normalized;
}

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected, "utf-8");
  const receivedBuffer = Buffer.from(signatureHeader, "utf-8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

// Verify Webhook (GET)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN || "justintime_secure_token";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse(null, { status: 403 });
    }
  }

  return new NextResponse("Missing parameters", { status: 400 });
}

// Receive Messages (POST)
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifyMetaSignature(rawBody, signature)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const body: unknown = JSON.parse(rawBody);
    const root = asRecord(body);

    // Meta sends object: { object: 'whatsapp_business_account', entry: [...] }
    if (!root?.object) {
      return new NextResponse(null, { status: 404 });
    }

    const normalizedMessages = normalizeIncomingMessages(root);

    if (normalizedMessages.length > 0) {
      after(async () => {
        await Promise.allSettled(
          normalizedMessages.map((message) => parseIncomingMessage(message)),
        );
      });
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
