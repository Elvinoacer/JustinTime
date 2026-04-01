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
  const { topThreshold = 120, hideDelta = 14, showDelta = 12 } = options;
  const [isVisible, setIsVisible] = useState(true);
  const isVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const directionRef = useRef<-1 | 0 | 1>(0);
  const directionAnchorYRef = useRef(0);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateVisibility = () => {
      frameIdRef.current = null;

      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      const absDelta = Math.abs(delta);
      let nextVisible = isVisibleRef.current;

      if (currentY < topThreshold) {
        nextVisible = true;
        directionRef.current = 0;
        directionAnchorYRef.current = currentY;
      } else if (absDelta >= 1) {
        const nextDirection: -1 | 1 = delta > 0 ? 1 : -1;

        if (nextDirection !== directionRef.current) {
          directionRef.current = nextDirection;
          directionAnchorYRef.current = lastScrollYRef.current;
        }

        if (
          nextDirection > 0 &&
          currentY - directionAnchorYRef.current >= hideDelta
        ) {
          nextVisible = false;
          directionAnchorYRef.current = currentY;
        } else if (
          nextDirection < 0 &&
          directionAnchorYRef.current - currentY >= showDelta
        ) {
          nextVisible = true;
          directionAnchorYRef.current = currentY;
        }
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
    directionAnchorYRef.current = window.scrollY;
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
