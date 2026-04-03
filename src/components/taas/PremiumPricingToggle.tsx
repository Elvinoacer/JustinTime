"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { togglePremiumPricing } from "@/app/actions/taas";

interface PremiumPricingToggleProps {
  enabled: boolean;
}

export default function PremiumPricingToggle({
  enabled,
}: PremiumPricingToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const result = await togglePremiumPricing(!enabled);
      if (!result.success) {
        throw new Error(result.error || "Failed to update premium pricing.");
      }

      toast.success(
        !enabled ? "Premium pricing enabled." : "Premium pricing disabled.",
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update premium pricing.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`px-6 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-70 ${
        enabled
          ? "bg-slate-700 hover:bg-slate-800"
          : "bg-purple-600 hover:bg-purple-700"
      }`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating...
        </span>
      ) : enabled ? (
        "Disable Premium"
      ) : (
        "Enable Premium"
      )}
    </button>
  );
}
