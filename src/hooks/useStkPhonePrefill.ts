"use client";

import { useEffect, useRef, useState } from "react";
import apiClient from "@/lib/api/client";
import { normalizeKenyanPhone } from "@/lib/utils/phone";

interface UserPhonePayload {
  phone?: string | null;
}

export function useStkPhonePrefill() {
  const [phone, setPhone] = useState("");
  const [isLoadingPhone, setIsLoadingPhone] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    let active = true;

    const hydratePhone = async () => {
      try {
        const response = await apiClient.get<UserPhonePayload>("/users/me");
        const rawPhone =
          typeof response?.data?.phone === "string" ? response.data.phone : "";
        const normalizedPhone = normalizeKenyanPhone(rawPhone);

        if (active) {
          setPhone(normalizedPhone || rawPhone.trim());
        }
      } catch (error) {
        console.error("[STK_PHONE_PREFILL_ERROR]", error);
      } finally {
        if (active) {
          setIsLoadingPhone(false);
        }
      }
    };

    void hydratePhone();

    return () => {
      active = false;
    };
  }, []);

  return {
    phone,
    setPhone,
    isLoadingPhone,
  };
}
