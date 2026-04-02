import { useEffect, useState, useCallback } from "react";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import {
  clearStoredFcmToken,
  getStoredFcmToken,
  revokeClientFcmToken,
  setStoredFcmToken,
} from "@/lib/notifications/clientToken";

export const useFcmToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  const syncTokenToBackend = useCallback(async (currentToken: string) => {
    await fetch("/api/notifications/store-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: currentToken }),
    });
  }, []);

  const retrieveToken = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const previousToken = getStoredFcmToken();
        const msg = await messaging();
        if (!msg) return null;

        const currentToken = await getToken(msg, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (currentToken) {
          setToken(currentToken);
          setStoredFcmToken(currentToken);
          await syncTokenToBackend(currentToken);

          if (previousToken && previousToken !== currentToken) {
            await fetch("/api/notifications/store-token", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: previousToken }),
            });
          }

          return currentToken;
        }

        clearStoredFcmToken();
        setToken(null);
      }
    } catch (error) {
      console.error("An error occurred while retrieving token:", error);
    }
    return null;
  }, [syncTokenToBackend]);

  const requestPermission = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === "granted") {
          await retrieveToken();
        }
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  }, [retrieveToken]);

  useEffect(() => {
    // Check current permission status without requesting
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      setNotificationPermission(Notification.permission);

      if (Notification.permission === "denied") {
        setToken(null);
        void revokeClientFcmToken();
        return;
      }

      if (Notification.permission === "granted") {
        void retrieveToken();
      }
    }
  }, [retrieveToken]);

  return { token, notificationPermission, requestPermission };
};
