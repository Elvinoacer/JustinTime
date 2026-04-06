"use client";

import { useState, type ChangeEvent } from "react";
import { submitBackgroundCheck } from "@/app/actions/verification";
import { toast } from "sonner";
import { Loader2, Upload, ShieldCheck, ShieldAlert, Clock } from "lucide-react";

interface BackgroundCheckFormProps {
  initialStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  expiresAt?: Date | string | null;
}

export default function BackgroundCheckForm({
  initialStatus,
  expiresAt,
}: BackgroundCheckFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Calculate expiration status
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const daysUntilExpiration = expiresAt
    ? Math.ceil(
        (new Date(expiresAt).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const isExpiringSoon =
    daysUntilExpiration !== null &&
    daysUntilExpiration <= 30 &&
    daysUntilExpiration > 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isAllowedType = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (!isAllowedType) {
      toast.error("Upload a PDF, JPG, PNG, or WEBP file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be below 5MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Please select your certificate first.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", "identity");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        throw new Error(uploadPayload?.error || "Document upload failed");
      }

      const uploadPayload = await uploadResponse.json();
      const uploadedUrl = uploadPayload?.url as string | undefined;

      if (!uploadedUrl) {
        throw new Error("Upload succeeded but no file URL was returned.");
      }

      const result = await submitBackgroundCheck({ documentUrl: uploadedUrl });
      if (result.success) {
        setStatus("PENDING");
        setSelectedFile(null);
        toast.success("Background check submitted successfully.");
      } else {
        toast.error(result.error || "Failed to submit request.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === "APPROVED") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden">
        {(isExpired || isExpiringSoon) && (
          <div
            className={`absolute top-0 left-0 right-0 p-2 text-xs font-bold text-center ${isExpired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
          >
            {isExpired
              ? "Certificate Expired"
              : `Expires in ${daysUntilExpiration} days`}
          </div>
        )}

        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 mt-6">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Background Check Approved
        </h3>
        <p className="text-gray-600 mb-4">
          Your criminal record check has been verified. You now have the{" "}
          <span className="font-bold text-emerald-700">Trusted Provider</span>{" "}
          badge.
        </p>

        {expiresAt && (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <div className="text-sm text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-emerald-100">
              Valid until: {new Date(expiresAt).toLocaleDateString()}
            </div>

            {(isExpired || isExpiringSoon) && (
              <button
                onClick={() => setStatus(null)} // Reset status to allow new upload
                className="mt-2 w-full px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Submit Renewal
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Verification in Progress
        </h3>
        <p className="text-gray-600">
          Our team is reviewing your certificate. This usually takes 24-48
          hours.
        </p>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Verification Failed
        </h3>
        <p className="text-red-700 mb-4">
          Your previous submission was not approved. Please upload a valid,
          recent Certificate of Good Conduct.
        </p>
        <button
          onClick={() => {
            setStatus(null);
            setSelectedFile(null);
          }}
          className="text-sm font-semibold text-red-600 underline hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Background Check (Criminal Record)
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          To build trust with clients, we require a valid{" "}
          <strong>Certificate of Good Conduct</strong> from the DCI.
        </p>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <div className="flex">
            <div className="shrink-0">
              <svg
                className="h-5 w-5 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                This is mandatory for "High Trust" categories (e.g. Childcare,
                Home Cleaning).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          {loading ? (
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
          ) : selectedFile ? (
            <>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-emerald-700 font-medium text-sm">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">Click to change</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-600 font-medium text-sm">
                Upload Certificate
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF or JPG (Max 5MB)</p>
            </>
          )}
        </label>

        <button
          onClick={handleSubmit}
          disabled={!selectedFile || loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit for Verification"
          )}
        </button>
      </div>
    </div>
  );
}
