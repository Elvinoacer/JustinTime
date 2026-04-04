import { NextRequest, NextResponse } from "next/server";

function resolveRedirectUrl(request: NextRequest, callbackUrl?: string | null) {
  const url = request.nextUrl.clone();
  url.pathname = "/api/auth/signin/google";
  url.search = "";

  if (callbackUrl?.trim()) {
    url.searchParams.set("callbackUrl", callbackUrl.trim());
  }

  return url;
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    resolveRedirectUrl(request, request.nextUrl.searchParams.get("callbackUrl")),
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const callbackUrl =
    typeof body?.callbackUrl === "string" ? body.callbackUrl : null;

  return NextResponse.json(
    {
      redirectTo: resolveRedirectUrl(request, callbackUrl).toString(),
    },
    { status: 200 },
  );
}
