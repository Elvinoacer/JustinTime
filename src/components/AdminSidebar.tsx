"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Shield,
  ShieldAlert,
  Calendar,
  Briefcase,
  Gavel,
  Wallet,
  Headphones,
  CreditCard,
  Scale,
  Settings,
  LogOut,
  History,
  X,
  User,
  ChevronRight,
} from "lucide-react";
import { signOutWithNotificationCleanup } from "@/lib/auth/signOutWithNotificationCleanup";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Trust Center", href: "/admin/trust", icon: Shield },
  { name: "Verifications", href: "/admin/verifications", icon: Shield },
  { name: "Safety Ops", href: "/admin/safety", icon: ShieldAlert },
  { name: "Bookings", href: "/admin/bookings", icon: Calendar },
  { name: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { name: "Disputes", href: "/admin/disputes", icon: Gavel },
  { name: "Insurance", href: "/admin/insurance", icon: Wallet },
  { name: "Support", href: "/admin/support", icon: Headphones },
  { name: "Finance", href: "/admin/finance", icon: CreditCard },
  { name: "Reconciliation", href: "/admin/reconciliation", icon: Scale },
  { name: "Audit Logs", href: "/admin/logs", icon: History },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ onClose }: AdminSidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Sidebar */}
      <aside
        className="h-full w-full bg-slate-900 text-white border-r border-slate-800 flex flex-col overflow-y-auto"
        role="complementary"
        aria-label="Admin navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-800">
            <Link
              href="/admin"
              className="flex items-center gap-3"
              onClick={onClose}
            >
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl p-1.5">
                <Image
                  src="/images/JustinTimeLogo.png"
                  alt="JustInTime Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-lg text-white block">
                  Admin Panel
                </span>
                <span className="text-slate-400 text-xs">
                  Management Console
                </span>
              </div>
            </Link>

            {/* Close Button - Mobile Only */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 lg:p-6" aria-label="Primary navigation">
            <ul className="flex flex-col gap-1" role="list">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname?.startsWith(item.href));

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => window.innerWidth < 1024 && onClose?.()}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                        isActive
                          ? "bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-600/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-500 group-hover:text-white"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium flex-1">
                        {item.name}
                      </span>

                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white"
                        />
                      )}

                      {/* Hover arrow */}
                      <ChevronRight
                        className={`w-4 h-4 transition-all ${
                          isActive
                            ? "text-white opacity-100"
                            : "text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-white"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Admin Profile */}
          <div
            className="p-4 lg:p-6 border-t border-slate-800 bg-slate-800/50"
            role="region"
            aria-label="User profile"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden border-2 border-slate-600">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Admin"}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-sm font-semibold truncate">
                  {session?.user?.name || "Admin User"}
                </h2>
                <p className="text-slate-400 text-xs truncate">
                  {session?.user?.email || "admin@example.com"}
                </p>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  void signOutWithNotificationCleanup({
                    callbackUrl: "/auth/login",
                  });
                }}
                className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-xl transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats - Desktop Only */}
            <div className="hidden lg:block mt-4 pt-4 border-t border-slate-700">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                  <div className="text-emerald-400 font-semibold">24</div>
                  <div className="text-slate-400">Pending</div>
                </div>
                <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                  <div className="text-blue-400 font-semibold">156</div>
                  <div className="text-slate-400">Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
