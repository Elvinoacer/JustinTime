import { auth } from "@/auth";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import { NextResponse } from "next/server";

async function proxyRequest(
  request: Request,
  method: "GET" | "PUT",
  body?: string,
) {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/settings`, {
    method,
    headers: {
      cookie: request.headers.get("cookie") || "",
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type") as string }
        : {}),
    },
    body: body && method !== "GET" ? body : undefined,
    cache: "no-store",
  });

  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}

async function ensureClientAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasClientAccess(session.user)) {
    return NextResponse.json(
      { error: "Client profile required" },
      { status: 403 },
    );
  }

  return null;
}

export async function GET(request: Request) {
  const authError = await ensureClientAccess();
  if (authError) {
    return authError;
  }

  return proxyRequest(request, "GET");
}

export async function PUT(request: Request) {
  const authError = await ensureClientAccess();
  if (authError) {
    return authError;
  }

  const body = await request.text();
  return proxyRequest(request, "PUT", body);
}
