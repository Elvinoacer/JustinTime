"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { BadgeType } from "@/generated/prisma/client";
import { requestVerificationBadge } from "@/app/actions/taas";

interface BadgeRequestUploadButtonProps {
  type: BadgeType;
  pending: boolean;
  label?: string;
}

export default function BadgeRequestUploadButton({
  type,
  pending,
  label = "Upload",
}: BadgeRequestUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAllowedType = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type);

    if (!isAllowedType) {
      toast.error("Upload a PDF, JPG, PNG, or WEBP file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be below 10MB.");
      event.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "identity");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json().catch(() => ({}));
        throw new Error(uploadError?.error || "Document upload failed");
      }

      const uploadPayload = await uploadResponse.json();
      const documentUrl = uploadPayload?.url as string | undefined;

      if (!documentUrl) {
        throw new Error("Upload succeeded but no document URL was returned.");
      }

      const result = await requestVerificationBadge(type, documentUrl);
      if (!result.success) {
        throw new Error(result.error || "Failed to submit badge request.");
      }

      toast.success("Verification request submitted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFilePick}
      />
      <button
        type="button"
        disabled={pending || loading}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {pending ? "Pending Review" : label}
      </button>
    </>
  );
}
