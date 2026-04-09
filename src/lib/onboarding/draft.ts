import type { LocationSource } from "@/app/onboarding/hooks/useLocation";

export type OnboardingRole = "CLIENT" | "PROVIDER";

export interface ProviderOnboardingData {
  businessName: string;
  primaryCategoryId: string;
  skills: string[];
  location: string;
  latitude: number | null;
  longitude: number | null;
  locationSource?: LocationSource;
  locationAccuracy?: number | null;
  bio: string;
  phone: string;
  hourlyRate: string;
  phoneValidated: boolean;
}

export interface ClientOnboardingData {
  name: string;
  phone: string;
  address: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  locationSource?: LocationSource;
  locationAccuracy?: number | null;
  phoneValidated: boolean;
}

export interface VerificationDraftData {
  idDocumentType: string;
  faceMatchScore: number | null;
  verificationStatus: "PASSED" | "REJECTED" | "MANUAL_REVIEW" | null;
  manualReviewRequested: boolean;
}

export interface OnboardingDraftState {
  role: OnboardingRole | null;
  currentStep: number;
  clientData: ClientOnboardingData;
  providerData: ProviderOnboardingData;
  clientInterests: string[];
  referralCode: string;
  verification: VerificationDraftData;
  updatedAt?: string;
}

export const DEFAULT_PROVIDER_ONBOARDING_DATA: ProviderOnboardingData = {
  businessName: "",
  primaryCategoryId: "",
  skills: [],
  location: "",
  latitude: null,
  longitude: null,
  locationSource: "MANUAL",
  locationAccuracy: null,
  bio: "",
  phone: "",
  hourlyRate: "",
  phoneValidated: false,
};

export const DEFAULT_CLIENT_ONBOARDING_DATA: ClientOnboardingData = {
  name: "",
  phone: "",
  address: "",
  location: "",
  latitude: null,
  longitude: null,
  locationSource: "MANUAL",
  locationAccuracy: null,
  phoneValidated: false,
};

export const DEFAULT_VERIFICATION_DRAFT: VerificationDraftData = {
  idDocumentType: "unknown",
  faceMatchScore: null,
  verificationStatus: null,
  manualReviewRequested: false,
};

export const DEFAULT_ONBOARDING_DRAFT_STATE: OnboardingDraftState = {
  role: null,
  currentStep: 1,
  clientData: DEFAULT_CLIENT_ONBOARDING_DATA,
  providerData: DEFAULT_PROVIDER_ONBOARDING_DATA,
  clientInterests: [],
  referralCode: "",
  verification: DEFAULT_VERIFICATION_DRAFT,
};

export function normalizeOnboardingIntent(
  value?: string | null,
): OnboardingRole | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "provider") {
    return "PROVIDER";
  }
  if (normalized === "client") {
    return "CLIENT";
  }
  return null;
}

export function getStepForRole(
  role: OnboardingRole,
  phase: "details" | "verification" | "complete" = "details",
): number {
  if (role === "CLIENT") {
    return phase === "complete" ? 3 : 2;
  }

  if (phase === "verification") {
    return 3;
  }

  if (phase === "complete") {
    return 4;
  }

  return 2;
}
