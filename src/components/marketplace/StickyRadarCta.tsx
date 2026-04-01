"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "jit_hide_unified_radar_cta_v1";

export default function StickyRadarCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors and still hide for this session.
    }
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-4 md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Link
          href="/radar"
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-700/30 transition-colors hover:bg-emerald-700"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            radar
          </span>
          Open Unified Radar
        </Link>

        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-lg shadow-slate-300/20 transition-colors hover:bg-slate-50 hover:text-slate-700"
          aria-label="Dismiss radar shortcut"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            close
          </span>
        </button>
      </div>
    </div>
  );
}