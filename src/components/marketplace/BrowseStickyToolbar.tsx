"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BrowseStickyToolbarProps = {
  /** True after the hero has scrolled away — tighter padding and shadow */
  compact: boolean;
  children: ReactNode;
  /** Optional second row (e.g. status tabs, category chips) */
  footer?: ReactNode;
};

export default function BrowseStickyToolbar({
  compact,
  children,
  footer,
}: BrowseStickyToolbarProps) {
  return (
    <div
      className={cn(
        "sticky z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-[box-shadow] duration-200 supports-[backdrop-filter]:bg-white/75",
        compact
          ? "shadow-[0_4px_18px_-12px_rgba(15,23,42,0.14)]"
          : "shadow-[0_8px_28px_-16px_rgba(15,23,42,0.12)]",
      )}
      style={{ top: "var(--public-header-h)" }}
    >
      <div
        className={cn(
          "mx-auto max-w-7xl px-2.5 sm:px-6 lg:px-8",
          compact ? "py-2" : "py-2.5 sm:py-3",
        )}
      >
        {children}
        {footer ? (
          <div
            className={cn(
              "mt-2 border-t border-slate-100/90 pt-2",
              compact && "mt-1.5 pt-1.5",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
