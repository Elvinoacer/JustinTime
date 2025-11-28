"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/services" },
    { name: "Jobs", href: "/jobs" },
    { name: "Professionals", href: "/professionals" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50"
            : "bg-white border-b border-gray-200"
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-8">
          <motion.div
            className="flex items-center gap-3 text-gray-900"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-800">
              <img src="/images/JustinTimeLogo.png" alt="JustInTime Logo" className="h-8 w-auto" />
              <h2 className="text-gray-900 text-xl font-bold leading-tight tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                JustInTime
              </h2>
            </Link>
          </motion.div>

          <nav className="hidden lg:flex items-center gap-6 lg:gap-8">
            {navItems.map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}>
                <Link
                  href={item.href}
                  className={`text-base font-medium leading-normal transition-colors duration-300 relative group ${
                    pathname === item.href
                      ? "text-emerald-600"
                      : "text-gray-600 hover:text-emerald-600"
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-emerald-500 transition-all duration-300 ${
                      pathname === item.href ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  ></span>
                </Link>
              </motion.div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="hidden lg:flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          ) : isAuthenticated ? (
            <div className="hidden lg:flex items-center gap-4">
              <motion.button
                onClick={handlePostService}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-emerald-600 text-white text-base font-bold leading-normal tracking-wide shadow-sm hover:bg-emerald-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="truncate">Post a Service</span>
              </motion.button>
              <button 
                onClick={handleNotifications}
                className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {/* You can add notification count badge here */}
              </button>
              
              {/* User Profile Dropdown */}
              <Popover className="relative">
                <Popover.Button className="outline-none">
                  <div
                    className="h-10 w-10 rounded-full bg-cover bg-center ring-2 ring-emerald-500 ring-offset-2 hover:ring-emerald-600 transition-all cursor-pointer"
                    style={{
                      backgroundImage: `url(${session.user?.image || "/default-avatar.png"})`,
                    }}
                  ></div>
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
                        <p className="text-sm font-semibold text-gray-900 truncate">{session.user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">person</span>
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">dashboard</span>
                          Dashboard
                        </Link>
                        <Link
                          href="/client/bookings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">event</span>
                          My Bookings
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">settings</span>
                          Settings
                        </Link>
                      </div>
                      <div className="py-2 border-t border-gray-100">
                        <button
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </Popover.Panel>
                </Transition>
              </Popover>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3">
              <motion.button
                onClick={() => signIn()}
                className="px-6 py-2 text-emerald-600 font-semibold hover:bg-emerald-50 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign In
              </motion.button>
              <motion.button
                onClick={() => signIn()}
                className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </div>
          )}

          <motion.button
            className="lg:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className="material-symbols-outlined text-gray-700">
              {isMenuOpen ? "close" : "menu"}
            </span>
          </motion.button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl p-6 flex flex-col z-50"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <img src="/images/JustinTimeLogo.png" alt="JustInTime Logo" className="h-8 w-auto" />
                  <h2 className="text-gray-900 text-xl font-bold">
                    JustInTime
                  </h2>
                </div>
                <button
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="flex flex-col gap-6 flex-1">
                {navItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      className="text-gray-700 hover:text-emerald-600 text-lg font-medium py-2 border-b border-gray-100 block"
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="flex flex-col gap-4 pt-8 border-t border-gray-200">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <div
                        className="h-12 w-12 rounded-full bg-cover bg-center ring-2 ring-emerald-500"
                        style={{
                          backgroundImage: `url(${session.user?.image || "/default-avatar.png"})`,
                        }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{session.user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined">dashboard</span>
                      Dashboard
                    </Link>
                    <Link
                      href="/client/bookings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined">event</span>
                      My Bookings
                    </Link>
                    <button
                      onClick={handlePostService }
                      className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Post a Service
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center justify-center gap-2 px-6 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined">logout</span>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <motion.button
                      onClick={() => signIn()}
                      className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 border-2 border-emerald-600 text-emerald-600 text-base font-bold leading-normal tracking-wide hover:bg-emerald-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Sign In
                    </motion.button>
                    <motion.button
                      onClick={() => signIn()}
                      className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-emerald-600 text-white text-base font-bold leading-normal tracking-wide shadow-sm hover:bg-emerald-700 transition-colors"
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