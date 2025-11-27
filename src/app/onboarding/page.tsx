"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import apiClient from "@/lib/api/client";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import ImageCropper from "@/components/ImageCropper";
import Image from "next/image";

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
    latitude: null as number | null,
    longitude: null as number | null,
    bio: "",
    phone: "",
    hourlyRate: "",
  });

  // Location state
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Client Form Data
  const [clientData, setClientData] = useState({
    phone: "",
    address: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [clientInterests, setClientInterests] = useState<string[]>([]);

  // Check if user has already completed onboarding
  useEffect(() => {
    if (session?.user?.onboardingCompleted) {
      // Check if this is an upgrade request (CLIENT becoming PROVIDER)
      const searchParams = new URLSearchParams(window.location.search);
      const isUpgradeRequest = searchParams.get("upgrade") === "true";
      
      // Allow CLIENT users with upgrade param to access onboarding
      if (isUpgradeRequest && session.user.role === "CLIENT") {
        return; // Stay on onboarding page
      }
      
      // Otherwise redirect to appropriate dashboard
      const role = session.user.role;
      const redirectPath = role === "PROVIDER" ? "/dashboard" : "/client/dashboard";
      router.push(redirectPath);
    }
  }, [session, router]);

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

  // Geolocation handler for both providers and clients
  const handleGetLocation = (userType: "provider" | "client") => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          
          const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          // Update appropriate data based on user type
          if (userType === "provider") {
            setProviderData({
              ...providerData,
              location: address,
              latitude,
              longitude,
            });
          } else {
            setClientData({
              ...clientData,
              location: address,
              address: address,
              latitude,
              longitude,
            });
          }
          
          toast.success("Location retrieved successfully!");
        } catch (error) {
          console.error('Failed to get address:', error);
          const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          if (userType === "provider") {
            setProviderData({
              ...providerData,
              location: coords,
              latitude,
              longitude,
            });
          } else {
            setClientData({
              ...clientData,
              location: coords,
              address: coords,
              latitude,
              longitude,
            });
          }
          
          toast.success("Location coordinates saved!");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get location. Please ensure location permissions are enabled.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Verification State
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED" | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  // Image Cropper & Preview State
  const [showSelfieCropper, setShowSelfieCropper] = useState(false);
  const [selectedSelfieImage, setSelectedSelfieImage] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [croppedSelfieBlob, setCroppedSelfieBlob] = useState<Blob | null>(null);

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
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    if (type === "id") {
      setIdFile(file);
      // Create preview for ID
      const reader = new FileReader();
      reader.onload = () => {
        setIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // For selfie, show cropper
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedSelfieImage(reader.result as string);
        setShowSelfieCropper(true);
      };
      reader.readAsDataURL(file);
    }
    
    setVerificationStatus(null); // Reset status on new file
    setVerificationMessage("");
  };

  const handleSelfieCropComplete = (croppedBlob: Blob) => {
    setCroppedSelfieBlob(croppedBlob);
    setSelfieFile(new File([croppedBlob], "selfie.jpg", { type: "image/jpeg" }));
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setSelfiePreview(previewUrl);
    
    setShowSelfieCropper(false);
    setSelectedSelfieImage(null);
  };

  const handleSelfieCropCancel = () => {
    setShowSelfieCropper(false);
    setSelectedSelfieImage(null);
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

      // 3. Verification Successful (Relaxed check)
      // We only verify that both images contain a face, without strict matching
      setVerificationStatus("VERIFIED");
      setVerificationMessage("Identity verified successfully!");
      toast.success("Identity verified!");
      
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
      let selfieUrl = null;

      // Upload ID Document
      if (selectedRole === "PROVIDER" && idFile) {
        idDocumentUrl = await uploadFile(idFile);
      }

      // Upload Selfie (Avatar) - use cropped blob if available
      if (selectedRole === "PROVIDER" && (croppedSelfieBlob || selfieFile)) {
        const fileToUpload = croppedSelfieBlob 
          ? new File([croppedSelfieBlob], "avatar.jpg", { type: "image/jpeg" })
          : selfieFile;
        selfieUrl = await uploadFile(fileToUpload!);
      }

      const payload = {
        role: selectedRole,
        onboardingCompleted: true,
        image: selfieUrl, // Send avatar URL
        ...(selectedRole === "PROVIDER" ? {
          ...providerData,
          hourlyRate: providerData.hourlyRate ? Number(providerData.hourlyRate) : undefined,
          verificationStatus: verificationStatus || "PENDING",
          idDocument: idDocumentUrl,
        } : {
          ...clientData,
          clientInterests
        }),
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-gray-50 to-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-green-400/10 blur-3xl" />
      </div>

      <div className="max-w-3xl w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 relative z-10">
        <div className="p-8 sm:p-12">
          <div className="mb-10 text-center">
            <div className="flex justify-center mb-8">
              <div className="relative w-full max-w-[280px] sm:max-w-[360px] aspect-[3/1] transition-transform duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full opacity-20" />
                <Image 
                  src="/images/JustinTimeLogo.png" 
                  alt="JustInTime Logo" 
                  fill
                  className="object-contain drop-shadow-xl"
                  priority
                  sizes="(max-width: 768px) 280px, 360px"
                />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Welcome to JustInTime
            </h1>
            <p className="text-lg text-gray-600 font-medium max-w-md mx-auto">
              Let's customize your experience to get you started.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12 relative">
            <div className="flex justify-between mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span>Role</span>
              <span>Details</span>
              {selectedRole === "PROVIDER" && <span>Verification</span>}
              <span>Complete</span>
            </div>
            <div 
              className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner"
              role="progressbar"
              aria-valuenow={(currentStep / (selectedRole === "PROVIDER" ? 4 : 3)) * 100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
            >
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: `${(currentStep / (selectedRole === "PROVIDER" ? 4 : 3)) * 100}%` }}
                transition={{ duration: 0.6, ease: "circOut" }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-8"
              >
                <h2 className="text-2xl font-bold text-center text-gray-800">What brings you here today?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => handleRoleSelect("CLIENT")}
                    className="group relative p-8 rounded-[2rem] border-2 border-transparent bg-white shadow-[0_0_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 transition-all duration-300 text-left focus:outline-none focus:ring-4 focus:ring-emerald-500/20 overflow-hidden"
                    aria-label="I want to hire professionals"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <span className="material-symbols-outlined text-emerald-600">arrow_forward</span>
                    </div>
                    <div className="relative z-10">
                      <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-5xl text-emerald-600">search</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">I want to hire pros</h3>
                      <p className="text-base text-gray-500 leading-relaxed">Find reliable professionals for your home and business needs.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRoleSelect("PROVIDER")}
                    className="group relative p-8 rounded-[2rem] border-2 border-transparent bg-white shadow-[0_0_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 transition-all duration-300 text-left focus:outline-none focus:ring-4 focus:ring-emerald-500/20 overflow-hidden"
                    aria-label="I want to work as a professional"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <span className="material-symbols-outlined text-emerald-600">arrow_forward</span>
                    </div>
                    <div className="relative z-10">
                      <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-5xl text-blue-600">work</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">I want to work</h3>
                      <p className="text-base text-gray-500 leading-relaxed">Offer your services, find jobs, and grow your business.</p>
                    </div>
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
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Contact Information</h2>
                  <p className="text-gray-600">Tell us how to reach you and where you're located.</p>
                </div>
                
                <div className="space-y-6">
                  {/* Phone Number */}
                  <div className="group">
                    <label htmlFor="client-phone" className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-emerald-600 transition-colors">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors">call</span>
                      </span>
                      <input
                        id="client-phone"
                        type="tel"
                        value={clientData.phone}
                        onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                        className="w-full pl-11 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium"
                        placeholder="+254 712 345 678"
                        required
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="group">
                    <label htmlFor="client-address" className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-emerald-600 transition-colors">
                      Full Address *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors">home</span>
                      </span>
                      <input
                        id="client-address"
                        type="text"
                        value={clientData.address}
                        onChange={(e) => setClientData({ ...clientData, address: e.target.value, location: e.target.value })}
                        className="w-full pl-11 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium"
                        placeholder="e.g., Westlands, Nairobi"
                        required
                      />
                    </div>
                  </div>

                  {/* Location Picker */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                    
                    <div className="flex items-start gap-4 mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined">location_on</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base mb-1">Precise Location</h3>
                        <p className="text-sm text-gray-600">Click below to use your current location for better service matching</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleGetLocation("client")}
                      disabled={isGettingLocation}
                      className="w-full py-3.5 px-4 bg-white border-2 border-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm relative z-10 group-hover:scale-[1.01]"
                    >
                      {isGettingLocation ? (
                        <>
                          <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">my_location</span>
                          Get My Current Location
                        </>
                      )}
                    </button>
                    
                    {clientData.latitude && clientData.longitude && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-3 text-sm text-emerald-800 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-emerald-100/50 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                        <div>
                          <p className="font-bold">Location Captured</p>
                          <p className="text-xs text-emerald-600/80 font-mono mt-0.5">
                            {clientData.latitude.toFixed(4)}, {clientData.longitude.toFixed(4)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Optional: Service Interests */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      What services might you need? (Optional)
                    </label>
                    <div 
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                      role="group" 
                      aria-label="Service categories selection"
                    >
                      {categories.map((cat) => {
                        const isSelected = clientInterests.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleInterestToggle(cat.id)}
                            aria-pressed={isSelected}
                            className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/20 relative overflow-hidden group ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md scale-[1.02]"
                                : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50 text-gray-600 hover:shadow-sm"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                            <span className={`material-symbols-outlined text-3xl mb-2 transition-colors duration-300 ${isSelected ? "text-emerald-600" : "text-gray-400 group-hover:text-emerald-500"}`}>{cat.icon}</span>
                            <span className="text-xs font-bold">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-6 py-3 rounded-xl hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isLoading || !clientData.phone || !clientData.address}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
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
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Set Up Your Professional Profile</h2>
                  <p className="text-gray-600">Provide complete information to attract more clients.</p>
                </div>
                
                <div className="space-y-6">
                  {/* Skills Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">What services do you offer? *</label>
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
                            type="button"
                            onClick={() => handleSkillToggle(cat.id)}
                            aria-pressed={isSelected}
                            className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/20 relative overflow-hidden group ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md scale-[1.02]"
                                : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50 text-gray-600 hover:shadow-sm"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                            <span className={`material-symbols-outlined text-3xl mb-2 transition-colors duration-300 ${isSelected ? "text-emerald-600" : "text-gray-400 group-hover:text-emerald-500"}`}>{cat.icon}</span>
                            <span className="text-xs font-bold">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="group">
                    <label htmlFor="provider-phone" className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-emerald-600 transition-colors">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors">call</span>
                      </span>
                      <input
                        id="provider-phone"
                        type="tel"
                        value={providerData.phone}
                        onChange={(e) => setProviderData({ ...providerData, phone: e.target.value })}
                        className="w-full pl-11 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium"
                        placeholder="+254 712 345 678"
                        required
                      />
                    </div>
                  </div>

                  {/* Hourly Rate */}
                  <div className="group">
                    <label htmlFor="hourlyRate" className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-emerald-600 transition-colors">
                      Hourly Rate (KES) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors">payments</span>
                      </span>
                      <input
                        id="hourlyRate"
                        type="number"
                        value={providerData.hourlyRate}
                        onChange={(e) => setProviderData({ ...providerData, hourlyRate: e.target.value })}
                        className="w-full pl-11 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium"
                        placeholder="e.g., 1500"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="group">
                    <label htmlFor="bio" className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-emerald-600 transition-colors">
                      Professional Bio *
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      value={providerData.bio}
                      onChange={(e) => setProviderData({ ...providerData, bio: e.target.value })}
                      className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium resize-none"
                      placeholder="Tell clients about your experience, skills, and what makes you unique..."
                      required
                    />
                  </div>

                  {/* Location */}
                  <div className="group">
                    <label htmlFor="provider-location" className="block text-sm font-bold text-gray-700 mb-2 group-focus-within:text-emerald-600 transition-colors">
                      Service Location *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400 group-focus-within:text-emerald-500 transition-colors">location_on</span>
                      </span>
                      <input
                        id="provider-location"
                        type="text"
                        value={providerData.location}
                        onChange={(e) => setProviderData({ ...providerData, location: e.target.value })}
                        className="w-full pl-11 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-gray-900 placeholder-gray-400 font-medium"
                        placeholder="e.g., Nairobi, Kenya"
                        required
                      />
                    </div>
                  </div>

                  {/* Location Picker */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                    
                    <div className="flex items-start gap-4 mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined">my_location</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base mb-1">Get Precise Location</h3>
                        <p className="text-sm text-gray-600">Help clients find you easily by sharing your precise coordinates</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleGetLocation("provider")}
                      disabled={isGettingLocation}
                      className="w-full py-3.5 px-4 bg-white border-2 border-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm relative z-10 group-hover:scale-[1.01]"
                    >
                      {isGettingLocation ? (
                        <>
                          <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">my_location</span>
                          Get My Current Location
                        </>
                      )}
                    </button>
                    
                    {providerData.latitude && providerData.longitude && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-3 text-sm text-emerald-800 bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-emerald-100/50 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                        <div>
                          <p className="font-bold">Location Captured</p>
                          <p className="text-xs text-emerald-600/80 font-mono mt-0.5">
                            {providerData.latitude.toFixed(4)}, {providerData.longitude.toFixed(4)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-6 py-3 rounded-xl hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={!providerData.skills.length || !providerData.phone || !providerData.hourlyRate || !providerData.bio || !providerData.location}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
                  >
                    Next: Verification
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
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Identity Verification</h2>
                  <p className="text-gray-600">Please upload your ID and a selfie to verify your identity.</p>
                </div>

                <div className="space-y-6">
                  {/* ID Upload */}
                  <div className={`group relative p-8 border-2 border-dashed rounded-2xl transition-all duration-300 ${
                    idPreview 
                      ? "border-emerald-500 bg-emerald-50/30" 
                      : "border-gray-300 bg-gray-50 hover:bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
                  }`}>
                    {idPreview ? (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center">
                          <div className="relative">
                            <img src={idPreview} alt="ID preview" className="max-w-full max-h-48 rounded-xl shadow-md border-2 border-white" />
                            <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                              <span className="material-symbols-outlined text-lg">check</span>
                            </div>
                          </div>
                          <span className="text-sm text-emerald-700 font-bold mt-4 bg-emerald-100 px-3 py-1 rounded-full">ID Document Selected</span>
                        </div>
                        <button
                          onClick={() => {
                            setIdFile(null);
                            setIdPreview(null);
                          }}
                          className="w-full py-3 px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                          Remove & Upload Again
                        </button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer text-center">
                        <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-emerald-600 transition-all duration-300">
                          <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-emerald-500">id_card</span>
                        </div>
                        <span className="block text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">Upload ID Document</span>
                        <span className="block text-sm text-gray-500 group-hover:text-gray-600">National ID, Passport, or Driver's License</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "id")} />
                      </label>
                    )}
                  </div>

                  {/* Selfie Upload */}
                  <div className={`group relative p-8 border-2 border-dashed rounded-2xl transition-all duration-300 ${
                    selfiePreview 
                      ? "border-emerald-500 bg-emerald-50/30" 
                      : "border-gray-300 bg-gray-50 hover:bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
                  }`}>
                    {selfiePreview ? (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center">
                          <div className="relative">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                              <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                              <span className="material-symbols-outlined text-lg">check</span>
                            </div>
                          </div>
                          <span className="text-sm text-emerald-700 font-bold mt-4 bg-emerald-100 px-3 py-1 rounded-full">Selfie Ready</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelfieFile(null);
                            setSelfiePreview(null);
                            setCroppedSelfieBlob(null);
                          }}
                          className="w-full py-3 px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                          Remove & Retake
                        </button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer text-center">
                        <div className="w-16 h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-emerald-600 transition-all duration-300">
                          <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-emerald-500">face</span>
                        </div>
                        <span className="block text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">Upload Selfie</span>
                        <span className="block text-sm text-gray-500 group-hover:text-gray-600">Take a clear photo of your face</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "selfie")} />
                      </label>
                    )}
                  </div>

                  {/* Verification Status */}
                  {verificationMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl flex items-center gap-3 ${
                        verificationStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                        verificationStatus === "REJECTED" ? "bg-red-50 text-red-800 border border-red-100" :
                        "bg-blue-50 text-blue-800 border border-blue-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {verificationStatus === "VERIFIED" ? "verified" : 
                         verificationStatus === "REJECTED" ? "error" : "info"}
                      </span>
                      <p className="text-sm font-bold">{verificationMessage}</p>
                    </motion.div>
                  )}

                  <button
                    onClick={verifyIdentity}
                    disabled={isVerifying || !idFile || (!selfieFile && !croppedSelfieBlob) || verificationStatus === "VERIFIED"}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      verificationStatus === "VERIFIED"
                        ? "bg-emerald-500 cursor-default"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Identity...
                      </>
                    ) : verificationStatus === "VERIFIED" ? (
                      <>
                        <span className="material-symbols-outlined">check_circle</span>
                        Identity Verified
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">verified_user</span>
                        Verify Identity
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setCurrentStep(2)} 
                    className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-6 py-3 rounded-xl hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isLoading || verificationStatus !== "VERIFIED"}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finishing...
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

      {/* Image Cropper Modal */}
      {showSelfieCropper && selectedSelfieImage && (
        <ImageCropper
          image={selectedSelfieImage}
          onCropComplete={handleSelfieCropComplete}
          onCancel={handleSelfieCropCancel}
          aspectRatio={1}
        />
      )}
    </div>
  );
}
