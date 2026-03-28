"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

/**
 * When the hero section scrolls under the header, compact the sticky browse toolbar
 * (mirrors behaviour on /services).
 */
export function useHeroToolbarCompact(
  heroRef: RefObject<HTMLElement | null>,
): boolean {
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const update = () => {
      const r = hero.getBoundingClientRect();
      setCompact(r.bottom <= 1);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [heroRef]);

  return compact;
}
