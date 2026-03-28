type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds?: number;
  ruleKey?: string;
};

type RateLimitEnvConfig = {
  limitMultiplier: number;
  windowMultiplier: number;
  logBlocked: boolean;
};

const globalForAuthRateLimit = globalThis as typeof globalThis & {
  __authRateLimitStore?: Map<string, RateLimitEntry>;
  __authRateLimitLastCleanupAt?: number;
};

const rateLimitStore =
  globalForAuthRateLimit.__authRateLimitStore ??
  new Map<string, RateLimitEntry>();

globalForAuthRateLimit.__authRateLimitStore = rateLimitStore;

const CLEANUP_INTERVAL_MS = 60_000;

const authRateLimitEnv: RateLimitEnvConfig = {
  limitMultiplier: getPositiveNumberFromEnv(
    process.env.AUTH_RATE_LIMIT_LIMIT_MULTIPLIER,
    1,
  ),
  windowMultiplier: getPositiveNumberFromEnv(
    process.env.AUTH_RATE_LIMIT_WINDOW_MULTIPLIER,
    1,
  ),
  logBlocked: getBooleanFromEnv(process.env.AUTH_RATE_LIMIT_LOG_BLOCKED, true),
};

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

function fingerprintKey(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16);
}

function logRateLimitBlock(ruleKey: string, retryAfterSeconds: number): void {
  if (!authRateLimitEnv.logBlocked) return;

  const scope = ruleKey.split(":")[0] || "auth";
  console.warn("[AUTH_RATE_LIMIT_BLOCKED]", {
    scope,
    keyFingerprint: fingerprintKey(ruleKey),
    retryAfterSeconds,
  });
}

function maybeCleanup(now: number): void {
  const lastCleanupAt =
    globalForAuthRateLimit.__authRateLimitLastCleanupAt ?? 0;
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  globalForAuthRateLimit.__authRateLimitLastCleanupAt = now;
}

function consume(rule: RateLimitRule, now: number): RateLimitResult {
  const current = rateLimitStore.get(rule.key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(rule.key, {
      count: 1,
      resetAt: now + rule.windowMs,
    });

    return { ok: true };
  }

  if (current.count >= rule.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );
    logRateLimitBlock(rule.key, retryAfterSeconds);

    return {
      ok: false,
      retryAfterSeconds,
      ruleKey: rule.key,
    };
  }

  current.count += 1;
  rateLimitStore.set(rule.key, current);

  return { ok: true };
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().slice(0, 256);
}

function parseForwardedHeader(forwarded: string | null): string | null {
  if (!forwarded) return null;

  const firstPart = forwarded.split(",")[0]?.trim();
  if (!firstPart) return null;

  const forToken = firstPart
    .split(";")
    .map((token) => token.trim())
    .find((token) => token.toLowerCase().startsWith("for="));

  if (!forToken) return null;

  const value = forToken.slice(4).replace(/^"|"$/g, "").trim();
  if (!value) return null;

  return value;
}

function normalizeIp(ip: string | null): string | null {
  if (!ip) return null;

  let normalized = ip.trim();
  if (!normalized) return null;

  if (normalized.includes(",")) {
    normalized = normalized.split(",")[0].trim();
  }

  if (normalized.startsWith("[") && normalized.includes("]")) {
    normalized = normalized.slice(1, normalized.indexOf("]"));
  }

  const portIndex = normalized.lastIndexOf(":");
  if (portIndex > -1 && normalized.indexOf(":") === portIndex) {
    const maybePort = normalized.slice(portIndex + 1);
    if (/^\d+$/.test(maybePort)) {
      normalized = normalized.slice(0, portIndex);
    }
  }

  return normalized || null;
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  const forwarded = parseForwardedHeader(headers.get("forwarded"));
  const xForwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnectingIp = headers.get("cf-connecting-ip");
  const trueClientIp = headers.get("true-client-ip");

  return (
    normalizeIp(forwarded) ||
    normalizeIp(xForwardedFor) ||
    normalizeIp(cfConnectingIp) ||
    normalizeIp(trueClientIp) ||
    normalizeIp(realIp)
  );
}

export function enforceRateLimits(
  scope: string,
  rules: Array<{ suffix: string; limit: number; windowMs: number }>,
): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);

  for (const rule of rules) {
    const key = `${scope}:${normalizeKeyPart(rule.suffix)}`;
    const effectiveLimit = Math.max(
      1,
      Math.floor(rule.limit * authRateLimitEnv.limitMultiplier),
    );
    const effectiveWindowMs = Math.max(
      1000,
      Math.floor(rule.windowMs * authRateLimitEnv.windowMultiplier),
    );

    const result = consume(
      {
        key,
        limit: effectiveLimit,
        windowMs: effectiveWindowMs,
      },
      now,
    );

    if (!result.ok) {
      return result;
    }
  }

  return { ok: true };
}

export function clearRateLimitEntries(scope: string, suffixes: string[]): void {
  if (!scope || !suffixes.length) return;

  for (const suffix of suffixes) {
    const key = `${scope}:${normalizeKeyPart(suffix)}`;
    rateLimitStore.delete(key);
  }
}

export const AUTH_RATE_LIMIT_ERROR =
  "Too many authentication requests. Please try again shortly.";
