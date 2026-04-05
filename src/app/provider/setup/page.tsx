"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import { hasRole } from "@/lib/auth/roles";
import {
  DEFAULT_PROVIDER_ONBOARDING_DATA,
  type ProviderOnboardingData,
} from "@/lib/onboarding/draft";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";
import StepProviderDetails from "@/app/onboarding/components/StepProviderDetails";
import StepVerification, {
  type VerificationResult,
} from "@/app/onboarding/components/StepVerification";
import {
  ArrowLeft,
  CheckCircle,
  Shield,
  Briefcase,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

export default function ProviderSetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";

  const [step, setStep] = useState(1); // 1 = details, 2 = verification, 3 = success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [providerData, setProviderData] = useState<ProviderOnboardingData>({
    ...DEFAULT_PROVIDER_ONBOARDING_DATA,
  });

  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        return response.data.data.filter((cat: Category) => cat.id !== "all");
      },
    });

  // Redirect guards
  useEffect(() => {
    if (isLoading) return;
    if (!session?.user) {
      router.push("/auth/login?callbackUrl=/provider/setup");
      return;
    }
    if (!session.user.onboardingCompleted) {
      router.push("/onboarding");
      return;
    }
    if (
      hasRole(session.user, "PROVIDER") &&
      session.user.providerSetupCompleted
    ) {
      router.push("/provider/setup/checklist");
      return;
    }
  }, [session, isLoading, router]);

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
        return { ok: false, normalizedPhone, message: "Phone number is required" };
      }
      if (!isValidKenyanPhone(normalizedPhone)) {
        return {
          ok: false,
          normalizedPhone,
          message: "Use a valid Kenyan phone number format.",
        };
      }
      try {
        const response = await apiClient.post(
          "/users/onboarding/validate-phone",
          { phone: normalizedPhone },
        );
        return {
          ok: Boolean(response?.data?.available),
          normalizedPhone: response?.data?.normalizedPhone || normalizedPhone,
          message: response?.data?.message,
        };
      } catch (error: unknown) {
        const known = error as {
          status?: number;
          data?: { error?: string; message?: string; normalizedPhone?: string };
        };
        return {
          ok: false,
          transientError:
            typeof known?.status !== "number" || known.status >= 500,
          normalizedPhone: known?.data?.normalizedPhone || normalizedPhone,
          message: known?.data?.error || "Unable to validate phone number.",
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

  const handleProviderDetailsNext = async () => {
    setStep(2);
  };

  const handleVerificationComplete = async (result: VerificationResult) => {
    setIsSubmitting(true);
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

      setSubmitStage("Activating provider mode...");
      const response = await fetch("/api/provider/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
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
          image: selfieUrl,
          idDocument: idDocumentUrl,
          faceMatchScore: result.faceMatchScore,
          idDocumentType: result.idDocumentType,
          manualReviewRequested: result.manualReviewRequested,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to activate provider mode");
      }

      // Update session with new role info
      await update({
        user: {
          ...session?.user,
          roles: data.roles,
          providerSetupCompleted: true,
          preferredWorkspace: "PROVIDER",
          image: selfieUrl || session?.user?.image,
        },
      });

      toast.success("Provider mode activated!");
      setStep(3);

      // Redirect to checklist after a brief pause
      setTimeout(() => {
        router.push("/provider/setup/checklist");
      }, 2000);
    } catch (error: unknown) {
      console.error("[PROVIDER_SETUP_ERROR]", error);
      const message =
        error instanceof Error ? error.message : "Provider activation failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      setSubmitStage("");
    }
  };

  if (isLoading || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/become-a-provider"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="font-bold text-gray-900 text-lg">
            Activate Provider Mode
          </h1>
          <div className="w-16" />
        </div>

        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: step > i ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className={step >= 1 ? "text-emerald-600 font-medium" : ""}>
              Provider Details
            </span>
            <span className={step >= 2 ? "text-emerald-600 font-medium" : ""}>
              Verification
            </span>
            <span className={step >= 3 ? "text-emerald-600 font-medium" : ""}>
              Complete
            </span>
          </div>
        </div>
      </header>

      {/* Reassurance Banner */}
      <div className="bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 text-sm text-emerald-800">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Your client account stays fully active. You&apos;re adding provider
            capabilities, not replacing anything.
          </span>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StepProviderDetails
                providerData={providerData}
                setProviderData={setProviderData}
                categories={categoriesData}
                isLoadingCategories={isLoadingCategories}
                onBack={() => router.push("/become-a-provider")}
                onNext={handleProviderDetailsNext}
                formatPhoneNumber={formatPhoneNumber}
                validatePhone={validatePhone}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <StepVerification
                onBack={() => setStep(1)}
                onNext={handleVerificationComplete}
                isSubmitting={isSubmitting}
                submitStage={submitStage}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Provider Mode Activated!
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You can now offer services, receive bookings, and earn on
                JustInTime. Redirecting to your setup checklist...
              </p>
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Redirecting...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
