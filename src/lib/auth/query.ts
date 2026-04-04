export type AuthQueryState = {
  ref: string;
  callbackUrl: string;
  returnTo: string;
  intent: string;
};

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
  const query = buildAuthQueryString(state);
  return query ? `${pathname}?${query}` : pathname;
}
