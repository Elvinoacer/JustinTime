"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { messaging } from "@/lib/firebase";
import { emitNotificationSync } from "@/lib/notifications/clientSync";

export default function ForegroundNotificationListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    const setupForegroundListener = async () => {
      const msg = await messaging();
      if (!msg || !active) {
        return;
      }

      unsubscribe = onMessage(msg, (payload) => {
        const title = payload.notification?.title || "New notification";
        const description = payload.notification?.body;

        toast.info(title, description ? { description } : undefined);

        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        emitNotificationSync({
          reason: "foreground-message",
          notificationId: payload.data?.notificationId,
        });
      });
    };

    void setupForegroundListener();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [queryClient]);

  return null;
}
