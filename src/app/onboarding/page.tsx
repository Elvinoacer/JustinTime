"use client";

import apiClient from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import { getPreferredDashboard } from "@/lib/auth/workspace";
import OnboardingShell from "./components/OnboardingShell";
import StepRoleSelect from "./components/StepRoleSelect";
import StepClientDetails from "./components/StepClientDetails";
import StepProviderDetails from "./components/StepProviderDetails";
import StepVerification, {
  type VerificationResult,
} from "./components/StepVerification";
import StepComplete from "./components/StepComplete";
import {
  DEFAULT_CLIENT_ONBOARDING_DATA,
  DEFAULT_PROVIDER_ONBOARDING_DATA,
  DEFAULT_VERIFICATION_DRAFT,
  getStepForRole,
  normalizeOnboardingIntent,
  type ClientOnboardingData,
  type OnboardingDraftState,
  type OnboardingRole,
  type ProviderOnboardingData,
  type VerificationDraftData,
} from "@/lib/onboarding/draft";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof (error as { data?: { message?: unknown } }).data?.message ===
      "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }

  return "Onboarding failed. Please try again.";
}

function OnboardingPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const onboardingIntent = normalizeOnboardingIntent(
    searchParams.get("intent"),
  );
  const referralFromUrl = searchParams.get("ref")?.trim().toUpperCase() || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [persistDrafts, setPersistDrafts] = useState(true);
  const [didHydrateDraft, setDidHydrateDraft] = useState(false);
  const [providerCheckoutUrl, setProviderCheckoutUrl] = useState("");
  const [providerData, setProviderData] = useState<ProviderOnboardingData>({
    ...DEFAULT_PROVIDER_ONBOARDING_DATA,
  });
  const [clientData, setClientData] = useState<ClientOnboardingData>({
    ...DEFAULT_CLIENT_ONBOARDING_DATA,
  });
  const [clientInterests, setClientInterests] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [verificationDraft, setVerificationDraft] =
    useState<VerificationDraftData>(DEFAULT_VERIFICATION_DRAFT);

  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        return response.data.data.filter((cat: Category) => cat.id !== "all");
      },
    });

  useEffect(() => {
    let cancelled = false;

    const hydrateDraft = async () => {
      if (!session?.user?.id) {
        return;
      }

      try {
        const response = await fetch("/api/users/onboarding", {
          cache: "no-store",
          credentials: "include",
        });

        let draft: OnboardingDraftState | null = null;
        if (response.ok) {
          const data = (await response.json()) as {
            draft?: OnboardingDraftState;
          };
          draft = data.draft || null;
        }

        if (cancelled) {
          return;
        }

        const roleFromDraftOrIntent = onboardingIntent || draft?.role || null;
        const effectiveRole =
          roleFromDraftOrIntent ||
          (session.user.onboardingCompleted ? "PROVIDER" : null);
        const defaultClientName = session.user.name || "";
        const nextClientData = {
          ...DEFAULT_CLIENT_ONBOARDING_DATA,
          ...(draft?.clientData || {}),
          name: draft?.clientData?.name || defaultClientName,
        };
        const nextProviderData = {
          ...DEFAULT_PROVIDER_ONBOARDING_DATA,
          ...(draft?.providerData || {}),
        };

        setSelectedRole(effectiveRole);
        setCurrentStep(
          effectiveRole
            ? Math.max(draft?.currentStep || getStepForRole(effectiveRole), 2)
            : draft?.currentStep || 1,
        );
        setClientData(nextClientData);
        setProviderData(nextProviderData);
        setClientInterests(draft?.clientInterests || []);
        setReferralCode(referralFromUrl || draft?.referralCode || "");
        setVerificationDraft(draft?.verification || DEFAULT_VERIFICATION_DRAFT);
        setProviderCheckoutUrl(draft?.checkoutUrl || "");
      } catch (error) {
        if (!cancelled) {
          console.error("[ONBOARDING_DRAFT_HYDRATE_ERROR]", error);
          const fallbackRole =
            onboardingIntent ||
            (session.user?.onboardingCompleted ? "PROVIDER" : null);
          setSelectedRole(fallbackRole);
          setCurrentStep(fallbackRole ? 2 : 1);
          setClientData((prev) => ({
            ...prev,
            name: prev.name || session.user?.name || "",
          }));
          setReferralCode(referralFromUrl);
        }
      } finally {
        if (!cancelled) {
          setDidHydrateDraft(true);
        }
      }
    };

    void hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [
    onboardingIntent,
    referralFromUrl,
    session?.user?.id,
    session?.user?.name,
  ]);

  useEffect(() => {
    if (!didHydrateDraft || !persistDrafts || !session?.user?.id) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await fetch("/api/users/onboarding", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            draft: {
              role: selectedRole,
              currentStep,
              clientData,
              providerData,
              clientInterests,
              referralCode,
              verification: verificationDraft,
              paymentInitiated: Boolean(providerCheckoutUrl),
              checkoutUrl: providerCheckoutUrl,
            },
          }),
        });
      } catch (error) {
        console.error("[ONBOARDING_DRAFT_SAVE_ERROR]", error);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    clientData,
    clientInterests,
    currentStep,
    didHydrateDraft,
    persistDrafts,
    providerCheckoutUrl,
    providerData,
    referralCode,
    selectedRole,
    session?.user?.id,
    verificationDraft,
  ]);

  useEffect(() => {
    if (session?.user?.onboardingCompleted) {
      const isOnSuccessStep =
        (selectedRole === "CLIENT" && currentStep === 3) ||
        (selectedRole === "PROVIDER" && currentStep === 5);

      if (isOnSuccessStep) {
        return;
      }

      router.push(getPreferredDashboard(session.user));
    }
  }, [session, router, currentStep, selectedRole]);

  const formatPhoneNumber = useCallback((input: string): string => {
    return normalizeKenyanPhone(input);
  }, []);

  const validatePhone = useCallback(
    async (
      phone: string,
    ): Promise<{
      ok: boolean;
      normalizedPhone?: string;
      message?: string;
      transientError?: boolean;
    }> => {
      const normalizedPhone = normalizeKenyanPhone(phone);

      if (!normalizedPhone) {
        return {
          ok: false,
          normalizedPhone,
          message: "Phone number is required",
        };
      }

      if (!isValidKenyanPhone(normalizedPhone)) {
        return {
          ok: false,
          normalizedPhone,
          message:
            "Use a valid Kenyan phone number format, for example 254712345678.",
        };
      }

      try {
        const response = await apiClient.post(
          "/users/onboarding/validate-phone",
          {
            phone: normalizedPhone,
          },
        );

        return {
          ok: Boolean(response?.data?.available),
          normalizedPhone: response?.data?.normalizedPhone || normalizedPhone,
          message: response?.data?.message,
        };
      } catch (error: unknown) {
        const known = error as {
          status?: number;
          message?: string;
          data?: { error?: string; message?: string; normalizedPhone?: string };
        };

        const transientError =
          typeof known?.status !== "number" || known.status >= 500;

        return {
          ok: false,
          transientError,
          normalizedPhone: known?.data?.normalizedPhone || normalizedPhone,
          message:
            known?.data?.error ||
            known?.data?.message ||
            known?.message ||
            "Unable to validate phone number right now.",
        };
      }
    },
    [],
  );

  const uploadFile = async (
    file: File,
    folder: string = "uploads",
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        detail = errBody?.error || errBody?.message || detail;
      } catch {}
      throw new Error(`Upload failed: ${detail}`);
    }

    const data = await res.json();
    if (!data.url) throw new Error("Upload succeeded but no URL returned.");
    return data.url;
  };

  const deleteUploadedFile = async (url: string): Promise<void> => {
    try {
      await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("[ONBOARDING_UPLOAD_CLEANUP_FAILED]", error);
    }
  };

  const handleRoleSelect = (role: OnboardingRole) => {
    setSelectedRole(role);
    setCurrentStep(2);
  };

  const handleInterestToggle = (interestId: string) => {
    setClientInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId],
    );
  };

  const handleClientSubmit = async () => {
    setIsLoading(true);
    let succeeded = false;

    try {
      const payload = {
        role: "CLIENT" as const,
        onboardingCompleted: true,
        name: clientData.name,
        phone: clientData.phone,
        address: clientData.address,
        location: clientData.location || clientData.address,
        latitude: clientData.latitude,
        longitude: clientData.longitude,
        locationSource: clientData.locationSource,
        locationAccuracy: clientData.locationAccuracy,
        clientInterests,
        ...(referralCode ? { referralCode } : {}),
      };

      setSubmitStage("Saving your profile...");
      await apiClient.post("/users/onboarding", payload);

      setSubmitStage("Finalizing your account...");
      await update({
        user: {
          name: clientData.name,
          role: "CLIENT",
          onboardingCompleted: true,
          clientInterests,
          emailVerified: session?.user?.emailVerified,
          authProvider: session?.user?.authProvider,
        },
      });

      setPersistDrafts(false);
      succeeded = true;
      setIsLoading(false);
      setCurrentStep(3);
      router.refresh();
      setTimeout(() => router.push("/client/dashboard"), 2500);
    } catch (error: unknown) {
      console.error("Client onboarding failed:", error);
      toast.error(getErrorMessage(error));
    } finally {
      if (!succeeded) setIsLoading(false);
      setSubmitStage("");
    }
  };

  const handleProviderDetailsNext = async () => {
    setCurrentStep(3);
  };

  const handleVerificationComplete = async (result: VerificationResult) => {
    setIsLoading(true);
    let succeeded = false;
    let onboardingSaved = false;
    const uploadedUrls: string[] = [];

    try {
      let idDocumentUrl: string | null = null;
      let selfieUrl: string | null = null;

      if (result.idFile) {
        setSubmitStage("Uploading ID document...");
        idDocumentUrl = await uploadFile(result.idFile, "identity");
        uploadedUrls.push(idDocumentUrl);
      }

      if (result.selfieFile) {
        setSubmitStage("Uploading profile photo...");
        selfieUrl = await uploadFile(result.selfieFile, "avatars");
        uploadedUrls.push(selfieUrl);
      }

      const payload = {
        role: "PROVIDER" as const,
        onboardingCompleted: true,
        image: selfieUrl,
        businessName: providerData.businessName,
        primaryCategoryId: providerData.primaryCategoryId,
        skills: providerData.skills,
        location: providerData.location,
        latitude: providerData.latitude,
        longitude: providerData.longitude,
        locationSource: providerData.locationSource,
        locationAccuracy: providerData.locationAccuracy,
        bio: providerData.bio,
        phone: providerData.phone,
        hourlyRate: providerData.hourlyRate
          ? Number(providerData.hourlyRate)
          : undefined,
        verificationStatus: "PENDING",
        idDocument: idDocumentUrl,
        faceMatchScore: result.faceMatchScore,
        idDocumentType: result.idDocumentType,
        manualReviewRequested: result.manualReviewRequested,
        ...(referralCode ? { referralCode } : {}),
      };

      setSubmitStage("Saving your provider profile...");
      await apiClient.post("/users/onboarding", payload);
      onboardingSaved = true;

      setSubmitStage("Preparing secure activation payment...");
      const paymentResponse = await fetch("/api/onboarding-fee/initiate", {
        method: "POST",
        credentials: "include",
      });
      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok && !paymentData?.alreadyActivated) {
        throw new Error(
          paymentData?.error || "Failed to start onboarding payment",
        );
      }

      const checkoutUrl =
        paymentData?.checkoutUrl || "/dashboard/onboarding-complete";

      await update({
        user: {
          role: "PROVIDER",
          onboardingCompleted: true,
          image: selfieUrl || session?.user?.image,
          clientInterests: session?.user?.clientInterests,
          emailVerified: session?.user?.emailVerified,
          authProvider: session?.user?.authProvider,
        },
      });

      setVerificationDraft({
        idDocumentType: result.idDocumentType,
        faceMatchScore: result.faceMatchScore,
        verificationStatus: result.manualReviewRequested
          ? "MANUAL_REVIEW"
          : "PASSED",
        manualReviewRequested: result.manualReviewRequested,
      });
      setProviderCheckoutUrl(checkoutUrl);
      setPersistDrafts(false);
      succeeded = true;
      setIsLoading(false);
      setCurrentStep(5);
      router.refresh();

      window.setTimeout(() => {
        if (/^https?:\/\//i.test(checkoutUrl)) {
          window.location.assign(checkoutUrl);
        } else {
          router.push(checkoutUrl);
        }
      }, 1800);
    } catch (error: unknown) {
      console.error("Provider onboarding failed:", error);

      if (!onboardingSaved) {
        await Promise.all(uploadedUrls.map((url) => deleteUploadedFile(url)));
      }

      toast.error(getErrorMessage(error));
    } finally {
      if (!succeeded) setIsLoading(false);
      setSubmitStage("");
    }
  };

  const isFinalStep =
    (selectedRole === "CLIENT" && currentStep === 3) ||
    (selectedRole === "PROVIDER" && currentStep === 5);

  const providerSuccessMessage = useMemo(() => {
    const needsManualReview = verificationDraft.manualReviewRequested;
    return needsManualReview
      ? "Your provider profile is submitted. Next we’ll redirect you to secure activation payment, and our team will manually review your verification documents afterwards."
      : "Your provider profile is submitted. Next we’ll redirect you to secure activation payment so your verification review can continue.";
  }, [verificationDraft.manualReviewRequested]);

  const removeReferralCode = () => {
    setReferralCode("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ref");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  return (
    <OnboardingShell currentStep={currentStep} selectedRole={selectedRole}>
      {referralCode ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Referral applied</p>
              <p className="text-emerald-700">{referralCode}</p>
            </div>
            <button
              type="button"
              onClick={removeReferralCode}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <StepRoleSelect
            selectedRole={selectedRole}
            onSelect={handleRoleSelect}
          />
        )}

        {currentStep === 2 && selectedRole === "CLIENT" && (
          <StepClientDetails
            clientData={clientData}
            setClientData={setClientData}
            clientInterests={clientInterests}
            onInterestToggle={handleInterestToggle}
            categories={categoriesData}
            isLoadingCategories={isLoadingCategories}
            onBack={() => setCurrentStep(1)}
            onNext={handleClientSubmit}
            isLoading={isLoading}
            formatPhoneNumber={formatPhoneNumber}
            validatePhone={validatePhone}
          />
        )}

        {currentStep === 2 && selectedRole === "PROVIDER" && (
          <StepProviderDetails
            providerData={providerData}
            setProviderData={setProviderData}
            categories={categoriesData}
            isLoadingCategories={isLoadingCategories}
            onBack={() => setCurrentStep(1)}
            onNext={handleProviderDetailsNext}
            formatPhoneNumber={formatPhoneNumber}
            validatePhone={validatePhone}
          />
        )}

        {currentStep === 3 && selectedRole === "PROVIDER" && (
          <StepVerification
            onBack={() => setCurrentStep(2)}
            onNext={handleVerificationComplete}
            isSubmitting={isLoading}
            submitStage={submitStage}
          />
        )}

        {isFinalStep && (
          <StepComplete
            role={selectedRole}
            redirectPath={
              selectedRole === "PROVIDER"
                ? providerCheckoutUrl || "/dashboard/onboarding-complete"
                : "/client/dashboard"
            }
            title={
              selectedRole === "PROVIDER" ? "Profile Submitted" : "All Set!"
            }
            message={
              selectedRole === "PROVIDER"
                ? providerSuccessMessage
                : "Your account is ready. Redirecting you to your dashboard..."
            }
            primaryActionLabel={
              selectedRole === "PROVIDER" ? "Continue to payment" : undefined
            }
            secondaryActionLabel={
              selectedRole === "PROVIDER" ? "Verification overview" : undefined
            }
            secondaryActionHref={
              selectedRole === "PROVIDER"
                ? "/dashboard/verification"
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </OnboardingShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
