import { auth } from "@/auth";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import { getPendingDeletionRedirect } from "@/lib/auth/lifecycle";
import { NextResponse } from "next/server";

type ProxyRateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForProxyRateLimit = globalThis as typeof globalThis & {
  __proxyRateLimitStore?: Map<string, ProxyRateLimitEntry>;
  __proxyRateLimitLastCleanupAt?: number;
};

const proxyRateLimitStore =
  globalForProxyRateLimit.__proxyRateLimitStore ??
  new Map<string, ProxyRateLimitEntry>();

globalForProxyRateLimit.__proxyRateLimitStore = proxyRateLimitStore;

const PROXY_RATE_LIMIT_CLEANUP_MS = 60_000;

const PROXY_LOG_RATE_LIMIT_BLOCKED = getBooleanFromEnv(
  process.env.PROXY_RATE_LIMIT_LOG_BLOCKED,
  true,
);
const PROXY_LIMIT_MULTIPLIER = getPositiveNumberFromEnv(
  process.env.PROXY_RATE_LIMIT_LIMIT_MULTIPLIER,
  1,
);
const PROXY_WINDOW_MULTIPLIER = getPositiveNumberFromEnv(
  process.env.PROXY_RATE_LIMIT_WINDOW_MULTIPLIER,
  1,
);
const SUPPORTED_LOCALES = new Set(["en", "sw", "sheng"]);
const LANGUAGE_SWITCH_ENABLED = getBooleanFromEnv(
  process.env.ENABLE_LANGUAGE_SWITCHING,
  false,
);

const proxyLimits = {
  apiGlobalLimit: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_API_GLOBAL_LIMIT,
    300,
  ),
  apiGlobalWindowMs: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_API_GLOBAL_WINDOW_MS,
    5 * 60 * 1000,
  ),
  authVerifyCredentialsLimit: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_VERIFY_CREDENTIALS_LIMIT,
    25,
  ),
  authVerifyCredentialsWindowMs: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_VERIFY_CREDENTIALS_WINDOW_MS,
    15 * 60 * 1000,
  ),
  authSignupLimit: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_SIGNUP_LIMIT,
    12,
  ),
  authSignupWindowMs: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_SIGNUP_WINDOW_MS,
    60 * 60 * 1000,
  ),
  authRecoveryLimit: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_RECOVERY_LIMIT,
    20,
  ),
  authRecoveryWindowMs: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_RECOVERY_WINDOW_MS,
    15 * 60 * 1000,
  ),
  authGenericLimit: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_GENERIC_LIMIT,
    80,
  ),
  authGenericWindowMs: getPositiveIntegerFromEnv(
    process.env.PROXY_RATE_LIMIT_AUTH_GENERIC_WINDOW_MS,
    15 * 60 * 1000,
  ),
};

function getPositiveIntegerFromEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getPositiveNumberFromEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getBooleanFromEnv(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function maskIp(ip: string): string {
  if (ip.includes(":")) {
    const segments = ip.split(":");
    return `${segments.slice(0, 3).join(":")}:****`;
  }

  const segments = ip.split(".");
  if (segments.length === 4) {
    return `${segments[0]}.${segments[1]}.${segments[2]}.*`;
  }

  return "masked";
}

function logProxyRateLimitBlock(payload: {
  path: string;
  ip: string;
  key: string;
  retryAfterSeconds: number;
}): void {
  if (!PROXY_LOG_RATE_LIMIT_BLOCKED) return;

  console.warn("[PROXY_RATE_LIMIT_BLOCKED]", {
    path: payload.path,
    ip: maskIp(payload.ip),
    key: payload.key,
    retryAfterSeconds: payload.retryAfterSeconds,
  });
}

function normalizeIp(value: string | null): string | null {
  if (!value) return null;

  let ip = value.trim();
  if (!ip) return null;

  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  }

  const portIndex = ip.lastIndexOf(":");
  if (portIndex > -1 && ip.indexOf(":") === portIndex) {
    const maybePort = ip.slice(portIndex + 1);
    if (/^\d+$/.test(maybePort)) {
      ip = ip.slice(0, portIndex);
    }
  }

  return ip || null;
}

function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("forwarded");
  const xForwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnectingIp = headers.get("cf-connecting-ip");
  const trueClientIp = headers.get("true-client-ip");

  const forwardedFor = forwarded
    ?.split(",")[0]
    ?.split(";")
    .map((token) => token.trim())
    .find((token) => token.toLowerCase().startsWith("for="))
    ?.slice(4)
    .replace(/^"|"$/g, "");

  return (
    normalizeIp(forwardedFor ?? null) ||
    normalizeIp(xForwardedFor) ||
    normalizeIp(cfConnectingIp) ||
    normalizeIp(trueClientIp) ||
    normalizeIp(realIp)
  );
}

function maybeCleanupRateLimitStore(now: number): void {
  const lastCleanupAt =
    globalForProxyRateLimit.__proxyRateLimitLastCleanupAt ?? 0;
  if (now - lastCleanupAt < PROXY_RATE_LIMIT_CLEANUP_MS) {
    return;
  }

  for (const [key, value] of proxyRateLimitStore.entries()) {
    if (value.resetAt <= now) {
      proxyRateLimitStore.delete(key);
    }
  }

  globalForProxyRateLimit.__proxyRateLimitLastCleanupAt = now;
}

function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds?: number; key?: string } {
  const now = Date.now();
  maybeCleanupRateLimitStore(now);

  const effectiveLimit = Math.max(
    1,
    Math.floor(limit * PROXY_LIMIT_MULTIPLIER),
  );
  const effectiveWindowMs = Math.max(
    1000,
    Math.floor(windowMs * PROXY_WINDOW_MULTIPLIER),
  );

  const current = proxyRateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    proxyRateLimitStore.set(key, {
      count: 1,
      resetAt: now + effectiveWindowMs,
    });
    return { allowed: true };
  }

  if (current.count >= effectiveLimit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      key,
    };
  }

  current.count += 1;
  proxyRateLimitStore.set(key, current);
  return { allowed: true };
}

function enforceApiRateLimit(
  pathname: string,
  ip: string,
): {
  allowed: boolean;
  retryAfterSeconds?: number;
  key?: string;
} {
  const checks: Array<{ key: string; limit: number; windowMs: number }> = [
    {
      key: `api:ip:${ip}`,
      limit: proxyLimits.apiGlobalLimit,
      windowMs: proxyLimits.apiGlobalWindowMs,
    },
  ];

  if (pathname.startsWith("/api/auth/verify-credentials")) {
    checks.push({
      key: `api:auth:verify-credentials:ip:${ip}`,
      limit: proxyLimits.authVerifyCredentialsLimit,
      windowMs: proxyLimits.authVerifyCredentialsWindowMs,
    });
  } else if (pathname.startsWith("/api/auth/signup")) {
    checks.push({
      key: `api:auth:signup:ip:${ip}`,
      limit: proxyLimits.authSignupLimit,
      windowMs: proxyLimits.authSignupWindowMs,
    });
  } else if (
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/resend-verification")
  ) {
    checks.push({
      key: `api:auth:recovery:ip:${ip}`,
      limit: proxyLimits.authRecoveryLimit,
      windowMs: proxyLimits.authRecoveryWindowMs,
    });
  } else if (
    pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/auth/callback") &&
    !pathname.startsWith("/api/auth/session") &&
    !pathname.startsWith("/api/auth/signin") &&
    !pathname.startsWith("/api/auth/signout")
  ) {
    checks.push({
      key: `api:auth:ip:${ip}`,
      limit: proxyLimits.authGenericLimit,
      windowMs: proxyLimits.authGenericWindowMs,
    });
  }

  for (const check of checks) {
    const result = consumeRateLimit(check.key, check.limit, check.windowMs);
    if (!result.allowed) {
      logProxyRateLimitBlock({
        path: pathname,
        ip,
        key: result.key || check.key,
        retryAfterSeconds: result.retryAfterSeconds ?? 60,
      });
      return result;
    }
  }

  return { allowed: true };
}

export default auth((req) => {
  const { nextUrl } = req;
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const user = req.auth?.user;
  const isSessionInvalidated = Boolean(user?.sessionInvalidated);
  const isLoggedIn = Boolean(req.auth && !isSessionInvalidated);
  const isBanned = Boolean(user?.isBanned);
  const hasPendingDeletion = Boolean(user?.deletionScheduledAt);

  const clearAuthCookies = (response: NextResponse) => {
    const cookieNames = [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
    ];

    for (const cookieName of cookieNames) {
      response.cookies.delete(cookieName);
    }

    return response;
  };

  if (isSessionInvalidated) {
    if (isApiRoute) {
      return clearAuthCookies(
        NextResponse.json(
          { error: "Session expired. Please sign in again." },
          { status: 401 },
        ),
      );
    }

    const loginUrl = new URL("/auth/login?reauth=required", nextUrl);
    return clearAuthCookies(NextResponse.redirect(loginUrl));
  }

  if (isApiRoute) {
    const clientIp = getClientIp(req.headers);

    if (!clientIp) {
      return NextResponse.json(
        { error: "Unable to validate request origin" },
        { status: 400 },
      );
    }

    const rateLimitResult = enforceApiRateLimit(nextUrl.pathname, clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    if (isBanned) {
      return clearAuthCookies(
        NextResponse.json(
          { error: "This account has been suspended." },
          { status: 403 },
        ),
      );
    }

    if (hasPendingDeletion) {
      const allowedPendingDeletionApiRoutes = [
        "/api/account/cancel-deletion",
        "/api/settings",
        "/api/client/settings",
        "/api/auth",
      ];
      const isAllowedPendingDeletionApiRoute =
        allowedPendingDeletionApiRoutes.some(
          (route) =>
            nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`),
        );

      if (!isAllowedPendingDeletionApiRoute) {
        return NextResponse.json(
          {
            error:
              "This account is pending deletion. Restore it from settings to continue.",
          },
          { status: 423 },
        );
      }
    }

    return NextResponse.next();
  }

  const requestedLocale = nextUrl.searchParams.get("locale");
  if (requestedLocale) {
    const cleanUrl = nextUrl.clone();
    cleanUrl.searchParams.delete("locale");

    if (!LANGUAGE_SWITCH_ENABLED) {
      return NextResponse.redirect(cleanUrl);
    }

    if (!SUPPORTED_LOCALES.has(requestedLocale)) {
      return NextResponse.redirect(cleanUrl);
    }

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("NEXT_LOCALE", requestedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  }

  const isOnProviderDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isOnClientDashboard = nextUrl.pathname.startsWith("/client");
  const isOnAdmin = nextUrl.pathname.startsWith("/admin");
  const isOnSettings =
    nextUrl.pathname === "/dashboard/settings" ||
    nextUrl.pathname.startsWith("/dashboard/settings/") ||
    nextUrl.pathname === "/client/settings" ||
    nextUrl.pathname.startsWith("/client/settings/");
  const isOnAnyDashboard = isOnProviderDashboard || isOnClientDashboard;
  const isOnOnboarding = nextUrl.pathname.startsWith("/onboarding");
  const isOnAuth = nextUrl.pathname.startsWith("/auth");
  const isOnProviderPages = nextUrl.pathname.startsWith("/provider");

  // Public pages accessible to everyone
  const publicPages = [
    "/",
    "/about",
    "/services",
    "/professionals",
    "/booking",
    "/contact",
    "/jobs",
    "/faq",
    "/terms",
    "/privacy",
    "/solar",
  ];
  const isPublicPage = publicPages.some(
    (page) =>
      nextUrl.pathname === page || nextUrl.pathname.startsWith(page + "/"),
  );

  if (isPublicPage) {
    return NextResponse.next();
  }

  const hasCompletedOnboarding = req.auth?.user?.onboardingCompleted;
  const userRole = user?.role;
  const userRoles = user?.roles as string[] | undefined;
  const hasClientWorkspaceAccess = hasClientAccess({
    role: userRole,
    roles: userRoles,
  });
  const emailVerified = user?.emailVerified;
  const authProvider = user?.authProvider;
  const isGoogleUser = authProvider === "google";
  const isEffectivelyVerified = isGoogleUser || Boolean(emailVerified);

  if (isBanned) {
    return clearAuthCookies(
      NextResponse.redirect(new URL("/auth/error?error=AccountSuspended", nextUrl)),
    );
  }

  if (isLoggedIn && hasPendingDeletion && !isOnSettings && !isOnAuth) {
    return NextResponse.redirect(
      new URL(getPendingDeletionRedirect(userRole, nextUrl.searchParams), nextUrl),
    );
  }

  // B2: Email verification gate (treat completed onboarding as verified for routing)
  if (isLoggedIn && !isEffectivelyVerified && !isOnAuth) {
    return NextResponse.redirect(new URL("/auth/verify-request", nextUrl));
  }

  // Admin Route Protection
  if (isOnAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect Admin away from client/provider apps
  if (
    isLoggedIn &&
    userRole === "ADMIN" &&
    (isOnAnyDashboard || isOnOnboarding)
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  // B8: Protect /provider/ routes
  if (isOnProviderPages) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  if (isOnAnyDashboard) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (!hasCompletedOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    // Role-based dashboard access
    const effectivelyClientOnly =
      userRole === "CLIENT" && !userRoles?.includes("PROVIDER");

    if (isOnClientDashboard && !hasClientWorkspaceAccess) {
      if (userRole === "PROVIDER" || userRoles?.includes("PROVIDER")) {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }

      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    if (isOnProviderDashboard && effectivelyClientOnly) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    return NextResponse.next();
  }

  if (isOnOnboarding) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }

    const isUpgradeRequest = nextUrl.searchParams.get("upgrade") === "true";

    if (
      hasCompletedOnboarding &&
      !(isUpgradeRequest && userRole === "CLIENT")
    ) {
      if (userRole === "PROVIDER") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/client/dashboard", nextUrl));
      }
    }
    return NextResponse.next();
  }

  if (isOnAuth) {
    if (isLoggedIn) {
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }

      // If user is still unverified, keep them on auth pages.
      if (!isEffectivelyVerified) {
        return NextResponse.next();
      }

      // Verified user — redirect to appropriate destination
      if (!hasCompletedOnboarding) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl));
      }
      if (userRole === "PROVIDER") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/client/dashboard", nextUrl));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
