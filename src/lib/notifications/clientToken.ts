import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

const TOKEN_STORAGE_KEY = "jit:fcm-token";

export function getStoredFcmToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredFcmToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredFcmToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function resolveCurrentFcmToken(): Promise<string | null> {
  const fallbackToken = getStoredFcmToken();

  try {
    const msg = await messaging();
    if (!msg) {
      return fallbackToken;
    }

    const currentToken = await getToken(msg, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    return currentToken || fallbackToken;
  } catch {
    return fallbackToken;
  }
}

export async function revokeClientFcmToken(): Promise<boolean> {
  const token = await resolveCurrentFcmToken();

  if (!token) {
    clearStoredFcmToken();
    return false;
  }

  try {
    const response = await fetch("/api/notifications/store-token", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    clearStoredFcmToken();
    return response.ok;
  } catch {
    clearStoredFcmToken();
    return false;
  }
}
