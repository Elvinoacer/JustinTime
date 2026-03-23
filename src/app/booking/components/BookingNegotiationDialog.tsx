import React, { Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign } from "lucide-react";

interface BookingNegotiationDialogProps {
  showNegotiationDialog: boolean;
  setShowNegotiationDialog: Dispatch<SetStateAction<boolean>>;
  negotiationData: {
    proposedPrice: string;
    proposedLocation: string;
    message: string;
  };
  setNegotiationData: Dispatch<SetStateAction<any>>;
  selectedServiceData: any;
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowNegotiationDialog(false)}
        >
          <motion.div
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
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

            <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
              Propose alternative pricing or location. The provider will review
              and respond.
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Proposed Price (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current price: Kes{" "}
                  {selectedServiceData?.price.toLocaleString() || "0"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base resize-none"
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
