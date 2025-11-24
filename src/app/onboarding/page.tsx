"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/api/client";
import * as faceapi from "face-api.js";
import { toast } from "sonner";

type Role = "CLIENT" | "PROVIDER";

const categories = [
  { id: "plumbing", label: "Plumbing", icon: "plumbing" },
  { id: "electrical", label: "Electrical", icon: "bolt" },
  { id: "cleaning", label: "Cleaning", icon: "cleaning_services" },
  { id: "gardening", label: "Gardening", icon: "yard" },
  { id: "painting", label: "Painting", icon: "format_paint" },
  { id: "moving", label: "Moving", icon: "local_shipping" },
  { id: "other", label: "Other", icon: "more_horiz" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Provider Form Data
  const [providerData, setProviderData] = useState({
    skills: [] as string[],
    location: "",
    bio: "",
  });

  // Client Form Data
  const [clientInterests, setClientInterests] = useState<string[]>([]);

  // Verification State
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED" | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load face-api models", error);
        toast.error("Failed to load verification system. Please refresh.");
      }
    };
    loadModels();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setCurrentStep(2);
  };

  const handleInterestToggle = (interestId: string) => {
    setClientInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSkillToggle = (skillId: string) => {
    setProviderData(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId) 
        ? prev.skills.filter(id => id !== skillId)
        : [...prev.skills, skillId]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "id" | "selfie") => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "id") setIdFile(file);
      else setSelfieFile(file);
      setVerificationStatus(null); // Reset status on new file
      setVerificationMessage("");
    }
  };

  const verifyIdentity = async () => {
    if (!idFile || !selfieFile) {
      toast.error("Please upload both ID and Selfie");
      return;
    }
    if (!modelsLoaded) {
      toast.error("Verification system is still loading...");
      return;
    }

    setIsVerifying(true);
    setVerificationMessage("Analyzing images...");

    try {
      // 1. Detect face in ID
      const idImage = await faceapi.bufferToImage(idFile);
      const idDetection = await faceapi.detectSingleFace(idImage).withFaceLandmarks().withFaceDescriptor();

      if (!idDetection) {
        setVerificationStatus("REJECTED");
        setVerificationMessage("No face detected in ID document. Please use a clearer photo.");
        toast.error("No face detected in ID");
        setIsVerifying(false);
        return;
      }

      // 2. Detect face in Selfie
      const selfieImage = await faceapi.bufferToImage(selfieFile);
      const selfieDetection = await faceapi.detectSingleFace(selfieImage).withFaceLandmarks().withFaceDescriptor();

      if (!selfieDetection) {
        setVerificationStatus("REJECTED");
        setVerificationMessage("No face detected in selfie. Please ensure good lighting.");
        toast.error("No face detected in selfie");
        setIsVerifying(false);
        return;
      }

      // 3. Compare faces
      const distance = faceapi.euclideanDistance(idDetection.descriptor, selfieDetection.descriptor);
      const threshold = 0.6; // Typical threshold for face matching

      if (distance < threshold) {
        setVerificationStatus("VERIFIED");
        setVerificationMessage("Identity verified successfully!");
        toast.success("Identity verified!");
      } else {
        setVerificationStatus("REJECTED");
        setVerificationMessage("Faces do not match. Please try again.");
        toast.error("Identity verification failed: Faces do not match");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus("REJECTED");
      setVerificationMessage("An error occurred during verification.");
      toast.error("Verification error");
    } finally {
      setIsVerifying(false);
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  };

  const handleComplete = async () => {
    if (selectedRole === "PROVIDER" && currentStep === 2) {
      // Move to verification step
      setCurrentStep(3);
      return;
    }

    if (selectedRole === "PROVIDER" && currentStep === 3 && verificationStatus !== "VERIFIED") {
      toast.error("Please complete identity verification to proceed.");
      return;
    }

    setIsLoading(true);
    try {
      let idDocumentUrl = null;
      if (selectedRole === "PROVIDER" && idFile) {
        idDocumentUrl = await uploadFile(idFile);
      }

      const payload = {
        role: selectedRole,
        onboardingCompleted: true,
        ...(selectedRole === "PROVIDER" ? {
          ...providerData,
          verificationStatus: verificationStatus || "PENDING",
          idDocument: idDocumentUrl,
        } : { clientInterests }),
      };

      await apiClient.post("/users/onboarding", payload);
      
      // Update session to reflect new role and onboarding status
      await update({
        ...session,
        user: {
          ...session?.user,
          role: selectedRole,
          onboardingCompleted: true,
        },
      });

      setCurrentStep(4); // Success step
      setTimeout(() => {
        router.push(selectedRole === "PROVIDER" ? "/dashboard" : "/client/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Onboarding failed:", error);
      toast.error("Onboarding failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-8 sm:p-12">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Welcome to JustInTime
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              Let's customize your experience.
            </p>
          </div>

          {/* Progress Bar */}
          <div 
            className="mb-10 relative h-2 bg-gray-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={(currentStep / (selectedRole === "PROVIDER" ? 4 : 3)) * 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Onboarding progress"
          >
            <motion.div 
              className="absolute top-0 left-0 h-full bg-emerald-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / (selectedRole === "PROVIDER" ? 4 : 3)) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <h2 className="text-2xl font-bold text-center text-gray-900">What brings you here today?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => handleRoleSelect("CLIENT")}
                    className="group relative p-8 rounded-2xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-300 text-left focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                    aria-label="I want to hire professionals"
                  >
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                    <span className="material-symbols-outlined text-5xl text-gray-400 group-hover:text-emerald-600 mb-6 transition-colors">search</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">I want to hire pros</h3>
                    <p className="text-base text-gray-600 leading-relaxed">Find reliable professionals for your home and business needs.</p>
                  </button>

                  <button
                    onClick={() => handleRoleSelect("PROVIDER")}
                    className="group relative p-8 rounded-2xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-300 text-left focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                    aria-label="I want to work as a professional"
                  >
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                    <span className="material-symbols-outlined text-5xl text-gray-400 group-hover:text-emerald-600 mb-6 transition-colors">work</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">I want to work</h3>
                    <p className="text-base text-gray-600 leading-relaxed">Offer your services, find jobs, and grow your business.</p>
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && selectedRole === "CLIENT" && (
              <motion.div
                key="step2-client"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">What services do you need?</h2>
                  <p className="text-gray-600">Select all that apply to get personalized recommendations.</p>
                </div>
                
                <div 
                  className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                  role="group" 
                  aria-label="Service categories selection"
                >
                  {categories.map((cat) => {
                    const isSelected = clientInterests.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleInterestToggle(cat.id)}
                        aria-pressed={isSelected}
                        className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                            : "border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className={`material-symbols-outlined text-3xl mb-3 ${isSelected ? "text-emerald-600" : "text-gray-500"}`}>{cat.icon}</span>
                        <span className="text-sm font-bold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="text-gray-600 font-semibold hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && selectedRole === "PROVIDER" && (
              <motion.div
                key="step2-provider"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Tell us about your work</h2>
                  <p className="text-gray-600">Help clients find you by setting up your profile.</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">What services do you offer?</label>
                    <div 
                      className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                      role="group"
                      aria-label="Service skills selection"
                    >
                      {categories.map((cat) => {
                        const isSelected = providerData.skills.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleSkillToggle(cat.id)}
                            aria-pressed={isSelected}
                            className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                                : "border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <span className={`material-symbols-outlined text-3xl mb-3 ${isSelected ? "text-emerald-600" : "text-gray-500"}`}>{cat.icon}</span>
                            <span className="text-xs font-bold">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-bold text-gray-900 mb-2">Where are you located?</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400">location_on</span>
                      </span>
                      <input
                        id="location"
                        type="text"
                        value={providerData.location}
                        onChange={(e) => setProviderData({ ...providerData, location: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                        placeholder="e.g. Nairobi, Kenya"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="text-gray-600 font-semibold hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2"
                  >
                    Next Step
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && selectedRole === "PROVIDER" && (
              <motion.div
                key="step3-verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Identity Verification</h2>
                  <p className="text-gray-600">Please upload your ID and a selfie to verify your identity.</p>
                </div>

                <div className="space-y-6">
                  {/* ID Upload */}
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <label className="block cursor-pointer">
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">id_card</span>
                        <span className="text-sm font-bold text-gray-700">Upload ID Document</span>
                        <span className="text-xs text-gray-500 mt-1">National ID, Passport, or Driver's License</span>
                        {idFile && <span className="text-xs text-emerald-600 font-bold mt-2">Selected: {idFile.name}</span>}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "id")} />
                    </label>
                  </div>

                  {/* Selfie Upload */}
                  <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <label className="block cursor-pointer">
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">face</span>
                        <span className="text-sm font-bold text-gray-700">Upload Selfie</span>
                        <span className="text-xs text-gray-500 mt-1">Take a clear photo of your face</span>
                        {selfieFile && <span className="text-xs text-emerald-600 font-bold mt-2">Selected: {selfieFile.name}</span>}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "selfie")} />
                    </label>
                  </div>

                  {/* Verification Status */}
                  {verificationMessage && (
                    <div className={`p-4 rounded-xl ${
                      verificationStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-800" :
                      verificationStatus === "REJECTED" ? "bg-red-50 text-red-800" :
                      "bg-blue-50 text-blue-800"
                    }`}>
                      <p className="text-sm font-bold text-center">{verificationMessage}</p>
                    </div>
                  )}

                  <button
                    onClick={verifyIdentity}
                    disabled={isVerifying || !idFile || !selfieFile || verificationStatus === "VERIFIED"}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? "Verifying..." : verificationStatus === "VERIFIED" ? "Verified" : "Verify Identity"}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentStep(2)} 
                    className="text-gray-600 font-semibold hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isLoading || verificationStatus !== "VERIFIED"}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <span className="material-symbols-outlined text-5xl text-emerald-600">check_circle</span>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">All Set!</h2>
                <p className="text-lg text-gray-600">Redirecting you to your dashboard...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
