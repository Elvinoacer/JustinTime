"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
  const isLoading = status === "loading";

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Services", href: "/services", icon: Briefcase },
    { name: "Jobs", href: "/jobs", icon: Briefcase },
    { name: "Professionals", href: "/professionals", icon: Users },
    { name: "About", href: "/about", icon: Info },
    { name: "Contact", href: "/contact", icon: Phone },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

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

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      signIn();
      return;
    }
    router.push("/dashboard/profile");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50"
            : "bg-white border-b border-gray-200"
        }`}
      >
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="flex items-center gap-2 sm:gap-3">
                <img
                  src="/images/JustinTimeLogo.png"
                  alt="JustInTime Logo"
                  className="h-6 sm:h-8 w-auto"
                />
                <h2 className="text-gray-900 text-base sm:text-xl font-bold leading-tight">
                  JustInTime
                </h2>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-4 lg:gap-6 xl:gap-8">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 relative group ${
                    pathname === item.href
                      ? "text-emerald-600 bg-emerald-50"
                      : "text-gray-600 hover:text-emerald-600 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute -bottom-1 left-3 right-3 h-0.5 bg-emerald-500 transition-all duration-300 ${
                      pathname === item.href
                        ? "w-full"
                        : "w-0 group-hover:w-full"
                    }`}
                  ></span>
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* Mobile Search Button */}
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
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
                <div className="hidden lg:flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                </div>
              ) : isAuthenticated ? (
                <>
                  {/* Mobile Notification Bell */}
                  <button
                    onClick={handleNotifications}
                    className="lg:hidden relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>

                  {/* Desktop Authenticated Actions */}
                  <div className="hidden lg:flex items-center gap-2 md:gap-3">
                    <motion.button
                      onClick={handlePostService}
                      className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm min-h-[40px]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Post Service</span>
                    </motion.button>

                    <button
                      onClick={handleNotifications}
                      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5 text-gray-600" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* User Profile Dropdown */}
                    <Popover className="relative">
                      <Popover.Button className="outline-none flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <div
                          className="w-8 h-8 rounded-full bg-cover bg-center border-2 border-emerald-500"
                          style={{
                            backgroundImage: `url(${
                              session.user?.image || "/default-avatar.png"
                            })`,
                          }}
                        ></div>
                        <ChevronDown className="w-4 h-4 text-gray-600 hidden sm:block" />
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
                          <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="p-3 border-b border-gray-100">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {session.user?.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {session.user?.email}
                              </p>
                            </div>
                            <div className="py-2">
                              <Link
                                href="/dashboard/profile"
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              >
                                <User className="w-4 h-4" />
                                My Profile
                              </Link>
                              <Link
                                href="/dashboard"
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                              </Link>
                              <Link
                                href="/client/bookings"
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              >
                                <Calendar className="w-4 h-4" />
                                My Bookings
                              </Link>
                              <Link
                                href="/dashboard/settings"
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                Settings
                              </Link>
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
                    className="lg:hidden"
                    aria-label="Open menu"
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-cover bg-center border-2 border-emerald-500"
                      style={{
                        backgroundImage: `url(${
                          session.user?.image || "/default-avatar.png"
                        })`,
                      }}
                    ></div>
                  </button>
                </>
              ) : (
                <>
                  {/* Desktop Unauthenticated Actions */}
                  <div className="hidden lg:flex items-center gap-2 sm:gap-3">
                    <motion.button
                      onClick={() => signIn()}
                      className="px-3 sm:px-4 py-2 text-emerald-600 font-semibold hover:bg-emerald-50 rounded-lg transition-colors text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign In
                    </motion.button>
                    <motion.button
                      onClick={() => signIn()}
                      className="px-3 sm:px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Get Started
                    </motion.button>
                  </div>

                  {/* Mobile Menu Button for Unauthenticated */}
                  <button
                    onClick={() => setIsMenuOpen(true)}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Open menu"
                  >
                    <Menu className="w-5 h-5 text-gray-700" />
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
                className="lg:hidden mt-3"
              >
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search services, professionals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              className="absolute top-0 right-0 h-full w-4/5 max-w-sm bg-white shadow-2xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/JustinTimeLogo.png"
                    alt="JustInTime Logo"
                    className="h-6 w-auto"
                  />
                  <h2 className="text-gray-900 text-base font-bold">
                    JustInTime
                  </h2>
                </div>
                <button
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          pathname === item.href
                            ? "bg-emerald-50 text-emerald-600"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Divider */}
                {isAuthenticated && (
                  <div className="border-t border-gray-200 my-4"></div>
                )}

                {/* User Info & Actions */}
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg mb-4">
                      <div
                        className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-emerald-500"
                        style={{
                          backgroundImage: `url(${
                            session.user?.image || "/default-avatar.png"
                          })`,
                        }}
                      ></div>
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
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                      </Link>
                      <Link
                        href="/client/bookings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">My Bookings</span>
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <User className="w-5 h-5" />
                        <span className="font-medium">My Profile</span>
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                      >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mt-8">
                    <p className="text-sm text-gray-500 mb-4 px-4">
                      Sign in to access all features
                    </p>
                  </div>
                )}
              </nav>

              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200 space-y-3">
                {isAuthenticated ? (
                  <>
                    <motion.button
                      onClick={handlePostService}
                      className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                      whileHover={{ scale: 1.02 }}
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
                      className="flex w-full items-center justify-center gap-2 px-6 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors text-sm"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <motion.button
                      onClick={() => signIn()}
                      className="flex w-full items-center justify-center px-6 py-3 border-2 border-emerald-600 text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 transition-colors text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign In
                    </motion.button>
                    <motion.button
                      onClick={() => signIn()}
                      className="flex w-full items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Get Started
                    </motion.button>
                  </>
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
