"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { toast } from "sonner";

const SUPPORTED_LOCALES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "sheng", name: "Sheng", flag: "🇰🇪" },
];

const LANGUAGE_STORAGE_KEY = "justintime-language";
const N8N_LANGUAGE_SWITCH_ENDPOINT = "/api/integrations/n8n/language-switch";
const LANGUAGE_SWITCH_QUEUE_KEY = "justintime-language-switch-queue";
const QUEUE_TOAST_THROTTLE_MS = 15_000;
const QUEUE_TOAST_LAST_SHOWN_KEY =
  "justintime-language-switch-toast-last-shown";
const LANGUAGE_SWITCH_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHING === "true";

type LanguageSwitchEvent = {
  locale: string;
  previousLocale?: string;
  source: "provider_sidebar";
  timestamp: string;
};

export default function LanguageSwitcher() {
  if (!LANGUAGE_SWITCH_ENABLED) {
    return null;
  }

  const showQueuedToast = () => {
    const now = Date.now();
    const lastShownRaw = sessionStorage.getItem(QUEUE_TOAST_LAST_SHOWN_KEY);
    const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;

    if (
      Number.isFinite(lastShown) &&
      now - lastShown < QUEUE_TOAST_THROTTLE_MS
    ) {
      return;
    }

    sessionStorage.setItem(QUEUE_TOAST_LAST_SHOWN_KEY, String(now));
    toast.warning(
      "Language change saved offline. It will sync when connection returns.",
    );
  };

  const [currentLocale, setCurrentLocale] = useState("en");
  const [mounted, setMounted] = useState(false);

  const sendLanguageSwitchEvent = async (
    event: LanguageSwitchEvent,
  ): Promise<boolean> => {
    try {
      const response = await fetch(N8N_LANGUAGE_SWITCH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
        keepalive: true,
      });

      return response.ok;
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to notify n8n", error);
      return false;
    }
  };

  const readQueue = (): LanguageSwitchEvent[] => {
    try {
      const raw = localStorage.getItem(LANGUAGE_SWITCH_QUEUE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is LanguageSwitchEvent =>
          item &&
          typeof item.locale === "string" &&
          typeof item.source === "string" &&
          typeof item.timestamp === "string",
      );
    } catch {
      return [];
    }
  };

  const writeQueue = (queue: LanguageSwitchEvent[]) => {
    if (queue.length === 0) {
      localStorage.removeItem(LANGUAGE_SWITCH_QUEUE_KEY);
      return;
    }

    localStorage.setItem(LANGUAGE_SWITCH_QUEUE_KEY, JSON.stringify(queue));
  };

  const enqueueEvent = (event: LanguageSwitchEvent) => {
    const queue = readQueue();
    queue.push(event);
    // Keep queue bounded to avoid unbounded growth in case of prolonged outages.
    writeQueue(queue.slice(-100));
  };

  const flushQueuedEvents = async () => {
    const queue = readQueue();
    if (queue.length === 0) return;

    const remaining: LanguageSwitchEvent[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const event = queue[index];
      // Stop after first failure and retain that event plus the rest.
      const sent = await sendLanguageSwitchEvent(event);
      if (!sent) {
        remaining.push(...queue.slice(index));
        break;
      }
    }

    writeQueue(remaining);
  };

  const notifyN8nLanguageSwitch = async (
    locale: string,
    previousLocale?: string,
  ) => {
    const event: LanguageSwitchEvent = {
      locale,
      previousLocale,
      source: "provider_sidebar",
      timestamp: new Date().toISOString(),
    };

    const sent = await sendLanguageSwitchEvent(event);
    if (!sent) {
      enqueueEvent(event);
      showQueuedToast();
    }
  };

  // Load saved language preference on mount
  useEffect(() => {
    setMounted(true);

    const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLocale && SUPPORTED_LOCALES.some((l) => l.code === savedLocale)) {
      setCurrentLocale(savedLocale);
    }

    void flushQueuedEvents();

    const onOnline = () => {
      void flushQueuedEvents();
    };

    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const previousLocale = currentLocale;

    if (newLocale === previousLocale) {
      return;
    }

    setCurrentLocale(newLocale);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);

    // Dispatch a custom event for components that need to react to language changes
    window.dispatchEvent(
      new CustomEvent("languageChange", { detail: newLocale }),
    );

    // Show a toast notification (optional - you can remove this if you don't have toast)
    // For now, we'll just log it - actual translations would be implemented separately
    console.log(`Language changed to: ${newLocale}`);

    void notifyN8nLanguageSwitch(newLocale, previousLocale);

    // Trigger a server-rendered refresh with locale in query; middleware will persist cookie.
    const url = new URL(window.location.href);
    url.searchParams.set("locale", newLocale);
    window.location.assign(url.toString());
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm">
        <Globe className="h-4 w-4 text-gray-500" />
        <div className="w-20 h-5 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const currentLang = SUPPORTED_LOCALES.find((l) => l.code === currentLocale);

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 transition-colors">
      <span className="text-base" aria-hidden="true">
        {currentLang?.flag}
      </span>
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className="bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer font-medium pr-6"
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.flag} {locale.name}
          </option>
        ))}
      </select>
    </div>
  );
}
