"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import LanguageSwitcher from "./common/LanguageSwitcher";
import { hasRole } from "@/lib/auth/roles";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    description: "Overview",
  },
  {
    name: "Messages",
    href: "/dashboard/messages",
    icon: "chat",
    description: "Chat with clients",
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: "bar_chart",
    description: "Performance stats",
  },
  {
    name: "Jobs",
    href: "/dashboard/jobs",
    icon: "work",
    description: "Job applications",
  },
  {
    name: "Services",
    href: "/dashboard/services",
    icon: "construction",
    description: "Manage services",
  },
  {
    name: "Expenses",
    href: "/dashboard/expenses",
    icon: "receipt_long",
    description: "Receipts & Costs",
  },
  {
    name: "Bookings",
    href: "/dashboard/bookings",
    icon: "calendar_month",
    description: "View bookings",
  },
  {
    name: "Earnings",
    href: "/dashboard/earnings",
    icon: "payments",
    description: "Track income",
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: "person",
    description: "Edit profile",
  },
  {
    name: "Team",
    href: "/dashboard/team",
    icon: "groups",
    description: "Agency & Crew",
  },
  {
    name: "Surge Pricing",
    href: "/dashboard/surge-pricing-demo",
    icon: "bolt",
    description: "Dynamic Pricing",
  },
  {
    name: "Achievements",
    href: "/dashboard/achievements",
    icon: "emoji_events",
    description: "Badges & Points",
  },
  {
    name: "Reviews",
    href: "/dashboard/reviews",
    icon: "grade",
    description: "Customer feedback",
  },
];

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

const Sidebar = ({
  onClose,
  isCollapsed = false,
  toggleCollapse,
}: SidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`flex h-full flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 shadow-2xl transition-all duration-300 overflow-hidden ${
        isCollapsed ? "w-20" : "w-72"
      }`}
      role="complementary"
      aria-label="Main navigation"
    >
      {/* Fixed Header */}
      <div
        className={`flex-shrink-0 p-6 border-b border-gray-700/50 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}
      >
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-2 -m-2"
          onClick={handleLinkClick}
        >
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img
              src="/images/JustinTimeLogo.png"
              alt="JustInTime Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0"
            >
              <span className="font-bold text-xl text-white tracking-tight block truncate">
                JustInTime
              </span>
              <p className="text-xs text-gray-400 truncate">Provider Portal</p>
            </motion.div>
          )}
        </Link>
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Scrollable Navigation */}
      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#374151 transparent",
        }}
      >
        <ul className="flex flex-col gap-1" role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${item.name} - ${item.description}`}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <motion.div
                    className={`flex items-center gap-3 w-full ${isCollapsed ? "justify-center" : ""}`}
                    whileHover={{ x: isActive || isCollapsed ? 0 : 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <span
                      className={`material-symbols-outlined text-xl flex-shrink-0 ${
                        isActive
                          ? "text-white"
                          : "text-gray-400 group-hover:text-emerald-400"
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold block truncate">
                          {item.name}
                        </span>
                        {!isActive && (
                          <span className="text-xs text-gray-500 group-hover:text-gray-400 block truncate">
                            {item.description}
                          </span>
                        )}
                      </div>
                    )}
                    {isActive && !isCollapsed && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-4 border-t border-gray-700/50" />

        {/* Secondary Actions */}
        <ul className="flex flex-col gap-1" role="list">
          {/* Dashboard Switch - Only for PROVIDER role */}
          {hasRole(session?.user, "PROVIDER") && (
            <li>
              <Link
                href="/client/dashboard"
                onClick={handleLinkClick}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isCollapsed ? "justify-center" : ""}`}
                aria-label="Switch to Client Dashboard"
                title={isCollapsed ? "Client Dashboard" : undefined}
              >
                <span
                  className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400 flex-shrink-0"
                  aria-hidden="true"
                >
                  swap_horiz
                </span>
                {!isCollapsed && (
                  <span className="text-sm font-semibold truncate">
                    Client Dashboard
                  </span>
                )}
              </Link>
            </li>
          )}
          <li>
            <Link
              href="/dashboard/notifications"
              onClick={handleLinkClick}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isCollapsed ? "justify-center" : ""}`}
              aria-label="Notifications"
              title={isCollapsed ? "Notifications" : undefined}
            >
              <span
                className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400 flex-shrink-0"
                aria-hidden="true"
              >
                notifications
              </span>
              {!isCollapsed && (
                <span className="text-sm font-semibold truncate">
                  Notifications
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/availability"
              onClick={handleLinkClick}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isCollapsed ? "justify-center" : ""}`}
              aria-label="Availability Schedule"
              title={isCollapsed ? "Availability" : undefined}
            >
              <span
                className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400 flex-shrink-0"
                aria-hidden="true"
              >
                schedule
              </span>
              {!isCollapsed && (
                <span className="text-sm font-semibold truncate">
                  Availability
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/settings"
              onClick={handleLinkClick}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isCollapsed ? "justify-center" : ""}`}
              aria-label="Settings"
              title={isCollapsed ? "Settings" : undefined}
            >
              <span
                className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400 flex-shrink-0"
                aria-hidden="true"
              >
                settings
              </span>
              {!isCollapsed && (
                <span className="text-sm font-semibold truncate">Settings</span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/premium"
              onClick={handleLinkClick}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400 hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isCollapsed ? "justify-center" : ""}`}
              aria-label="Upgrade to Premium"
              title={isCollapsed ? "Upgrade" : undefined}
            >
              <span
                className="material-symbols-outlined text-xl flex-shrink-0"
                aria-hidden="true"
              >
                workspace_premium
              </span>
              {!isCollapsed && (
                <span className="text-sm font-semibold truncate">
                  Upgrade to Pro
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/help"
              onClick={handleLinkClick}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isCollapsed ? "justify-center" : ""}`}
              aria-label="Help & Support"
              title={isCollapsed ? "Help" : undefined}
            >
              <span
                className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400 flex-shrink-0"
                aria-hidden="true"
              >
                help
              </span>
              {!isCollapsed && (
                <span className="text-sm font-semibold truncate">Help</span>
              )}
            </Link>
          </li>
        </ul>
      </nav>

      {/* Collapse Toggle Button (Desktop Only) */}
      <div className="hidden lg:flex justify-end px-4 py-2 border-t border-gray-700/50 bg-gray-900/30">
        <button
          onClick={toggleCollapse}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined text-xl">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Fixed Footer - User Profile */}
      <div className="flex-shrink-0 border-t border-gray-700/50 p-4 bg-gray-900/50 backdrop-blur-sm">
        {!isCollapsed && (
          <div className="mb-4">
            <LanguageSwitcher />
          </div>
        )}
        <div
          className={`flex items-center gap-3 mb-3 ${isCollapsed ? "justify-center" : ""}`}
        >
          <div
            className="relative bg-center bg-no-repeat bg-cover rounded-full size-11 ring-2 ring-emerald-500/30 flex-shrink-0 overflow-hidden"
            style={
              session?.user?.image
                ? { backgroundImage: `url("${session.user.image}")` }
                : {}
            }
            role="img"
            aria-label={`${session?.user?.name || "User"} profile picture`}
          >
            {!session?.user?.image && (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">
                  person
                </span>
              </div>
            )}
            <div
              className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-gray-900 rounded-full"
              title="Online"
              aria-label="Online status"
            />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-sm font-semibold leading-tight truncate">
                {session?.user?.name || "Loading..."}
              </h2>
              <p className="text-gray-400 text-xs font-medium capitalize truncate">
                {session?.user?.role?.toLowerCase() || "User"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group ${isCollapsed ? "justify-center" : "justify-center"}`}
          aria-label="Sign out"
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          {!isCollapsed && (
            <span className="text-sm font-semibold truncate">Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
