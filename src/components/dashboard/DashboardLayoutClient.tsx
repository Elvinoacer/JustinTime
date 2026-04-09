"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";
import { OnboardingAccessNotice } from "@/components/revenue/OnboardingAccessNotice";
import { hasRole } from "@/lib/auth/roles";
import { useNotificationCounts } from "@/lib/hooks/useNotificationCounts";

const getMobileTitle = (pathname: string) => {
  if (pathname === "/dashboard") return "Jobs";
  if (pathname.startsWith("/dashboard/jobs")) return "Jobs";
  if (pathname.startsWith("/dashboard/bookings")) return "Bookings";
  if (pathname.startsWith("/dashboard/messages")) return "Messages";
  if (pathname.startsWith("/dashboard/requests")) return "Requests";
  if (pathname.startsWith("/dashboard/earnings")) return "Earnings";
  if (pathname.startsWith("/dashboard/profile")) return "Profile";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/team")) return "Team";
  if (pathname.startsWith("/dashboard/help")) return "Help";
  return "Dashboard";
};

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const { data: session } = useSession();
  const pathname = usePathname();
  const { unreadCount } = useNotificationCounts(pathname);

  const isProvider = hasRole(session?.user, "PROVIDER");
  const { data: profileData, isLoading: profileLoading } =
    useProviderProfile(isProvider);
  const needsVerificationActivation =
    isProvider &&
    profileData?.data &&
    !profileData.data.hasPaidOnboardingFee &&
    !profileData.data.onboardingFeeWaived;

  const mobileTitle = useMemo(() => getMobileTitle(pathname), [pathname]);
  const mobileNavItems = [
    { label: "Home", href: "/dashboard", icon: "home" },
    { label: "Jobs", href: "/dashboard/jobs", icon: "work" },
    { label: "Bookings", href: "/dashboard/bookings", icon: "calendar_month" },
    { label: "Messages", href: "/dashboard/messages", icon: "chat" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="fixed inset-0 flex bg-gray-50 overflow-hidden flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden shrink-0 flex items-center justify-between px-3 py-2.5 bg-white border-b border-gray-200 z-30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="h-11 w-11 shrink-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold">
                Provider
              </p>
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {mobileTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/messages"
              className="h-11 w-11 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Open messages"
            >
              <span className="material-symbols-outlined">chat</span>
            </Link>
            <Link
              href="/dashboard/notifications"
              className="relative h-11 w-11 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Open notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Sidebar Wrapper */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            ${isDesktopCollapsed ? "lg:w-20" : "lg:w-72"}
            w-72
          `}
        >
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            isCollapsed={isDesktopCollapsed}
            toggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          />
        </div>

        {/* Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main
          id="main-content"
          className="flex-1 p-3 sm:p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto w-full"
          role="main"
        >
          <div className="max-w-7xl mx-auto h-full min-h-[50vh]">
            {isProvider && profileLoading ? (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading profile...</p>
              </div>
            ) : (
              <>
                {needsVerificationActivation && (
                  <OnboardingAccessNotice
                    userName={session?.user?.name?.split(" ")[0] || "Provider"}
                    amount={profileData?.data?.onboardingFeeAmount}
                    storageKey={
                      session?.user?.id
                        ? `jit:onboarding-access-notice:${session.user.id}`
                        : undefined
                    }
                  />
                )}
                {children}
              </>
            )}
          </div>
        </main>

        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
          <nav className="grid grid-cols-5 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {mobileNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                isSidebarOpen
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span className="material-symbols-outlined text-base">menu</span>
              <span>Menu</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
