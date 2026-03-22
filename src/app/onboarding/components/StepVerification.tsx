"use client";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import ImageCropper from "@/components/ImageCropper";
import CameraCapture from "./CameraCapture";

type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | null;

interface StepVerificationProps {
  onBack: () => void;
  onNext: (data: VerificationResult) => void;
  isSubmitting: boolean;
  submitStage?: string;
}

export interface VerificationResult {
  idFile: File;
  selfieFile: File;
  croppedSelfieBlob: Blob | null;
  faceMatchScore: number;
  idDocumentType: string;
  verificationStatus: "VERIFIED";
}

export default function StepVerification({
  onBack,
  onNext,
  isSubmitting,
  submitStage,
}: StepVerificationProps) {
  // Models
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Files
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [croppedSelfieBlob, setCroppedSelfieBlob] = useState<Blob | null>(null);

  // Previews
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  // Cropper state
  const [showSelfieCropper, setShowSelfieCropper] = useState(false);
  const [selectedSelfieImage, setSelectedSelfieImage] = useState<string | null>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState<"id" | "selfie" | null>(null);

  // Verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [faceMatchScore, setFaceMatchScore] = useState<number | null>(null);

  // Load face-api models
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

  // File handling
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "selfie"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    if (type === "id") {
      setIdFile(file);
      const reader = new FileReader();
      reader.onload = () => setIdPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedSelfieImage(reader.result as string);
        setShowSelfieCropper(true);
      };
      reader.readAsDataURL(file);
    }

    setVerificationStatus(null);
    setVerificationMessage("");
    setFaceMatchScore(null);
  };

  const handleSelfieCropComplete = (croppedBlob: Blob) => {
    setCroppedSelfieBlob(croppedBlob);
    setSelfieFile(new File([croppedBlob], "selfie.jpg", { type: "image/jpeg" }));
    const previewUrl = URL.createObjectURL(croppedBlob);
    setSelfiePreview(previewUrl);
    setShowSelfieCropper(false);
    setSelectedSelfieImage(null);
  };

  const handleSelfieCropCancel = () => {
    setShowSelfieCropper(false);
    setSelectedSelfieImage(null);
  };

  // Camera capture handlers
  const handleCameraCapture = (blob: Blob, type: "id" | "selfie") => {
    const file = new File([blob], `${type}.jpg`, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(blob);

    if (type === "id") {
      setIdFile(file);
      setIdPreview(previewUrl);
    } else {
      setCroppedSelfieBlob(blob);
      setSelfieFile(file);
      setSelfiePreview(previewUrl);
    }

    setShowCamera(null);
    setVerificationStatus(null);
    setVerificationMessage("");
    setFaceMatchScore(null);
  };

  // Core verification with face matching
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
    setVerificationMessage("Analyzing ID document...");

    try {
      // 1. Detect face in ID
      const idImage = await faceapi.bufferToImage(idFile);
      const idDetection = await faceapi
        .detectSingleFace(idImage)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!idDetection) {
        setVerificationStatus("REJECTED");
        setVerificationMessage(
          "No face detected in ID document. Please use a clearer photo."
        );
        toast.error("No face detected in ID");
        setIsVerifying(false);
        return;
      }

      // 2. Detect face in Selfie
      setVerificationMessage("Analyzing selfie...");
      const selfieImage = await faceapi.bufferToImage(selfieFile);
      const selfieDetection = await faceapi
        .detectSingleFace(selfieImage)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!selfieDetection) {
        setVerificationStatus("REJECTED");
        setVerificationMessage(
          "No face detected in selfie. Please ensure good lighting."
        );
        toast.error("No face detected in selfie");
        setIsVerifying(false);
        return;
      }

      // 3. Compare faces using euclidean distance
      setVerificationMessage("Comparing faces...");
      const distance = faceapi.euclideanDistance(
        idDetection.descriptor,
        selfieDetection.descriptor
      );

      // Lower distance = more similar. 0.72 threshold is lenient for aged ID photos
      const MATCH_THRESHOLD = 0.72;
      const score = Math.max(0, ((1 - distance) * 100));
      setFaceMatchScore(score);

      if (distance > MATCH_THRESHOLD) {
        setVerificationStatus("REJECTED");
        setVerificationMessage(
          `Face match score: ${score.toFixed(0)}%. The faces in the ID and selfie don't appear to match. Please ensure both images are of the same person.`
        );
        toast.error("Face match failed — photos don't match");
        setIsVerifying(false);
        return;
      }

      // 4. Success
      setVerificationStatus("VERIFIED");
      setVerificationMessage(
        `Identity verified! Face match score: ${score.toFixed(0)}%`
      );
      toast.success(`Identity verified! Match: ${score.toFixed(0)}%`);
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus("REJECTED");
      setVerificationMessage("An error occurred during verification.");
      toast.error("Verification error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNext = () => {
    if (
      verificationStatus !== "VERIFIED" ||
      !idFile ||
      !selfieFile ||
      faceMatchScore === null
    ) {
      toast.error("Please complete identity verification.");
      return;
    }

    onNext({
      idFile,
      selfieFile,
      croppedSelfieBlob,
      faceMatchScore,
      idDocumentType: "unknown",
      verificationStatus: "VERIFIED",
    });
  };

  return (
    <>
      <motion.div
        key="step3-verification"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-4 sm:space-y-6 md:space-y-8"
      >
        <div className="text-center">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
            Identity Verification
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Upload your ID and a selfie. We&apos;ll match the faces to verify your identity.
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Two-column upload section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* ID Upload */}
            <div
              className={`group relative p-4 sm:p-6 md:p-8 border-2 border-dashed rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 ${
                idPreview
                  ? "border-emerald-500 bg-emerald-50/30"
                  : "border-gray-300 bg-gray-50 hover:bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
              }`}
            >
              {idPreview ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img
                        src={idPreview}
                        alt="ID preview"
                        className="max-w-full max-h-32 sm:max-h-40 md:max-h-48 rounded-lg sm:rounded-xl border-2 border-white"
                      />
                      <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 bg-emerald-500 text-white p-1 sm:p-1.5 rounded-full shadow-lg">
                        <span className="material-symbols-outlined text-sm sm:text-base md:text-lg">check</span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-emerald-700 font-bold mt-3 sm:mt-4 bg-emerald-100 px-2 sm:px-3 py-1 rounded-full">
                      ID Document Selected
                    </span>
                  </div>
                  <button
                    onClick={() => { setIdFile(null); setIdPreview(null); }}
                    className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-lg sm:rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base">delete</span>
                    Remove & Upload Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px] gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <span className="material-symbols-outlined text-2xl md:text-3xl text-gray-400 group-hover:text-emerald-500">id_card</span>
                  </div>
                  <span className="block text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    ID Document
                  </span>
                  <span className="block text-xs sm:text-sm text-gray-500 text-center">
                    National ID, Passport, or Driver&apos;s License
                  </span>
                  <div className="flex gap-2 mt-2">
                    <label className="cursor-pointer px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 border border-emerald-200">
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "id")} />
                    </label>
                    <button
                      onClick={() => setShowCamera("id")}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-200"
                    >
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selfie Upload */}
            <div
              className={`group relative p-4 sm:p-6 md:p-8 border-2 border-dashed rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 ${
                selfiePreview
                  ? "border-emerald-500 bg-emerald-50/30"
                  : "border-gray-300 bg-gray-50 hover:bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
              }`}
            >
              {selfiePreview ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-3 sm:border-4 border-white shadow-lg">
                        <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 sm:p-1.5 rounded-full shadow-lg border-2 border-white">
                        <span className="material-symbols-outlined text-sm sm:text-base md:text-lg">check</span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-emerald-700 font-bold mt-3 sm:mt-4 bg-emerald-100 px-2 sm:px-3 py-1 rounded-full">
                      Selfie Ready
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelfieFile(null);
                      setSelfiePreview(null);
                      setCroppedSelfieBlob(null);
                    }}
                    className="w-full py-2 sm:py-3 px-3 sm:px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-lg sm:rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <span className="material-symbols-outlined text-sm sm:text-base">delete</span>
                    Remove & Retake
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px] gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <span className="material-symbols-outlined text-2xl md:text-3xl text-gray-400 group-hover:text-emerald-500">face</span>
                  </div>
                  <span className="block text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    Selfie Photo
                  </span>
                  <span className="block text-xs sm:text-sm text-gray-500 text-center">
                    Take a clear photo of your face
                  </span>
                  <div className="flex gap-2 mt-2">
                    <label className="cursor-pointer px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 border border-emerald-200">
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "selfie")} />
                    </label>
                    <button
                      onClick={() => setShowCamera("selfie")}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-200"
                    >
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Face Match Score visualization */}
          {faceMatchScore !== null && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 sm:p-4 rounded-xl border ${
                verificationStatus === "VERIFIED"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`material-symbols-outlined text-xl ${
                    verificationStatus === "VERIFIED" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {verificationStatus === "VERIFIED" ? "verified" : "error"}
                </span>
                <span className="text-sm font-bold text-gray-800">
                  {verificationStatus === "VERIFIED"
                    ? "Identity Verified"
                    : "Verification Failed"}
                </span>
              </div>
              {/* Match bar */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${faceMatchScore}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    faceMatchScore >= 28 ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </div>
              <p className="text-xs mt-1.5 text-gray-600">
                Match accuracy: <span className="font-bold">
                  {faceMatchScore >= 60 ? "Excellent" 
                    : faceMatchScore >= 45 ? "Good" 
                    : faceMatchScore >= 28 ? "Acceptable" 
                    : "Mismatch detected"}
                </span>
                {faceMatchScore >= 28 ? " ✓ Verified" : " ✗ Below threshold"}
              </p>
            </motion.div>
          )}

          {/* Verification Status */}
          {verificationMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 ${
                verificationStatus === "VERIFIED"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : verificationStatus === "REJECTED"
                  ? "bg-red-50 text-red-800 border border-red-100"
                  : "bg-blue-50 text-blue-800 border border-blue-100"
              }`}
            >
              <span className="material-symbols-outlined text-lg sm:text-xl">
                {verificationStatus === "VERIFIED"
                  ? "verified"
                  : verificationStatus === "REJECTED"
                  ? "error"
                  : "info"}
              </span>
              <p className="text-xs sm:text-sm font-bold">{verificationMessage}</p>
            </motion.div>
          )}

          {/* Verify Button */}
          <button
            onClick={verifyIdentity}
            disabled={
              isVerifying ||
              !idFile ||
              (!selfieFile && !croppedSelfieBlob) ||
              verificationStatus === "VERIFIED"
            }
            className={`w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 min-h-[44px] ${
              verificationStatus === "VERIFIED"
                ? "bg-emerald-500 cursor-default"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            }`}
          >
            {isVerifying ? (
              <>
                <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {verificationMessage || "Verifying..."}
              </>
            ) : verificationStatus === "VERIFIED" ? (
              <>
                <span className="material-symbols-outlined text-sm sm:text-base">check_circle</span>
                <span className="hidden sm:inline">Identity Verified</span>
                <span className="inline sm:hidden">Verified</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm sm:text-base">verified_user</span>
                <span className="hidden sm:inline">Verify Identity</span>
                <span className="inline sm:hidden">Verify</span>
              </>
            )}
          </button>
        </div>

        <div className="flex justify-between items-center pt-4 sm:pt-6 md:pt-8 border-t border-gray-100">
          <button
            onClick={onBack}
            className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-100 text-sm sm:text-base min-h-[44px]"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={isSubmitting || verificationStatus !== "VERIFIED"}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 text-sm sm:text-base min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">{submitStage || "Finishing..."}</span>
                <span className="inline sm:hidden">{submitStage ? "Processing" : "Finishing"}</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Complete Setup</span>
                <span className="inline sm:hidden">Complete</span>
                <span className="material-symbols-outlined text-xs sm:text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Image Cropper Modal */}
      {showSelfieCropper && selectedSelfieImage && (
        <ImageCropper
          image={selectedSelfieImage}
          onCropComplete={handleSelfieCropComplete}
          onCancel={handleSelfieCropCancel}
          aspectRatio={1}
        />
      )}

      {/* Camera Capture */}
      {showCamera === "id" && (
        <CameraCapture
          onCapture={(blob) => handleCameraCapture(blob, "id")}
          onClose={() => setShowCamera(null)}
          facingMode="environment"
          guideType="card"
        />
      )}
      {showCamera === "selfie" && (
        <CameraCapture
          onCapture={(blob) => handleCameraCapture(blob, "selfie")}
          onClose={() => setShowCamera(null)}
          facingMode="user"
          guideType="oval"
        />
      )}
    </>
  );
}
