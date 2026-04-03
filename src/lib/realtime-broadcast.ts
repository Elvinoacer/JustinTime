type RealtimeEvent =
  | "new_message"
  | "messages_read"
  | "message_delivered"
  | "message_deleted"
  | "conversation_cleared"
  | "sos_alert_update";

interface RealtimeBroadcastPayload {
  event: RealtimeEvent;
  data: Record<string, unknown>;
}

const PROD_SOCKET_FALLBACK = "https://jit-socket.onrender.com";
const DEV_SOCKET_FALLBACK = "http://localhost:4000";

function resolveBroadcastUrl(): string {
  const configuredBaseUrl =
    process.env.SOCKET_INTERNAL_ENDPOINT ||
    process.env.NEXT_PUBLIC_SOCKET_ENDPOINT ||
    (process.env.NODE_ENV === "production"
      ? PROD_SOCKET_FALLBACK
      : DEV_SOCKET_FALLBACK);

  return `${configuredBaseUrl.replace(/\/+$/, "")}/internal/broadcast`;
}

async function postJsonWithTimeout(
  url: string,
  body: unknown,
  timeoutMs = 1500,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.SOCKET_INTERNAL_BROADCAST_TOKEN) {
      headers.Authorization = `Bearer ${process.env.SOCKET_INTERNAL_BROADCAST_TOKEN}`;
    }

    return await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function broadcastRealtimeEvent(
  payload: RealtimeBroadcastPayload,
): Promise<boolean> {
  try {
    const response = await postJsonWithTimeout(resolveBroadcastUrl(), payload);
    return response.ok;
  } catch (error) {
    console.error("Failed to broadcast realtime event", error);
    return false;
  }
}
