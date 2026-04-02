"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { hasRole } from "@/lib/auth/roles";
import { useNotificationCounts } from "@/lib/hooks/useNotificationCounts";
import { signOutWithNotificationCleanup } from "@/lib/auth/signOutWithNotificationCleanup";

const navItems = [
  { name: "Dashboard", href: "/client/dashboard", icon: "dashboard" },
  { name: "Analytics", href: "/client/analytics", icon: "analytics" },
  { name: "Post a Job", href: "/client/post-job", icon: "add_circle" },
  { name: "My Jobs", href: "/client/jobs", icon: "work" },
  { name: "My Proposals", href: "/client/proposals", icon: "description" },
  { name: "Bookings", href: "/client/bookings", icon: "calendar_month" },
  { name: "Messages", href: "/client/messages", icon: "chat" },
  { name: "Wallet", href: "/client/wallet", icon: "account_balance_wallet" },
  { name: "Profile", href: "/client/profile", icon: "person" },
];

const secondaryItems = [
  {
    name: "Notifications",
    href: "/client/notifications",
    icon: "notifications",
  },
  { name: "Referral", href: "/client/referral", icon: "card_giftcard" },
  { name: "Settings", href: "/client/settings", icon: "settings" },
];

interface ClientSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const ClientSidebar = ({ isOpen, onClose }: ClientSidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState(false);
  const { unreadCount } = useNotificationCounts(pathname);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    if (isOpen && isMobile && onClose) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };

      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, isMobile, onClose]);

  return (
    <>
      <aside
        className="h-full w-full bg-white border-r border-gray-100 flex flex-col justify-between overflow-y-auto"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Mobile Header with Close Button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <Image
                src="/images/JustinTimeLogo.png"
                alt="JustInTime Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-lg text-gray-900">JustInTime</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-4">
          {/* Logo/Brand - Hidden on mobile (shown in header) */}
          <div className="hidden lg:flex items-center gap-3 px-2 py-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/images/JustinTimeLogo.png"
                  alt="JustInTime Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-xl text-gray-900">
                JustInTime
              </span>
            </Link>
          </div>

          {/* Two Column Layout for Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Main Navigation - Column 1 */}
            <div className="lg:col-span-2">
              <nav aria-label="Primary navigation" className="space-y-1">
                <h3 className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  Main Menu
                </h3>
                <ul className="flex flex-col gap-1" role="list">
                  {navItems.slice(0, 5).map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(`${item.href}/`);

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                          className={`
                            flex items-center gap-2 lg:gap-3 
                            px-3 py-2 lg:py-2.5 
                            rounded-xl lg:rounded-xl 
                            transition-all duration-200 
                            group w-full
                            ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }
                          `}
                        >
                          <span
                            className={`
                              material-symbols-outlined 
                              ${isMobile ? "text-[18px]" : "text-[20px]"}
                              transition-colors shrink-0
                              ${
                                isActive
                                  ? "text-emerald-600"
                                  : "text-gray-400 group-hover:text-gray-600"
                              }
                            `}
                            aria-hidden="true"
                          >
                            {item.icon}
                          </span>
                          <span className="text-xs lg:text-sm truncate">
                            {item.name}
                          </span>
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Secondary Navigation - Column 2 */}
            <div className="lg:col-span-2">
              <nav aria-label="Secondary navigation" className="space-y-1">
                <h3 className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  More
                </h3>
                <ul className="flex flex-col gap-1" role="list">
                  {navItems.slice(5).map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname?.startsWith(`${item.href}/`);

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                          className={`
                            flex items-center gap-2 lg:gap-3 
                            px-3 py-2 lg:py-2.5 
                            rounded-xl lg:rounded-xl 
                            transition-all duration-200 
                            group w-full
                            ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }
                          `}
                        >
                          <span
                            className={`
                              material-symbols-outlined 
                              ${isMobile ? "text-[18px]" : "text-[20px]"}
                              transition-colors shrink-0
                              ${
                                isActive
                                  ? "text-emerald-600"
                                  : "text-gray-400 group-hover:text-gray-600"
                              }
                            `}
                            aria-hidden="true"
                          >
                            {item.icon}
                          </span>
                          <span className="text-xs lg:text-sm truncate">
                            {item.name}
                          </span>
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </div>

          {/* Utility Items */}
          <div className="space-y-1">
            <h3 className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Utilities
            </h3>
            <ul className="flex flex-col gap-1" role="list">
              {secondaryItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);
                const isNotificationsItem =
                  item.href === "/client/notifications";

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        flex items-center gap-2 lg:gap-3 
                        px-3 py-2 lg:py-2.5 
                        rounded-xl lg:rounded-xl 
                        transition-all duration-200 
                        group w-full
                        ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <span
                          className={`
                            material-symbols-outlined 
                            ${isMobile ? "text-[18px]" : "text-[20px]"}
                            transition-colors
                            ${
                              isActive
                                ? "text-emerald-600"
                                : "text-gray-400 group-hover:text-gray-600"
                            }
                          `}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                        {isNotificationsItem && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-2 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold min-w-4 h-4 px-1">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs lg:text-sm truncate">
                        {item.name}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Dashboard Switch - Role-based */}
          <div className="pt-2 mt-2 border-t border-gray-100">
            {hasRole(session?.user, "PROVIDER") ? (
              <Link
                href="/dashboard"
                onClick={onClose}
                className="flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl transition-all duration-200 group text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
              >
                <span
                  className="material-symbols-outlined text-[18px] lg:text-[20px] transition-colors text-gray-400 group-hover:text-gray-600 shrink-0"
                  aria-hidden="true"
                >
                  swap_horiz
                </span>
                <span className="text-xs lg:text-sm truncate">
                  Provider Dashboard
                </span>
              </Link>
            ) : (
              <Link
                href="/onboarding?upgrade=true"
                onClick={onClose}
                className="flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl transition-all duration-200 group bg-emerald-50 text-emerald-700 hover:bg-emerald-100 w-full"
              >
                <span
                  className="material-symbols-outlined text-[18px] lg:text-[20px] transition-colors text-emerald-600 shrink-0"
                  aria-hidden="true"
                >
                  work
                </span>
                <span className="text-xs lg:text-sm font-medium truncate">
                  Become a Provider
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* User Profile - Fixed at bottom */}
        <div
          className="sticky bottom-0 bg-white border-t border-gray-100 p-4"
          role="region"
          aria-label="User profile"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="bg-gray-100 rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-gray-400 text-sm lg:text-base">
                  person
                </span>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-gray-900 text-xs lg:text-sm font-semibold truncate">
                {session?.user?.name || "Client"}
              </h2>
              <p className="text-gray-500 text-[10px] lg:text-xs truncate">
                {session?.user?.email || "client@example.com"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void signOutWithNotificationCleanup({
                  callbackUrl: "/auth/login",
                });
              }}
              className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1 lg:p-1.5 hover:bg-red-50 rounded-lg shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <span className="material-symbols-outlined text-base lg:text-xl">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ClientSidebar;
