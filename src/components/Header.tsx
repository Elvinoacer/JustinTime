"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  Menu,
  X,
  Bell,
  PlusCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
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
    router.push("/dashboard/services");
  };

  const handleNotifications = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    router.push("/dashboard/notifications");
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
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg shrink-0"
            >
              <Image
                src="/images/JustinTimeLogo.png"
                alt="JustInTime Logo"
                width={128}
                height={32}
                className="h-7 sm:h-8 w-auto"
              />
              <span
                className={`text-base sm:text-lg font-bold tracking-tight ${
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
                className={`lg:hidden p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
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
                    className={`lg:hidden relative p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
                      isLandingPage
                        ? "hover:bg-white/[0.08]"
                        : "hover:bg-gray-100"
                    }`}
                    aria-label="Notifications"
                  >
                    <Bell
                      className={`w-5 h-5 ${isLandingPage ? "text-white/70" : "text-gray-600"}`}
                    />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full" />
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
                      className={`relative p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
                        isLandingPage
                          ? "hover:bg-white/[0.08]"
                          : "hover:bg-gray-100"
                      }`}
                      aria-label="Notifications"
                    >
                      <Bell
                        className={`w-5 h-5 ${isLandingPage ? "text-white/70" : "text-gray-600"}`}
                      />
                      <span
                        className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isLandingPage ? "bg-emerald-400" : "bg-red-500"}`}
                      />
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
                                  href: "/dashboard/profile",
                                  icon: User,
                                  label: "My Profile",
                                },
                                {
                                  href: "/dashboard",
                                  icon: LayoutDashboard,
                                  label: "Dashboard",
                                },
                                {
                                  href: "/client/bookings",
                                  icon: Calendar,
                                  label: "My Bookings",
                                },
                                {
                                  href: "/dashboard/settings",
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
                                onClick={() => signOut({ callbackUrl: "/" })}
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
                    className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center"
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
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02]"
                    >
                      Get Started →
                    </Link>
                  </div>

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(true)}
                    className={`lg:hidden p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/JustinTimeLogo.png"
                    alt="JustInTime Logo"
                    width={112}
                    height={28}
                    className="h-7 w-auto"
                  />
                  <span className="text-gray-900 text-lg font-bold tracking-tight">
                    JustInTime
                  </span>
                </div>
                <button
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={index}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                          pathname === item.href
                            ? "bg-emerald-50 text-emerald-600 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {isAuthenticated && (
                  <div className="border-t border-gray-200 my-4" />
                )}

                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl mb-4">
                      <div
                        className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-emerald-500 shrink-0"
                        style={{
                          backgroundImage: `url(${session.user?.image || "/default-avatar.png"})`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {session.user?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {[
                        {
                          href: "/dashboard",
                          icon: LayoutDashboard,
                          label: "Dashboard",
                        },
                        {
                          href: "/client/bookings",
                          icon: Calendar,
                          label: "My Bookings",
                        },
                        {
                          href: "/dashboard/profile",
                          icon: User,
                          label: "My Profile",
                        },
                        {
                          href: "/dashboard/settings",
                          icon: Settings,
                          label: "Settings",
                        },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="font-medium">{label}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="mt-6 px-4">
                    <p className="text-sm text-gray-500">
                      Sign in to access all features
                    </p>
                  </div>
                )}
              </nav>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <motion.button
                      onClick={handlePostService}
                      className="flex w-full items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircle className="w-5 h-5" />
                      Post a Service
                    </motion.button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center justify-center gap-2 px-6 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors text-sm"
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
                      className="block w-full px-4 py-3.5 bg-emerald-600 text-white rounded-xl text-center font-bold text-sm"
                    >
                      Get Started
                    </Link>
                    <Link
                      href="/auth/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-center font-semibold text-sm"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
