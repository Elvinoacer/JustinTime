"use client";

import { Loader2, X } from "lucide-react";

interface StkPhonePromptModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  isSubmitting?: boolean;
  isLoadingDefaultPhone?: boolean;
}

export function StkPhonePromptModal({
  isOpen,
  title,
  description,
  phoneNumber,
  onPhoneNumberChange,
  onClose,
  onConfirm,
  confirmLabel = "Continue",
  isSubmitting = false,
  isLoadingDefaultPhone = false,
}: StkPhonePromptModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px] sm:items-center sm:px-4 sm:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close phone number prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label
            htmlFor="stk-phone-number"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            M-Pesa phone number
          </label>
          <input
            id="stk-phone-number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(event) => onPhoneNumberChange(event.target.value)}
            placeholder="e.g. 254712345678"
            disabled={isSubmitting}
            autoFocus
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Use the number that should receive this STK prompt.
          </p>
          {isLoadingDefaultPhone ? (
            <p className="mt-1 text-xs text-slate-500">Loading saved phone...</p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
