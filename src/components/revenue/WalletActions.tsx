"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreditPurchaseModal } from "./CreditPurchaseModal";

interface WalletActionsProps {
  currentBalance: number;
  creditBalance: number;
}

export function WalletActions({ currentBalance, creditBalance }: WalletActionsProps) {
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setIsBuyCreditsOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Buy Credits
        </Button>
      </div>

      <CreditPurchaseModal 
        isOpen={isBuyCreditsOpen} 
        onClose={() => setIsBuyCreditsOpen(false)} 
        currentBalance={creditBalance}
      />
    </>
  );
}
