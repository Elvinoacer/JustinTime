"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";

const MIN_REASON_LENGTH = 20;

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
  title?: string;
}

export default function DisputeModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  title = "File Dispute",
}: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  const remaining = useMemo(
    () => Math.max(MIN_REASON_LENGTH - reason.trim().length, 0),
    [reason],
  );

  const handleSubmit = () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      setError(
        `Please provide at least ${MIN_REASON_LENGTH} characters so support can investigate properly.`,
      );
      return;
    }

    setError("");
    onSubmit(trimmedReason);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Describe the issue clearly. Funds stay frozen while admin reviews this dispute."
      icon="warning"
      size="md"
      closeOnOverlayClick={!isSubmitting}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Dispute reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError("");
            }}
            rows={5}
            maxLength={1500}
            placeholder="Explain what went wrong and what outcome you expect."
            className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 ${
              error
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-emerald-500"
            }`}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <p className={error ? "text-red-600" : "text-gray-500"}>
              {error ||
                (remaining > 0
                  ? `${remaining} more characters required`
                  : "Reason length looks good")}
            </p>
            <p className="text-gray-500">{reason.length}/1500</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Dispute"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
