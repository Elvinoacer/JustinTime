"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hasRole } from "@/lib/auth/roles";
import { getWorkspaceSwitchUrl } from "@/lib/auth/workspace";

interface WorkspaceSwitcherProps {
  /** Which sidebar variant to style for */
  variant?: "client" | "provider";
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

  // If user doesn't have both roles, don't render the switcher
  if (!hasMultipleRoles) return null;

  const currentWorkspace =
    (session?.user?.preferredWorkspace as "CLIENT" | "PROVIDER") ?? "CLIENT";
  const targetWorkspace: "CLIENT" | "PROVIDER" =
    currentWorkspace === "PROVIDER" ? "CLIENT" : "PROVIDER";
  const targetUrl = getWorkspaceSwitchUrl(currentWorkspace);
  const targetLabel =
    targetWorkspace === "PROVIDER" ? "Provider Dashboard" : "Client Dashboard";

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      await fetch("/api/user/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspace: targetWorkspace }),
      });

      await update({
        user: {
          ...session?.user,
          preferredWorkspace: targetWorkspace,
        },
      });

      onNavigate?.();
      router.push(targetUrl);
      router.refresh();
    } catch (error) {
      console.error("[WORKSPACE_SWITCH_ERROR]", error);
    } finally {
      setIsSwitching(false);
    }
  };

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
