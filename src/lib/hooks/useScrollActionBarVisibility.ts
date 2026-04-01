"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollActionBarVisibilityOptions {
  topThreshold?: number;
  hideDelta?: number;
  showDelta?: number;
}

export function useScrollActionBarVisibility(
  options: ScrollActionBarVisibilityOptions = {},
) {
  const { topThreshold = 96, hideDelta = 10, showDelta = 8 } = options;
  const [isVisible, setIsVisible] = useState(true);
  const isVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateVisibility = () => {
      frameIdRef.current = null;

      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      let nextVisible = isVisibleRef.current;

      if (currentY < topThreshold) {
        nextVisible = true;
      } else if (delta > hideDelta) {
        nextVisible = false;
      } else if (delta < -showDelta) {
        nextVisible = true;
      }

      if (nextVisible !== isVisibleRef.current) {
        isVisibleRef.current = nextVisible;
        setIsVisible(nextVisible);
      }

      lastScrollYRef.current = currentY;
    };

    const onScroll = () => {
      if (frameIdRef.current != null) {
        return;
      }
      frameIdRef.current = window.requestAnimationFrame(updateVisibility);
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frameIdRef.current != null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }
      window.removeEventListener("scroll", onScroll);
    };
  }, [hideDelta, showDelta, topThreshold]);

  return isVisible;
}
