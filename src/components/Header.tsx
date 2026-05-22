"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { hasRole } from "@/lib/auth/roles";
import { useNotificationCounts } from "@/lib/hooks/useNotificationCounts";
import { getNotificationCenterPath } from "@/lib/notifications/routing";
import { signOutWithNotificationCleanup } from "@/lib/auth/signOutWithNotificationCleanup";
import {
  Menu,
  X,
  Bell,
  PlusCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Home,
  Briefcase,
  Users,
  Info,
  Phone,
  Calendar,
  LayoutDashboard,
  Wrench,
} from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated";
  const isLandingPage = pathname === "/";
  const isLoading = status === "loading";
  const { unreadCount } = useNotificationCounts(pathname, isAuthenticated);

  const notificationRoute = hasRole(session?.user, "ADMIN")
    ? getNotificationCenterPath("ADMIN")
    : hasRole(session?.user, "PROVIDER")
      ? getNotificationCenterPath("PROVIDER")
      : getNotificationCenterPath("CLIENT");
  const isAdmin = hasRole(session?.user, "ADMIN");
  const isProvider = !isAdmin && hasRole(session?.user, "PROVIDER");
  const dashboardRoute = isAdmin
    ? "/admin/dashboard"
    : isProvider
      ? "/dashboard"
      : "/client/dashboard";
  const profileRoute = isAdmin
    ? "/admin/dashboard"
    : isProvider
      ? "/dashboard/profile"
      : "/client/profile";
  const settingsRoute = isAdmin
    ? "/admin/dashboard"
    : isProvider
      ? "/dashboard/settings"
      : "/client/settings";
  const bookingsRoute = isProvider ? "/dashboard/bookings" : "/client/bookings";

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Services", href: "/services", icon: Wrench },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Professionals", href: "/professionals", icon: Users },
    { name: "About", href: "/about", icon: Info },
    { name: "Contact", href: "/contact", icon: Phone },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handlePostService = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    if (isProvider) {
      router.push("/dashboard/services");
    } else {
      router.push("/become-a-provider");
    }
  };

  const handleNotifications = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    router.push(notificationRoute);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isLandingPage
            ? isScrolled
              ? "border-b border-white/[0.06] bg-[#0a0f0d]/90 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
              : "border-b border-white/[0.04] bg-transparent backdrop-blur-sm"
            : isScrolled
              ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50"
              : "bg-white border-b border-gray-200"
        }`}
      >
        <div className="px-3 py-2.5 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:gap-3 shrink-0"
            >
              <span
                className={`grid h-10 w-12 place-items-center rounded-lg sm:h-11 sm:w-14 ${
                  isLandingPage
                    ? "bg-white/[0.08] shadow-[0_0_20px_-10px_rgba(153,246,228,0.9)] ring-1 ring-white/10"
                    : "bg-emerald-950 ring-1 ring-emerald-900/20"
                }`}
              >
                <Image
                  src="/images/jit_logo-removebg-preview.png"
                  alt="JustInTime Logo"
                  width={96}
                  height={64}
                  priority={isLandingPage}
                  className={`h-8 w-auto object-contain sm:h-9 ${
                    isLandingPage
                      ? "brightness-[2.6] contrast-125 drop-shadow-[0_0_8px_rgba(153,246,228,0.55)]"
                      : "brightness-110 contrast-125"
                  }`}
                />
              </span>
              <span
                className={`hidden min-[360px]:inline text-sm font-bold tracking-tight sm:text-lg ${
                  isLandingPage ? "text-white" : "text-gray-900"
                }`}
              >
                JustInTime
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-200 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    pathname === item.href
                      ? isLandingPage
                        ? "text-emerald-400 bg-emerald-400/10"
                        : "text-emerald-600 bg-emerald-50"
                      : isLandingPage
                        ? "text-white/65 hover:text-white hover:bg-white/[0.06]"
                        : "text-gray-600 hover:text-emerald-600 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Mobile Search Button */}
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className={`lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors ${
                  isLandingPage ? "hover:bg-white/[0.08]" : "hover:bg-gray-100"
                }`}
                aria-label="Toggle search"
              >
                <svg
                  className={`w-5 h-5 ${isLandingPage ? "text-white/70" : "text-gray-600"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>

              {isLoading ? (
                <div className="hidden lg:flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full animate-pulse ${isLandingPage ? "bg-white/10" : "bg-gray-200"}`}
                  />
                </div>
              ) : isAuthenticated ? (
                <>
                  {/* Mobile Notification Bell */}
                  <button
                    onClick={handleNotifications}
                    className={`lg:hidden relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors ${
                      isLandingPage
                        ? "hover:bg-white/[0.08]"
                        : "hover:bg-gray-100"
                    }`}
                    aria-label="Notifications"
                  >
                    <Bell
                      className={`w-5 h-5 ${isLandingPage ? "text-white/70" : "text-gray-600"}`}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Desktop Authenticated Actions */}
                  <div className="hidden lg:flex items-center gap-2">
                    <motion.button
                      onClick={handlePostService}
                      className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                        isLandingPage
                          ? "bg-emerald-500/90 hover:bg-emerald-500 shadow-emerald-500/20"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircle className="w-4 h-4" />
                      Post Service
                    </motion.button>

                    <button
                      onClick={handleNotifications}
                      className={`relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors ${
                        isLandingPage
                          ? "hover:bg-white/[0.08]"
                          : "hover:bg-gray-100"
                      }`}
                      aria-label="Notifications"
                    >
                      <Bell
                        className={`w-5 h-5 ${isLandingPage ? "text-white/70" : "text-gray-600"}`}
                      />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* User Profile Dropdown */}
                    <Popover className="relative">
                      <Popover.Button
                        className={`outline-none flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                          isLandingPage
                            ? "hover:bg-white/[0.08]"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full bg-cover bg-center border-2 ${
                            isLandingPage
                              ? "border-emerald-400/60"
                              : "border-emerald-500"
                          }`}
                          style={{
                            backgroundImage: `url(${session.user?.image || "/default-avatar.png"})`,
                          }}
                        />
                        <ChevronDown
                          className={`w-4 h-4 ${isLandingPage ? "text-white/70" : "text-gray-600"}`}
                        />
                      </Popover.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                      >
                        <Popover.Panel className="absolute right-0 z-10 mt-3 w-56 origin-top-right">
                          <div className="overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                            <div className="p-3 border-b border-gray-100">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {session.user?.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {session.user?.email}
                              </p>
                            </div>
                            <div className="py-2">
                              {[
                                {
                                  href: profileRoute,
                                  icon: User,
                                  label: "My Profile",
                                },
                                {
                                  href: dashboardRoute,
                                  icon: LayoutDashboard,
                                  label: "Dashboard",
                                },
                                {
                                  href: bookingsRoute,
                                  icon: Calendar,
                                  label: "My Bookings",
                                },
                                {
                                  href: settingsRoute,
                                  icon: Settings,
                                  label: "Settings",
                                },
                              ].map(({ href, icon: Icon, label }) => (
                                <Link
                                  key={href}
                                  href={href}
                                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                >
                                  <Icon className="w-4 h-4" />
                                  {label}
                                </Link>
                              ))}
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  void signOutWithNotificationCleanup({
                                    callbackUrl: "/",
                                  });
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                              </button>
                            </div>
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  </div>

                  {/* Mobile Avatar */}
                  <button
                    onClick={() => setIsMenuOpen(true)}
                    className="lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center"
                    aria-label="Open menu"
                  >
                    <div
                      className={`w-8 h-8 rounded-full bg-cover bg-center border-2 ${
                        isLandingPage
                          ? "border-emerald-400/60"
                          : "border-emerald-500"
                      }`}
                      style={{
                        backgroundImage: `url(${session.user?.image || "/default-avatar.png"})`,
                      }}
                    />
                  </button>
                </>
              ) : (
                <>
                  {/* Desktop Unauthenticated */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Link
                      href="/auth/login"
                      className={`px-4 py-2 text-sm font-semibold transition-colors rounded-lg ${
                        isLandingPage
                          ? "text-white/70 hover:text-white hover:bg-white/[0.06]"
                          : "text-gray-700 hover:text-emerald-600"
                      }`}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02]"
                    >
                      Get Started →
                    </Link>
                  </div>

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(true)}
                    className={`lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors ${
                      isLandingPage
                        ? "hover:bg-white/[0.08]"
                        : "hover:bg-gray-100"
                    }`}
                    aria-label="Open menu"
                  >
                    <Menu
                      className={`w-5 h-5 ${isLandingPage ? "text-white/80" : "text-gray-700"}`}
                    />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <AnimatePresence>
            {isMobileSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden mt-3 overflow-hidden"
              >
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search services, professionals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    autoFocus
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      isLandingPage
                        ? "bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/40"
                        : "bg-gray-50 border border-gray-200 text-gray-900"
                    }`}
                  />
                  <svg
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLandingPage ? "text-white/40" : "text-gray-400"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 overflow-hidden bg-[#010705]/72 backdrop-blur-[3px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              className="absolute inset-y-2 right-2 flex w-[min(92vw,23rem)] max-w-full flex-col overflow-hidden rounded-3xl border border-emerald-300/25 bg-linear-to-b from-[#081612]/95 via-[#0b1f18]/92 to-[#07140f]/95 shadow-[0_32px_90px_-18px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="pointer-events-none absolute -top-20 -right-14 h-52 w-52 rounded-full bg-emerald-400/38 blur-3xl"
                animate={{ x: [0, -10, 0], y: [0, 9, 0], scale: [1, 1.07, 1] }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="pointer-events-none absolute bottom-6 -left-20 h-56 w-56 rounded-full bg-cyan-400/28 blur-3xl"
                animate={{ x: [0, 10, 0], y: [0, -8, 0], scale: [1, 1.1, 1] }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/[0.07] via-transparent to-black/24" />
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/55 to-transparent" />

              {/* Menu Header */}
              <div className="relative z-10 border-b border-white/10 bg-white/[0.02] px-4 py-4 backdrop-blur-xl sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-14 place-items-center rounded-lg bg-white/[0.08] ring-1 ring-white/10">
                        <Image
                          src="/images/jit_logo-removebg-preview.png"
                          alt="JustInTime Logo"
                          width={96}
                          height={64}
                          className="h-9 w-auto object-contain brightness-[2.6] contrast-125 drop-shadow-[0_0_8px_rgba(153,246,228,0.55)]"
                        />
                      </span>
                      <span className="text-white text-lg font-bold tracking-tight">
                        JustInTime
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-emerald-100/72">
                      Find trusted local services faster
                    </p>
                  </div>

                  <button
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/14 bg-white/[0.05] p-2 text-slate-100 shadow-sm transition-colors hover:bg-white/[0.11]"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="relative z-10 flex-1 overflow-y-auto px-3 pb-4 pt-3 sm:px-4">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/58">
                  Explore
                </p>

                <div className="space-y-2">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + index * 0.055, duration: 0.24 }}
                      >
                        <Link
                          href={item.href}
                          className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 transition-all duration-200 ${
                            isActive
                              ? "border-emerald-300/55 bg-linear-to-r from-emerald-400/28 via-emerald-300/16 to-transparent text-white shadow-[0_14px_32px_-24px_rgba(16,185,129,0.95)]"
                              : "border-white/12 bg-white/[0.03] text-slate-100 hover:border-emerald-300/35 hover:bg-emerald-400/8"
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                              isActive
                                ? "border-emerald-300/55 bg-emerald-400/14 text-emerald-100"
                                : "border-white/14 bg-black/22 text-slate-200"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-semibold tracking-tight">
                            {item.name}
                          </span>
                          <ChevronRight
                            className={`ml-auto h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 ${
                              isActive ? "text-emerald-200" : "text-slate-400"
                            }`}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {isAuthenticated && (
                  <div className="my-4 border-t border-white/10" />
                )}

                {isAuthenticated ? (
                  <>
                    <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/58">
                      Workspace
                    </p>

                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-300/24 bg-linear-to-r from-emerald-400/16 to-cyan-400/10 p-3.5 shadow-[0_14px_28px_-24px_rgba(16,185,129,0.9)] backdrop-blur-sm sm:p-4">
                      <div
                        className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-emerald-500 shrink-0"
                        style={{
                          backgroundImage: `url(${session.user?.image || "/default-avatar.png"})`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {session.user?.name}
                        </p>
                        <p className="text-xs text-emerald-100/74 truncate">
                          {session.user?.email}
                        </p>
                      </div>

                      <span className="inline-flex items-center rounded-full border border-emerald-300/45 bg-emerald-400/18 px-2 py-1 text-[10px] font-semibold text-emerald-100">
                        Active
                      </span>
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          href: dashboardRoute,
                          icon: LayoutDashboard,
                          label: "Dashboard",
                        },
                        {
                          href: bookingsRoute,
                          icon: Calendar,
                          label: "My Bookings",
                        },
                        {
                          href: profileRoute,
                          icon: User,
                          label: "My Profile",
                        },
                        {
                          href: settingsRoute,
                          icon: Settings,
                          label: "Settings",
                        },
                      ].map(({ href, icon: Icon, label }, index) => (
                        <motion.div
                          key={href}
                          initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.16 + index * 0.05, duration: 0.22 }}
                        >
                          <Link
                            href={href}
                            onClick={() => setIsMenuOpen(false)}
                            className="group flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.03] px-3.5 py-3.5 text-slate-100 transition-all duration-200 hover:border-emerald-300/35 hover:bg-emerald-400/8 hover:text-emerald-100"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/14 bg-black/22 text-slate-200">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="font-semibold tracking-tight">
                              {label}
                            </span>
                            <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 shadow-sm">
                    <p className="text-sm font-semibold text-white">
                      Unlock your dashboard
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-100/74">
                      Sign in to track bookings, chat with professionals, and
                      manage payments in one place.
                    </p>
                  </div>
                )}
              </nav>

              {/* Footer Actions */}
              <div className="relative z-10 border-t border-white/10 bg-black/22 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-4">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <motion.button
                      onClick={handlePostService}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 via-emerald-400 to-teal-400 px-6 py-3.5 text-sm font-semibold text-[#02261a] shadow-[0_18px_34px_-18px_rgba(16,185,129,0.95)] transition-all hover:from-emerald-400 hover:to-teal-300"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircle className="w-5 h-5" />
                      Post a Service
                    </motion.button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        void signOutWithNotificationCleanup({
                          callbackUrl: "/",
                        });
                      }}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-red-300/30 bg-red-400/8 px-6 py-3 text-sm font-semibold text-red-100 transition-colors hover:bg-red-400/14"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className="block min-h-[44px] w-full rounded-2xl bg-linear-to-r from-emerald-500 via-emerald-400 to-teal-400 px-4 py-3.5 text-center text-sm font-bold text-[#02261a] shadow-[0_18px_34px_-18px_rgba(16,185,129,0.95)]"
                    >
                      Get Started
                    </Link>
                    <Link
                      href="/auth/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block min-h-[44px] w-full rounded-2xl border border-white/18 bg-white/[0.06] px-4 py-3 text-center text-sm font-semibold text-slate-100"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                <p className="mt-2 text-center text-[11px] text-emerald-100/56">
                  Need help? Contact support any time.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
