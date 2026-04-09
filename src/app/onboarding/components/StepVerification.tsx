"use client";
import { motion } from "framer-motion";
import * as faceapi from "face-api.js";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import ImageCropper from "@/components/ImageCropper";
import CameraCapture from "./CameraCapture";

type VerificationStatus = "PASSED" | "MANUAL_REVIEW" | null;

interface StepVerificationProps {
  onBack: () => void;
  onNext: (data: VerificationResult) => void;
  isSubmitting: boolean;
  submitStage?: string;
}

export interface VerificationResult {
  idFile: File;
  selfieFile: File;
  faceMatchScore: number;
  idDocumentType: string;
  manualReviewRequested: boolean;
}

export default function StepVerification({
  onBack,
  onNext,
  isSubmitting,
  submitStage,
}: StepVerificationProps) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const idInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const idPreviewObjectUrlRef = useRef<string | null>(null);
  const selfiePreviewObjectUrlRef = useRef<string | null>(null);

  const [showSelfieCropper, setShowSelfieCropper] = useState(false);
  const [selectedSelfieImage, setSelectedSelfieImage] = useState<string | null>(
    null,
  );

  const [showCamera, setShowCamera] = useState<"id" | "selfie" | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [faceMatchScore, setFaceMatchScore] = useState<number | null>(null);

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
        setModelLoadError(null);
      } catch (error) {
        console.error("Failed to load face-api models", error);
        setModelLoadError(
          "Could not load identity verification. Check your connection and refresh.",
        );
        toast.error("Failed to load verification system. Please refresh.");
      }
    };
    loadModels();
  }, []);

  const revokePreviewUrl = (type: "id" | "selfie") => {
    const targetRef =
      type === "id" ? idPreviewObjectUrlRef : selfiePreviewObjectUrlRef;
    if (targetRef.current) {
      URL.revokeObjectURL(targetRef.current);
      targetRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokePreviewUrl("id");
      revokePreviewUrl("selfie");
    };
  }, []);

  // File handling
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "selfie",
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
      revokePreviewUrl("id");
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
    setSelfieFile(
      new File([croppedBlob], "selfie.jpg", { type: "image/jpeg" }),
    );
    revokePreviewUrl("selfie");
    const previewUrl = URL.createObjectURL(croppedBlob);
    selfiePreviewObjectUrlRef.current = previewUrl;
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
    revokePreviewUrl(type);
    const previewUrl = URL.createObjectURL(blob);

    if (type === "id") {
      idPreviewObjectUrlRef.current = previewUrl;
      setIdFile(file);
      setIdPreview(previewUrl);
    } else {
      selfiePreviewObjectUrlRef.current = previewUrl;
      setSelfieFile(file);
      setSelfiePreview(previewUrl);
    }

    setShowCamera(null);
    setVerificationStatus(null);
    setVerificationMessage("");
    setFaceMatchScore(null);
  };

  const verifyIdentity = useCallback(async () => {
    if (!idFile || !selfieFile) {
      toast.error("Please upload both ID and selfie.");
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
        setVerificationStatus("MANUAL_REVIEW");
        setFaceMatchScore(0);
        setVerificationMessage(
          "Auto-check inconclusive: we could not detect a face in the ID photo.",
        );
        toast.error("No face detected in ID photo.");
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
        setVerificationStatus("MANUAL_REVIEW");
        setFaceMatchScore(0);
        setVerificationMessage(
          "Auto-check inconclusive: we could not detect a face in the selfie.",
        );
        toast.error("No face detected in selfie.");
        setIsVerifying(false);
        return;
      }

      // 3. Compare faces using euclidean distance
      setVerificationMessage("Comparing faces...");
      const distance = faceapi.euclideanDistance(
        idDetection.descriptor,
        selfieDetection.descriptor,
      );

      // Lower distance = more similar. 0.72 threshold is lenient for aged ID photos
      const MATCH_THRESHOLD = 0.72;
      const score = Math.max(0, (1 - distance) * 100);
      setFaceMatchScore(score);

      if (distance > MATCH_THRESHOLD) {
        setVerificationStatus("MANUAL_REVIEW");
        setVerificationMessage(
          "Auto-check inconclusive. Submit for manual review and our team will verify your documents.",
        );
        toast.error("Automatic face check could not confirm a match.");
        setIsVerifying(false);
        return;
      }

      setVerificationStatus("PASSED");
      setVerificationMessage(
        "Identity check passed. You are ready to continue.",
      );
      toast.success("Identity check passed.");
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus("MANUAL_REVIEW");
      setFaceMatchScore(0);
      setVerificationMessage(
        "Automatic verification was inconclusive. Submit for manual review.",
      );
      toast.error("Verification could not complete automatically.");
    } finally {
      setIsVerifying(false);
    }
  }, [idFile, selfieFile, modelsLoaded]);

  useEffect(() => {
    if (
      !idFile ||
      !selfieFile ||
      !modelsLoaded ||
      isVerifying ||
      verificationStatus !== null
    ) {
      return;
    }

    void verifyIdentity();
  }, [
    idFile,
    selfieFile,
    modelsLoaded,
    isVerifying,
    verificationStatus,
    verifyIdentity,
  ]);

  const handleNext = () => {
    if (!idFile || !selfieFile || verificationStatus === null || isVerifying) {
      toast.error("Please complete identity verification first.");
      return;
    }

    const manualReviewRequested = verificationStatus !== "PASSED";

    onNext({
      idFile,
      selfieFile,
      faceMatchScore: faceMatchScore ?? 0,
      idDocumentType: "unknown",
      manualReviewRequested,
    });
  };

  const verificationTone =
    verificationStatus === "PASSED"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-amber-50 text-amber-800 border-amber-200";

  if (!modelsLoaded) {
    return (
      <motion.div
        key="step3-verification-loading"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 text-center"
      >
        <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-700">
          Loading identity verification...
        </p>
        <p className="text-xs text-gray-500">Usually takes 10-20 seconds</p>
        {modelLoadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {modelLoadError}
          </p>
        ) : null}
      </motion.div>
    );
  }

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
            Upload your ID and a clear selfie. We run an automatic check, and if
            it is inconclusive we route you to manual review.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
              <span className="material-symbols-outlined">shield_lock</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Step 3 of 3
              </p>
              <h3 className="mt-1 text-base sm:text-lg font-bold text-gray-900">
                Verify your identity
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Once both uploads are ready, we automatically run the face
                check.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              "Upload a clear, well-lit ID photo.",
              "Use a front-facing selfie in good lighting.",
              "If auto-check is inconclusive, we review manually in 24h.",
            ].map((tip) => (
              <div
                key={tip}
                className="rounded-xl border border-white bg-white/90 px-3 py-3 text-sm text-gray-600 shadow-sm"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Upload 1
                  </p>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-gray-900">
                    Government ID
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                  <span className="material-symbols-outlined text-sm">
                    {idFile ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  {idFile ? "Done" : "Pending"}
                </span>
              </div>

              {idPreview ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={idPreview}
                    alt="ID preview"
                    className="h-16 w-24 rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      revokePreviewUrl("id");
                      setIdFile(null);
                      setIdPreview(null);
                      setVerificationStatus(null);
                      setVerificationMessage("");
                      setFaceMatchScore(null);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Replace ID
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => idInputRef.current?.click()}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Upload from gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCamera("id")}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Use camera
                  </button>
                </div>
              )}
              <input
                ref={idInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "id")}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Upload 2
                  </p>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-gray-900">
                    Selfie
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                  <span className="material-symbols-outlined text-sm">
                    {selfieFile ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  {selfieFile ? "Done" : "Pending"}
                </span>
              </div>

              {selfiePreview ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={selfiePreview}
                    alt="Selfie preview"
                    className="h-16 w-16 rounded-full border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      revokePreviewUrl("selfie");
                      setSelfieFile(null);
                      setSelfiePreview(null);
                      setVerificationStatus(null);
                      setVerificationMessage("");
                      setFaceMatchScore(null);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Replace selfie
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCamera("selfie")}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Use front camera
                  </button>
                  <button
                    type="button"
                    onClick={() => selfieInputRef.current?.click()}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Upload from gallery
                  </button>
                </div>
              )}
              <input
                ref={selfieInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "selfie")}
              />
            </div>
          </div>

          {(isVerifying || (verificationStatus && verificationMessage)) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-3 sm:p-4 ${
                isVerifying
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : verificationTone
              }`}
            >
              {isVerifying ? (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                  Checking identity match...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-lg">
                      {verificationStatus === "PASSED"
                        ? "verified"
                        : "pending_actions"}
                    </span>
                    <p className="text-sm font-semibold">
                      {verificationMessage}
                    </p>
                  </div>
                  {verificationStatus === "MANUAL_REVIEW" ? (
                    <p className="text-xs text-amber-700">
                      If the automatic check cannot confirm a match, our team
                      reviews your documents within 24 hours. This is common for
                      older ID photos or low-light selfies.
                    </p>
                  ) : null}
                </div>
              )}
            </motion.div>
          )}

          {verificationStatus === "MANUAL_REVIEW" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-800">
              Manual review means no extra work from you. Submit and we will
              follow up once review is complete.
            </div>
          ) : null}

          {faceMatchScore !== null ? (
            <p className="text-xs text-gray-500">
              Internal face-check score captured for audit.
            </p>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs sm:text-sm text-gray-600">
            Why this matters: verification helps build trust and keeps jobs safe
            for both clients and providers.
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 sm:pt-6 md:pt-8 border-t border-gray-100">
          <button
            onClick={onBack}
            className="text-gray-500 font-bold hover:text-gray-800 transition-colors px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-100 text-sm sm:text-base min-h-11"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={
              isSubmitting ||
              isVerifying ||
              !idFile ||
              !selfieFile ||
              verificationStatus === null
            }
            className="bg-linear-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-2 text-sm sm:text-base min-h-11"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">
                  {submitStage || "Finishing..."}
                </span>
                <span className="inline sm:hidden">
                  {submitStage ? "Processing" : "Finishing"}
                </span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">
                  {verificationStatus === "PASSED"
                    ? "Continue"
                    : "Submit for review"}
                </span>
                <span className="inline sm:hidden">
                  {verificationStatus === "PASSED" ? "Continue" : "Review"}
                </span>
                <span className="material-symbols-outlined text-xs sm:text-sm">
                  arrow_forward
                </span>
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
