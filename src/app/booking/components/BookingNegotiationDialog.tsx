import React, { Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign } from "lucide-react";
import type { ProfessionalDetail } from "@/lib/api/hooks/useProfessional";

type BookingService = ProfessionalDetail["services"][number];

interface BookingNegotiationDialogProps {
  showNegotiationDialog: boolean;
  setShowNegotiationDialog: Dispatch<SetStateAction<boolean>>;
  negotiationData: {
    proposedPrice: string;
    proposedLocation: string;
    message: string;
  };
  setNegotiationData: Dispatch<
    SetStateAction<{
      proposedPrice: string;
      proposedLocation: string;
      message: string;
    }>
  >;
  selectedServiceData?: BookingService;
  handleSubmit: (withNegotiation?: boolean) => void;
}

export default function BookingNegotiationDialog({
  showNegotiationDialog,
  setShowNegotiationDialog,
  negotiationData,
  setNegotiationData,
  selectedServiceData,
  handleSubmit,
}: BookingNegotiationDialogProps) {
  return (
    <AnimatePresence>
      {showNegotiationDialog && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowNegotiationDialog(false)}
        >
          <motion.div
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-6"
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Negotiate Terms
              </h2>
              <button
                onClick={() => setShowNegotiationDialog(false)}
                className="p-1"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="mb-4 text-sm leading-6 text-slate-600 sm:mb-6">
              Propose alternative pricing or location. The provider will review
              and respond.
            </p>

            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-800">
              Current service price: Kes{" "}
              {selectedServiceData?.price?.toLocaleString() || "0"}. Use
              negotiation only if you need to suggest a different budget or
              meeting setup.
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Proposed Price (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={negotiationData.proposedPrice}
                    onChange={(e) =>
                      setNegotiationData({
                        ...negotiationData,
                        proposedPrice: e.target.value,
                      })
                    }
                    placeholder={selectedServiceData?.price.toString()}
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 sm:text-base"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Current price: Kes{" "}
                  {selectedServiceData?.price.toLocaleString() || "0"}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Proposed Location (Optional)
                </label>
                <input
                  type="text"
                  value={negotiationData.proposedLocation}
                  onChange={(e) =>
                    setNegotiationData({
                      ...negotiationData,
                      proposedLocation: e.target.value,
                    })
                  }
                  placeholder="Alternative meeting location"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 sm:text-base"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Message (Optional)
                </label>
                <textarea
                  value={negotiationData.message}
                  onChange={(e) =>
                    setNegotiationData({
                      ...negotiationData,
                      message: e.target.value,
                    })
                  }
                  placeholder="Explain your proposed changes..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 sm:text-base"
                />
              </div>

              <div className="sticky bottom-0 -mx-5 mt-4 border-t border-slate-100 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2">
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowNegotiationDialog(false)}
                    className="flex-1 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowNegotiationDialog(false);
                      handleSubmit(true);
                    }}
                    disabled={
                      !negotiationData.proposedPrice &&
                      !negotiationData.proposedLocation
                    }
                    className="flex-1 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Proposal
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
