import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

export const useFcmToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          const msg = await messaging();
          if (!msg) return;

          // Request permission
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);

          if (permission === "granted") {
            const currentToken = await getToken(msg, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });

            if (currentToken) {
              setToken(currentToken);
              // Send token to backend
              await fetch("/api/notifications/store-token", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ token: currentToken }),
              });
            }
          }
        }
      } catch (error) {
        console.error("An error occurred while retrieving token:", error);
      }
    };

    retrieveToken();
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    const setupMessageListener = async () => {
      const msg = await messaging();
      if (!msg) return;

      const unsubscribe = onMessage(msg, (payload) => {
        console.log("Foreground message received:", payload);
        // You can show a toast notification here using sonner or similar library
        // toast(payload.notification?.title, { description: payload.notification?.body });
      });

      return () => unsubscribe();
    };

    setupMessageListener();
  }, []);

  return { token, notificationPermission };
};
