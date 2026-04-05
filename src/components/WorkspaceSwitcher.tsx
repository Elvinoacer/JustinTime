"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { hasRole } from "@/lib/auth/roles";
import { getWorkspaceSwitchUrl } from "@/lib/auth/workspace";

interface WorkspaceSwitcherProps {
  /** Which sidebar variant to style for */
  variant?: "client" | "provider" | "mobile";
  /** Called after navigation (e.g., to close mobile sidebar) */
  onNavigate?: () => void;
}

export default function WorkspaceSwitcher({
  variant = "client",
  onNavigate,
}: WorkspaceSwitcherProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  const isProvider = hasRole(session?.user, "PROVIDER");
  const isClient = hasRole(session?.user, "CLIENT");
  const hasMultipleRoles = isProvider && isClient;

  const currentWorkspace =
    (session?.user?.preferredWorkspace as "CLIENT" | "PROVIDER") ?? "CLIENT";
  const targetWorkspace: "CLIENT" | "PROVIDER" =
    currentWorkspace === "PROVIDER" ? "CLIENT" : "PROVIDER";
  const targetUrl = getWorkspaceSwitchUrl(currentWorkspace);
  const targetWorkspaceLabel =
    targetWorkspace === "PROVIDER" ? "Provider" : "Client";
  const targetLabel =
    targetWorkspace === "PROVIDER" ? "Provider Dashboard" : "Client Dashboard";

  if (!hasMultipleRoles) {
    if (isClient && !isProvider) {
      if (variant === "provider") {
        return (
          <Link
            href="/become-a-provider"
            className="group flex w-full items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-300 transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-500/20 hover:text-emerald-200"
          >
            <span className="material-symbols-outlined text-xl text-emerald-300 shrink-0">
              add_business
            </span>
            Become a Provider
          </Link>
        );
      }

      if (variant === "mobile") {
        return (
          <Link
            href="/become-a-provider"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
          >
            <span className="material-symbols-outlined text-sm">
              add_business
            </span>
            Become a Provider
          </Link>
        );
      }

      return (
        <Link
          href="/become-a-provider"
          className="group flex w-full items-center gap-3 px-3 py-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-200 text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-xl text-emerald-600 shrink-0">
            add_business
          </span>
          Become a Provider
        </Link>
      );
    }

    return null;
  }

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      const response = await fetch("/api/user/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspace: targetWorkspace }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Failed to switch workspace");
      }

      await update({
        user: {
          ...session?.user,
          preferredWorkspace: targetWorkspace,
        },
      });

      onNavigate?.();
      router.push(targetUrl);
      router.refresh();
      toast.success(`Switched to ${targetWorkspaceLabel} mode`);
    } catch (error) {
      console.error("[WORKSPACE_SWITCH_ERROR]", error);
      toast.error("Could not switch workspace. Try again.");
    } finally {
      setIsSwitching(false);
    }
  };

  if (variant === "mobile") {
    return (
      <button
        onClick={handleSwitch}
        disabled={isSwitching}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">swap_horiz</span>
        {isSwitching ? "Switching..." : `Switch to ${targetWorkspaceLabel}`}
      </button>
    );
  }

  if (variant === "provider") {
    return (
      <button
        onClick={handleSwitch}
        disabled={isSwitching}
        className="group flex w-full items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
        aria-label={`Switch to ${targetLabel}`}
      >
        <span
          className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400 shrink-0"
          aria-hidden="true"
        >
          swap_horiz
        </span>
        <span className="text-sm font-semibold truncate">
          {isSwitching ? "Switching..." : targetLabel}
        </span>
      </button>
    );
  }

  // Client variant
  return (
    <button
      onClick={handleSwitch}
      disabled={isSwitching}
      className="flex w-full items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl transition-all duration-200 group text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
      aria-label={`Switch to ${targetLabel}`}
    >
      <span
        className="material-symbols-outlined text-[18px] lg:text-[20px] transition-colors text-gray-400 group-hover:text-gray-600 shrink-0"
        aria-hidden="true"
      >
        swap_horiz
      </span>
      <span className="text-xs lg:text-sm truncate">
        {isSwitching ? "Switching..." : targetLabel}
      </span>
    </button>
  );
}
