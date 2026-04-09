"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreditPurchaseModal } from "./CreditPurchaseModal";

interface WalletActionsProps {
  currentBalance: number;
}

export function WalletActions({ currentBalance }: WalletActionsProps) {
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState(false);

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
        <Button
          onClick={() => setIsBuyCreditsOpen(true)}
          className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Buy Credits
        </Button>
      </div>

      <CreditPurchaseModal
        isOpen={isBuyCreditsOpen}
        onClose={() => setIsBuyCreditsOpen(false)}
        currentBalance={currentBalance}
      />
    </>
  );
}
