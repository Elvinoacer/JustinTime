"use client";
import apiClient from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

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

export default function OnboardingPage() {
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
  });
  const [clientInterests, setClientInterests] = useState<string[]>([]);

  // Verification result (set by StepVerification)
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

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

      const role = session.user.role;
      const redirectPath =
        role === "PROVIDER" ? "/dashboard" : "/client/dashboard";
      router.push(redirectPath);
    }
  }, [session, router]);

  // Phone number formatter for Kenyan numbers
  const formatPhoneNumber = useCallback((input: string): string => {
    let cleaned = input.replace(/\D/g, "");
    if (cleaned.startsWith("254")) {
      return cleaned;
    } else if (cleaned.startsWith("0")) {
      return "254" + cleaned.substring(1);
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
      return "254" + cleaned;
    }
    return cleaned;
  }, []);

  // File upload helper
  const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/upload", { 
      method: "POST", 
      body: formData,
      credentials: "include" 
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
        : [...prev, interestId]
    );
  };

  // Client: Step 2 → Submit
  const handleClientSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        role: "CLIENT" as Role,
        onboardingCompleted: true,
        phone: clientData.phone,
        address: clientData.address,
        location: clientData.location,
        latitude: clientData.latitude,
        longitude: clientData.longitude,
        clientInterests,
      };

      setSubmitStage("Saving your profile...");
      await apiClient.post("/users/onboarding", payload);

      setSubmitStage("Finalizing your account...");
      await update({
        user: {
          role: "CLIENT",
          onboardingCompleted: true,
        },
      });

      // Show success step
      setIsLoading(false);
      setCurrentStep(3);
      router.refresh(); // Flush cache and re-read session cookie
      setTimeout(() => router.push("/client/dashboard"), 1800);
    } catch (error: any) {
      console.error("Onboarding failed:", error);
      
      // B3 Fix: Handle reshaped apiClient errors and raw Errors
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        "Onboarding failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setSubmitStage("");
    }
  };

  // Provider: Step 2 → Step 3 (verification)
  const handleProviderDetailsNext = () => {
    setCurrentStep(3);
  };

  // Provider: Step 3 → Submit
  const handleVerificationComplete = async (result: VerificationResult) => {
    setVerificationResult(result);
    setIsLoading(true);

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
        bio: providerData.bio,
        phone: providerData.phone,
        hourlyRate: providerData.hourlyRate
          ? Number(providerData.hourlyRate)
          : undefined,
        verificationStatus: "PENDING",
        idDocument: idDocumentUrl,
        faceMatchScore: result.faceMatchScore,
        idDocumentType: result.idDocumentType,
      };

      setSubmitStage("Saving your profile...");
      await apiClient.post("/users/onboarding", payload);

      setSubmitStage("Finalizing your account...");
      await update({
        user: {
          role: "PROVIDER",
          onboardingCompleted: true,
        },
      });

      setIsLoading(false);
      setCurrentStep(4); // Success step
      router.refresh(); // Flush cache and re-read session cookie
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (error: any) {
      console.error("Onboarding failed:", error);
      
      // B3 Fix: Handle reshaped apiClient errors and raw Errors
      const errorMessage =
        error?.message ||
        error?.data?.message ||
        "Onboarding failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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

        {isFinalStep && <StepComplete />}
      </AnimatePresence>
    </OnboardingShell>
  );
}
