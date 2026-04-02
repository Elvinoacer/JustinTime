"use client";
import apiClient from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { Suspense, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";

// Step Components
import OnboardingShell from "./components/OnboardingShell";
import StepRoleSelect from "./components/StepRoleSelect";
import StepClientDetails from "./components/StepClientDetails";
import StepProviderDetails from "./components/StepProviderDetails";
import StepVerification, {
  type VerificationResult,
} from "./components/StepVerification";
import StepComplete from "./components/StepComplete";

type Role = "CLIENT" | "PROVIDER";

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
  const { data: session, update } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitStage, setSubmitStage] = useState<string>("");

  // Provider Form Data
  const [providerData, setProviderData] = useState({
    skills: [] as string[],
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    locationSource: "MANUAL" as "GPS" | "IP" | "MANUAL",
    locationAccuracy: null as number | null,
    bio: "",
    phone: "",
    hourlyRate: "",
  });

  // Client Form Data
  const [clientData, setClientData] = useState({
    phone: "",
    address: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    locationSource: "MANUAL" as "GPS" | "IP" | "MANUAL",
    locationAccuracy: null as number | null,
  });
  const [clientInterests, setClientInterests] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    setReferralCode(ref?.trim().toUpperCase() || "");
  }, []);

  // Fetch categories from database
  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        return response.data.data.filter((cat: Category) => cat.id !== "all");
      },
    });

  // Check if user has already completed onboarding
  useEffect(() => {
    if (session?.user?.onboardingCompleted) {
      const searchParams = new URLSearchParams(window.location.search);
      const isUpgradeRequest = searchParams.get("upgrade") === "true";

      if (isUpgradeRequest && session.user.role === "CLIENT") {
        return; // Stay on onboarding page for upgrade
      }

      // NEW1 Fix: Don't redirect if we just completed onboarding — let the
      // success screen show and the setTimeout handle the navigation
      const isOnSuccessStep =
        (selectedRole === "CLIENT" && currentStep === 3) ||
        (selectedRole === "PROVIDER" && currentStep === 4);
      if (isOnSuccessStep) return;

      const role = session.user.role;
      const redirectPath =
        role === "PROVIDER"
          ? "/dashboard/services?create=true&from=onboarding"
          : "/client/dashboard";
      router.push(redirectPath);
    }
  }, [session, router, currentStep, selectedRole]);

  // Phone number formatter for Kenyan numbers
  const formatPhoneNumber = useCallback((input: string): string => {
    return normalizeKenyanPhone(input);
  }, []);

  const validatePhone = useCallback(
    async (
      phone: string,
    ): Promise<{ ok: boolean; normalizedPhone?: string; message?: string }> => {
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

        return {
          ok: false,
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

  // File upload helper
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

  // ─── Step handlers ───────────────────────────────────────
  const handleRoleSelect = (role: Role) => {
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

  // Client: Step 2 → Submit
  const handleClientSubmit = async () => {
    setIsLoading(true);
    let succeeded = false;
    try {
      const payload = {
        role: "CLIENT" as Role,
        onboardingCompleted: true,
        phone: clientData.phone,
        address: clientData.address,
        location: clientData.location,
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
          role: "CLIENT",
          onboardingCompleted: true,
          clientInterests,
          emailVerified: session?.user?.emailVerified,
          authProvider: session?.user?.authProvider,
        },
      });

      // Show success step
      succeeded = true;
      setIsLoading(false);
      setCurrentStep(3);
      router.refresh(); // Flush cache and re-read session cookie
      setTimeout(() => router.push("/client/dashboard"), 3000);
    } catch (error: unknown) {
      console.error("Onboarding failed:", error);

      toast.error(getErrorMessage(error));
    } finally {
      if (!succeeded) setIsLoading(false);
      setSubmitStage("");
    }
  };

  // Provider: Step 2 → Step 3 (verification)
  const handleProviderDetailsNext = () => {
    setCurrentStep(3);
  };

  // Provider: Step 3 → Submit
  const handleVerificationComplete = async (result: VerificationResult) => {
    setIsLoading(true);
    let succeeded = false;

    try {
      let idDocumentUrl = null;
      let selfieUrl = null;

      // Upload ID Document
      if (result.idFile) {
        setSubmitStage("Uploading ID document...");
        idDocumentUrl = await uploadFile(result.idFile, "identity");
      }

      // Upload Selfie (also used as avatar)
      if (result.croppedSelfieBlob || result.selfieFile) {
        setSubmitStage("Uploading profile photo...");
        const fileToUpload = result.croppedSelfieBlob
          ? new File([result.croppedSelfieBlob], "avatar.jpg", {
              type: "image/jpeg",
            })
          : result.selfieFile;
        selfieUrl = await uploadFile(fileToUpload!, "avatars");
      }

      const payload = {
        role: "PROVIDER" as Role,
        onboardingCompleted: true,
        image: selfieUrl,
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
        ...(referralCode ? { referralCode } : {}),
      };

      setSubmitStage("Saving your profile...");
      await apiClient.post("/users/onboarding", payload);

      setSubmitStage("Finalizing your account...");
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

      succeeded = true;
      setIsLoading(false);
      setCurrentStep(4); // Success step
      router.refresh(); // Flush cache and re-read session cookie
      setTimeout(
        () => router.push("/dashboard/services?create=true&from=onboarding"),
        3000,
      );
    } catch (error: unknown) {
      console.error("Onboarding failed:", error);

      toast.error(getErrorMessage(error));
    } finally {
      if (!succeeded) setIsLoading(false);
      setSubmitStage("");
    }
  };

  // ─── Determine if we're on the final (complete) step ──
  const isFinalStep =
    (selectedRole === "CLIENT" && currentStep === 3) ||
    (selectedRole === "PROVIDER" && currentStep === 4);

  return (
    <OnboardingShell currentStep={currentStep} selectedRole={selectedRole}>
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
                ? "/dashboard/services?create=true&from=onboarding"
                : "/client/dashboard"
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
