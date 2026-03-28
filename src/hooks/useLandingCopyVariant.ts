"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export type LandingCopyVariant = "booking" | "pro";

const STORAGE_KEY = "jit:landing-copy-variant";

function normalizeVariant(value: string | null): LandingCopyVariant | null {
  if (!value) return null;
  const lowered = value.toLowerCase();

  if (["booking", "book", "client", "hire"].includes(lowered)) {
    return "booking";
  }

  if (["pro", "pros", "provider", "signup"].includes(lowered)) {
    return "pro";
  }

  return null;
}

export function useLandingCopyVariant() {
  const searchParams = useSearchParams();
  const [variant, setVariant] = useState<LandingCopyVariant>("booking");

  useEffect(() => {
    const fromQuery =
      normalizeVariant(searchParams.get("focus")) ||
      normalizeVariant(searchParams.get("variant"));

    if (fromQuery) {
      setVariant(fromQuery);
      localStorage.setItem(STORAGE_KEY, fromQuery);
      return;
    }

    const fromStorage = normalizeVariant(localStorage.getItem(STORAGE_KEY));
    if (fromStorage) {
      setVariant(fromStorage);
      return;
    }

    const assigned = Math.random() < 0.5 ? "booking" : "pro";
    setVariant(assigned);
    localStorage.setItem(STORAGE_KEY, assigned);
  }, [searchParams]);

  return variant;
}
