"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { createExpense } from "@/app/actions/expenses";

export function OfflineSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const isProcessingRef = useRef(false);

  // Observe the queue
  const pendingItems = useLiveQuery(() =>
    db.syncQueue
      .where("status")
      .anyOf("PENDING", "FAILED", "SYNCING")
      .toArray(),
  );

  useEffect(() => {
    // 1. Online/Offline Listeners
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        toast.success("You are back online. Syncing data...");
        void processQueue();
      };

      const handleOffline = () => {
        setIsOnline(false);
        toast("You are offline. Changes will be saved locally.", {
          icon: "📡",
        });
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if (navigator.onLine) {
        void processQueue();
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (!isOnline || !pendingItems || pendingItems.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void processQueue();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isOnline, pendingItems]);

  const processQueue = async () => {
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      const items = await db.syncQueue
        .where("status")
        .anyOf("PENDING", "FAILED")
        .sortBy("createdAt");
      if (items.length === 0) return;

      for (const item of items) {
        try {
          if ((item.retryCount || 0) >= 5) {
            await db.syncQueue.update(item.id!, { status: "FAILED" });
            continue;
          }

          // Mark as syncing
          await db.syncQueue.update(item.id!, { status: "SYNCING" });

          // Dispatch Action
          let result;
          if (item.actionName === "createExpense") {
            // Ensure payload date is converted back to Date object if needed
            const payload = {
              ...item.payload,
              date: new Date(item.payload.date),
            };
            result = await createExpense(payload);
          }

          if (result && result.success) {
            // Success: Remove from queue
            await db.syncQueue.delete(item.id!);
            toast.success("Synced 1 item successfully");
          } else {
            // Failed logic
            await db.syncQueue.update(item.id!, {
              status: "FAILED",
              retryCount: (item.retryCount || 0) + 1,
            });
          }
        } catch (err) {
          console.error("Sync failed for item", item, err);
          await db.syncQueue.update(item.id!, {
            status: "FAILED",
            retryCount: (item.retryCount || 0) + 1,
          });
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  };

  return (
    <>
      {children}
      {/* Visual Indicator for Offline Mode */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Offline Mode
        </div>
      )}
      {/* Visual Indicator for Syncing */}
      {isOnline && pendingItems && pendingItems.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
          Syncing {pendingItems.length} items...
        </div>
      )}
    </>
  );
}
