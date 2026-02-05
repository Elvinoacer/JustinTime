"use client";

import { useState } from "react";
import { Loader2, Rocket, Check } from "lucide-react";
import { toast } from "sonner";
import { promoteService } from "@/app/actions/revenue";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const PLANS = [
  { 
    id: "STANDARD", 
    days: 7, 
    price: 1000, 
    label: "Standard Boost", 
    features: ["Top of search results", "Highlighted listing", "7 Days Duration"]
  },
  { 
    id: "PREMIUM", 
    days: 30, 
    price: 3000, 
    label: "Premium Power", 
    popular: true,
    features: ["Top of search results", "Premium Badge", "30 Days Duration", "Priority Support"] 
  },
];

interface PromoteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceTitle: string;
}

export function PromoteServiceModal({ isOpen, onClose, serviceId, serviceTitle }: PromoteServiceModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePromote = async (planId: "STANDARD" | "PREMIUM") => {
    setLoading(true);
    try {
        const result = await promoteService(serviceId, planId);
        if (result.success) {
            toast.success(`Service boosted successfully!`);
            router.refresh();
            onClose();
        } else {
            toast.error(result.error || "Promotion failed");
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
          className="bg-white rounded-xl lg:rounded-2xl shadow-xl lg:shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  Promote "{serviceTitle}"
                </h2>
             </div>
             <button
               onClick={onClose}
               className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
               aria-label="Close modal"
             >
               <span className="material-symbols-outlined text-xl">close</span>
             </button>
          </div>

          <div className="p-6 overflow-y-auto">
             <p className="text-gray-600 mb-6">Boost your service visibility to get more bookings.</p>
             
             <div className="grid gap-4 md:grid-cols-2">
              {PLANS.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`relative flex flex-col p-4 border rounded-xl hover:border-purple-500 cursor-pointer transition-all ${plan.popular ? 'border-purple-500 bg-purple-50/50 shadow-sm' : 'border-gray-200 hover:shadow-md'}`}
                  onClick={() => !loading && handlePromote(plan.id as "STANDARD" | "PREMIUM")}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                      Best Value
                    </span>
                  )}
                  
                  <div className="mb-2 text-center">
                       <h4 className="font-bold text-lg text-gray-900">{plan.label}</h4>
                       <div className="text-2xl font-bold text-purple-700 mt-1">KES {plan.price.toLocaleString()}</div>
                  </div>

                  <ul className="space-y-2 text-sm text-gray-600 mb-4 flex-1">
                    {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                        </li>
                    ))}
                  </ul>

                  <button 
                    className={`w-full py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 ${plan.popular ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Select Plan"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
