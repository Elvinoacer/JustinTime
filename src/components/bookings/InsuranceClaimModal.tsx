"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Modal } from "@/components/Modal";
import { submitInsuranceClaim } from "@/app/actions/insurance";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface BookingSummary {
  id: string;
  totalAmount: number;
  providerName: string;
  title: string;
}

interface ExistingClaim {
  id: string;
  status: string;
  amount: number;
  approvedAmount?: number | null;
  adminNotes?: string | null;
  createdAt?: string;
}

interface InsuranceClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingSummary | null;
  existingClaim?: ExistingClaim | null;
  onSubmitted?: () => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function InsuranceClaimModal({
  isOpen,
  onClose,
  booking,
  existingClaim,
  onSubmitted,
}: InsuranceClaimModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const claimExists = Boolean(existingClaim);

  useEffect(() => {
    if (!booking || !isOpen) {
      return;
    }

    setAmount(String(booking.totalAmount || ""));
    setDescription("");
    setFiles([]);
  }, [booking, isOpen]);

  const amountNumber = useMemo(() => Number(amount), [amount]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) {
      return;
    }

    const nextFiles = [...files];

    for (const file of selectedFiles) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name} exceeds the 10MB file size limit.`);
        continue;
      }

      if (nextFiles.length >= MAX_FILES) {
        toast.warning(`You can upload up to ${MAX_FILES} evidence files.`);
        break;
      }

      const duplicate = nextFiles.some(
        (existing) =>
          existing.name === file.name && existing.size === file.size,
      );
      if (!duplicate) {
        nextFiles.push(file);
      }
    }

    setFiles(nextFiles);
    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmit = async () => {
    if (!booking) {
      return;
    }

    if (claimExists) {
      onClose();
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast.error("Claim amount must be greater than zero.");
      return;
    }

    if (description.trim().length < 20) {
      toast.error("Provide at least 20 characters describing the incident.");
      return;
    }

    if (files.length === 0) {
      toast.error("Upload at least one evidence file.");
      return;
    }

    setIsSubmitting(true);
    try {
      const evidenceUrls: string[] = [];

      for (const file of files) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("folder", "uploads");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json().catch(() => ({}));
          throw new Error(uploadError?.error || "Failed to upload evidence");
        }

        const uploadPayload = await uploadResponse.json();
        if (!uploadPayload?.url) {
          throw new Error("Evidence upload succeeded but URL is missing.");
        }

        evidenceUrls.push(uploadPayload.url);
      }

      const claimForm = new FormData();
      claimForm.append("bookingId", booking.id);
      claimForm.append("amount", String(amountNumber));
      claimForm.append("description", description.trim());
      claimForm.append("evidence", JSON.stringify(evidenceUrls));
      evidenceUrls.forEach((url) => claimForm.append("evidenceUrls", url));

      const result = await submitInsuranceClaim(claimForm);
      if (!result?.success) {
        throw new Error(result?.error || "Failed to submit insurance claim.");
      }

      toast.success("Insurance claim submitted successfully.");
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit claim.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={claimExists ? "Insurance Claim Status" : "File Insurance Claim"}
      description={
        claimExists
          ? "Track your current insurance claim outcome."
          : "Submit damage evidence and details for review by the risk team."
      }
      icon="warning"
      size="md"
      closeOnOverlayClick={!isSubmitting}
    >
      {booking ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <p className="font-semibold text-gray-900">{booking.title}</p>
            <p className="text-gray-600 mt-1">
              Provider: {booking.providerName}
            </p>
            <p className="text-emerald-700 font-semibold mt-1">
              Booking Amount: KES{" "}
              {Number(booking.totalAmount || 0).toLocaleString()}
            </p>
          </div>

          {claimExists ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-amber-800">
                  Status: {existingClaim?.status}
                </p>
                <p className="text-amber-700 mt-1">
                  Claimed amount: KES{" "}
                  {Number(existingClaim?.amount || 0).toLocaleString()}
                </p>
                {existingClaim?.approvedAmount ? (
                  <p className="text-amber-700 mt-1">
                    Approved amount: KES{" "}
                    {Number(existingClaim.approvedAmount).toLocaleString()}
                  </p>
                ) : null}
                {existingClaim?.adminNotes ? (
                  <p className="text-amber-700 mt-2">
                    Admin notes: {existingClaim.adminNotes}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Claim amount (KES)
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  What happened?
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={1200}
                  placeholder="Describe the damage or incident in detail..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {description.length}/1200 characters
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Evidence files (up to {MAX_FILES})
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-700 hover:bg-gray-100">
                  <Upload className="h-4 w-4" />
                  Upload images or PDF evidence
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {files.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-gray-600">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5"
                      >
                        <span className="truncate pr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Claim"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600">No booking selected.</p>
      )}
    </Modal>
  );
}
