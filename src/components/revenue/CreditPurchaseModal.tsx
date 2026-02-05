"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { purchaseCredits } from "@/app/actions/revenue";
import { AnimatePresence, motion } from "framer-motion";

const PACKAGES = [
  { id: "starter", credits: 5, price: 450, discount: "10%", label: "Starter" },
  { id: "growth", credits: 20, price: 1600, discount: "20%", label: "Growth", popular: true },
  { id: "pro", credits: 50, price: 3500, discount: "30%", label: "Professional" },
];

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

export function CreditPurchaseModal({ isOpen, onClose, currentBalance }: CreditPurchaseModalProps) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    setLoading(true);
    try {
        const result = await purchaseCredits(pkg.id);
        if (result.success) {
            toast.success(`Successfully added ${pkg.credits} credits!`);
            onClose();
        } else {
            toast.error(result.error || "Purchase failed");
        }
    } catch (err) {
        toast.error("Something went wrong");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
           initial={{ scale: 0.95, opacity: 0, y: 10 }}
           animate={{ scale: 1, opacity: 1, y: 0 }}
           exit={{ scale: 0.95, opacity: 0, y: 10 }}
           onClick={(e) => e.stopPropagation()}
           className="bg-white rounded-xl lg:rounded-2xl shadow-xl lg:shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative"
        >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h2 className="text-xl font-bold text-gray-900">Buy Lead Credits</h2>
               <button
                 onClick={onClose}
                 className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 ml-2"
               >
                 <span className="material-symbols-outlined text-xl">close</span>
               </button>
            </div>

            <div className="p-6">
                <p className="text-gray-600 mb-2">Purchase credits to send proposals to clients.</p>
                <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
                    <span className="text-sm text-blue-800 font-medium">Current Balance:</span>
                    <strong className="text-lg text-blue-900">{currentBalance} Credits</strong>
                </div>

                <div className="grid gap-3">
                  {PACKAGES.map((pkg) => (
                    <div 
                      key={pkg.id} 
                      className={`relative flex items-center justify-between p-4 border rounded-xl hover:border-blue-500 cursor-pointer transition-all ${pkg.popular ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20' : 'border-gray-200 hover:shadow-md'}`}
                      onClick={() => !loading && handlePurchase(pkg)}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                          Most Popular
                        </span>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-full">
                            <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                           <h4 className="font-bold text-gray-900">{pkg.label}</h4>
                           <p className="text-sm text-gray-500 font-medium">{pkg.credits} Credits</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">KES {pkg.price}</div>
                        <div className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded ml-auto w-fit">{pkg.discount} OFF</div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                 <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
