export type PaymentVerificationKind =
  | "wallet_topup"
  | "onboarding_fee"
  | "subscription";

const LEGACY_RETURN_PATHS: Record<string, string> = {
  "/client/wallet/topup-complete": "/client/wallet",
  "/dashboard/wallet/topup-complete": "/dashboard/wallet",
  "/dashboard/onboarding-complete": "/dashboard/verification",
  "/dashboard/premium/complete": "/dashboard/premium",
};

export function normalizeInternalReturnPath(
  path?: string | null,
): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.startsWith("/payment/verify")) {
    return null;
  }

  const normalizedLegacy = Object.entries(LEGACY_RETURN_PATHS).find(
    ([legacyPath]) =>
      trimmed === legacyPath || trimmed.startsWith(`${legacyPath}?`),
  );

  if (normalizedLegacy) {
    return normalizedLegacy[1];
  }

  return trimmed;
}

export function buildPaymentVerificationPath(params: {
  kind: PaymentVerificationKind;
  apiRef?: string | null;
  topUpId?: string | null;
  checkoutId?: string | null;
  trackingId?: string | null;
  returnTo?: string | null;
}): string {
  const searchParams = new URLSearchParams();

  searchParams.set("kind", params.kind);

  if (params.apiRef) {
    searchParams.set("apiRef", String(params.apiRef));
  }

  if (params.topUpId) {
    searchParams.set("topUpId", String(params.topUpId));
  }

  if (params.checkoutId) {
    searchParams.set("checkoutId", String(params.checkoutId));
  }

  if (params.trackingId) {
    searchParams.set("trackingId", String(params.trackingId));
  }

  const normalizedReturnTo = normalizeInternalReturnPath(params.returnTo);
  if (normalizedReturnTo) {
    searchParams.set("returnTo", normalizedReturnTo);
  }

  return `/payment/verify?${searchParams.toString()}`;
}
