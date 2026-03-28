import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLanguageSwitchMonitorSnapshot } from "@/lib/n8n-language-switch-monitor";

function canUseDebugEndpoint() {
  if (process.env.N8N_LANGUAGE_SWITCH_DEBUG === "true") {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  if (!canUseDebugEndpoint()) {
    return NextResponse.json(
      { ok: false, error: "Debug endpoint disabled" },
      { status: 403 },
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    snapshot: getLanguageSwitchMonitorSnapshot(),
  });
}
