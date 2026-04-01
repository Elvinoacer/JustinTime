"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * When the hero section scrolls under the header, compact the sticky browse toolbar
 * (mirrors behaviour on /services).
 */
export function useHeroToolbarCompact(
  heroRef: RefObject<HTMLElement | null>,
): boolean {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      const r = hero.getBoundingClientRect();

      // Add hysteresis so the toolbar doesn't rapidly flip state around the boundary.
      const nextCompact = compactRef.current ? r.bottom <= 24 : r.bottom <= 0;
      if (nextCompact === compactRef.current) {
        return;
      }

      compactRef.current = nextCompact;
      setCompact(nextCompact);
    };

    const queueUpdate = () => {
      if (frameId != null) {
        return;
      }
      frameId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate, { passive: true });
    return () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
    };
  }, [heroRef]);

  return compact;
}
