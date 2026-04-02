import { NextRequest, NextResponse } from "next/server";
import { heartbeatCall, logCallStatus } from "@/app/actions/calls";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};

    const callId = typeof payload?.callId === "string" ? payload.callId : "";
    const mode = typeof payload?.mode === "string" ? payload.mode : "heartbeat";
    const durationSeconds =
      typeof payload?.durationSeconds === "number"
        ? payload.durationSeconds
        : 0;

    if (!callId) {
      return NextResponse.json(
        { error: "Call ID is required" },
        { status: 400 },
      );
    }

    if (mode === "end") {
      const result = await logCallStatus(callId, "ENDED");
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    const result = await heartbeatCall(callId, durationSeconds);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
