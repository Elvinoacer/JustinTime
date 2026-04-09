import { NextResponse } from "next/server";
import { POST as handleOnboardingWebhook } from "../route";

function isValidCallbackPathSecret(secret: string): boolean {
  const expected = String(process.env.DARAJA_CALLBACK_PATH_SECRET || "").trim();
  return expected.length > 0 && secret === expected;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params;

  if (!isValidCallbackPathSecret(String(secret || "").trim())) {
    return NextResponse.json(
      { error: "Invalid callback path" },
      { status: 401 },
    );
  }

  return handleOnboardingWebhook(request);
}
