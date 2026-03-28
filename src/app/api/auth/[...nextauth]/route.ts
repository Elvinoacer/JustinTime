import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_RATE_LIMIT_ERROR,
  enforceRateLimits,
  getClientIpFromHeaders,
} from "@/lib/auth/rate-limit";

const rawGet = handlers?.GET;
const rawPost = handlers?.POST;

export async function GET(request: NextRequest) {
  if (!rawGet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clientIp = getClientIpFromHeaders(request.headers);
  if (!clientIp) {
    return NextResponse.json(
      { error: "Unable to validate request origin" },
      { status: 400 },
    );
  }

  const limitResult = enforceRateLimits("auth.nextauth.get", [
    {
      suffix: `ip:${clientIp}`,
      limit: 120,
      windowMs: 15 * 60 * 1000,
    },
  ]);

  if (!limitResult.ok) {
    return NextResponse.json(
      { error: AUTH_RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  return rawGet(request);
}

export async function POST(request: NextRequest) {
  if (!rawPost) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clientIp = getClientIpFromHeaders(request.headers);
  if (!clientIp) {
    return NextResponse.json(
      { error: "Unable to validate request origin" },
      { status: 400 },
    );
  }

  const path = new URL(request.url).pathname;
  const isCredentialsCallback = path.includes("/callback/credentials");
  const isSignIn = path.includes("/signin");
  const isSignOut = path.includes("/signout");

  const limits = [
    {
      suffix: `ip:${clientIp}`,
      limit: 80,
      windowMs: 15 * 60 * 1000,
    },
  ];

  if (isCredentialsCallback) {
    limits.push({
      suffix: `ip:${clientIp}:credentials-callback`,
      limit: 25,
      windowMs: 15 * 60 * 1000,
    });
  } else if (isSignIn) {
    limits.push({
      suffix: `ip:${clientIp}:signin`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
  } else if (isSignOut) {
    limits.push({
      suffix: `ip:${clientIp}:signout`,
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });
  }

  const limitResult = enforceRateLimits("auth.nextauth", limits);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: AUTH_RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  return rawPost(request);
}
