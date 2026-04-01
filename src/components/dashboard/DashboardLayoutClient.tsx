"use client";

import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";
import { OnboardingAccessNotice } from "@/components/revenue/OnboardingAccessNotice";
import { hasRole } from "@/lib/auth/roles";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const { data: session } = useSession();

  const isProvider = hasRole(session?.user, "PROVIDER");
  const { data: profileData, isLoading: profileLoading } =
    useProviderProfile(isProvider);
  const needsVerificationActivation =
    isProvider &&
    profileData?.data &&
    !profileData.data.hasPaidOnboardingFee &&
    !profileData.data.onboardingFeeWaived;

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
        <div className="lg:hidden shrink-0 flex items-center justify-between p-4 bg-white border-b border-gray-200 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img
                src="/images/JustinTimeLogo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-lg text-gray-900">JustInTime</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
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
          className="flex-1 p-4 lg:p-8 overflow-y-auto w-full"
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
      </div>
    </>
  );
}
