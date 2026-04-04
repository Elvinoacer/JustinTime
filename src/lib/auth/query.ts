export type AuthQueryState = {
  ref: string;
  callbackUrl: string;
  returnTo: string;
  intent: string;
};

export const AUTH_CONTEXT_COOKIE_NAME = "jit_auth_context";

export function getAuthQueryState(params: URLSearchParams): AuthQueryState {
  return {
    ref: params.get("ref")?.trim().toUpperCase() || "",
    callbackUrl: params.get("callbackUrl")?.trim() || "",
    returnTo: params.get("returnTo")?.trim() || "",
    intent: params.get("intent")?.trim() || "",
  };
}

export function buildAuthQueryString(state: Partial<AuthQueryState>): string {
  const params = new URLSearchParams();

  if (state.ref) params.set("ref", state.ref);
  if (state.callbackUrl) params.set("callbackUrl", state.callbackUrl);
  if (state.returnTo) params.set("returnTo", state.returnTo);
  if (state.intent) params.set("intent", state.intent);

  return params.toString();
}

export function withAuthQuery(
  pathname: string,
  state: Partial<AuthQueryState>,
): string {
  const url = new URL(
    pathname.startsWith("/") ? `https://local${pathname}` : pathname,
  );

  if (state.ref) url.searchParams.set("ref", state.ref);
  if (state.callbackUrl) url.searchParams.set("callbackUrl", state.callbackUrl);
  if (state.returnTo) url.searchParams.set("returnTo", state.returnTo);
  if (state.intent) url.searchParams.set("intent", state.intent);

  return url.origin === "https://local"
    ? `${url.pathname}${url.search}${url.hash}`
    : url.toString();
}

export function buildOnboardingIntentUrl(
  state: Partial<AuthQueryState>,
  fallback = "/onboarding",
): string {
  const destination = state.callbackUrl || state.returnTo || fallback;
  const url = new URL(
    destination.startsWith("/") ? `https://local${destination}` : destination,
  );

  if (state.ref && !url.searchParams.has("ref")) {
    url.searchParams.set("ref", state.ref);
  }

  if (state.intent && !url.searchParams.has("intent")) {
    url.searchParams.set("intent", state.intent);
  }

  return url.origin === "https://local"
    ? `${url.pathname}${url.search}${url.hash}`
    : url.toString();
}

export function encodeAuthContextCookie(
  state: Partial<AuthQueryState>,
): string {
  return encodeURIComponent(
    JSON.stringify({
      ref: state.ref || "",
      callbackUrl: state.callbackUrl || "",
      returnTo: state.returnTo || "",
      intent: state.intent || "",
    }),
  );
}

export function decodeAuthContextCookie(
  value?: string | null,
): AuthQueryState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AuthQueryState>;
    return {
      ref: typeof parsed.ref === "string" ? parsed.ref : "",
      callbackUrl:
        typeof parsed.callbackUrl === "string" ? parsed.callbackUrl : "",
      returnTo: typeof parsed.returnTo === "string" ? parsed.returnTo : "",
      intent: typeof parsed.intent === "string" ? parsed.intent : "",
    };
  } catch {
    return null;
  }
}
