"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  const user = {
    name: "Elvin",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdl8N_EVL-Gd0YIY4nl4FKR_ss93wWyW11IjR5QyVYoYmfsOSt3FTmxqvfRgqDyclWYUmHlEvK9JOPtlzRv1QP3ZVtCpOMSg94B-XK0J6TaCZinPljfyg1-HPphq-z5RYR8-NJaQaX1xhZg9j4Q1g0ciXvQu5QsmlCVIPG9jjtP4q73Kqhb34OjUOvV8x1W--8nFz9rdS48U-XvreG09Atgj1gY6f_nciYxYqjslEVh2aZCu9LhI7uoFg9e8TqkjHHB4u9LqD3MEg",
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/services" },
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
              <span className="material-symbols-outlined text-3xl bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
                hub
              </span>
              <h2 className="text-gray-900 text-xl font-bold leading-tight tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                JustInTime
              </h2>
            </Link>
          </motion.div>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
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
          <div className="hidden lg:flex items-center gap-4">
            <motion.button
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-gray-900 text-base font-bold leading-normal tracking-wide shadow-sm hover:bg-opacity-90 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="truncate">Post a Service</span>
            </motion.button>
            <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white"></span>
            </button>
            <button>
              <div
                className="h-10 w-10 rounded-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${user.imageUrl})`,
                }}
              ></div>
            </button>
          </div>

          <motion.button
            className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-300"
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
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
                  <span className="material-symbols-outlined text-3xl text-emerald-500">
                    hub
                  </span>
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
                  <motion.a
                    key={index}
                    className="text-gray-700 hover:text-emerald-600 text-lg font-medium py-2 border-b border-gray-100"
                    href={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </motion.a>
                ))}
              </nav>

              <div className="flex flex-col gap-4 pt-8 border-t border-gray-200">
                <motion.button
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary text-gray-900 text-base font-bold leading-normal tracking-wide shadow-sm hover:bg-opacity-90 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="truncate">Post a Service</span>
                </motion.button>
                 <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                  <span className="material-symbols-outlined">notifications</span>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white"></span>
                </button>
                <button>
                  <div
                    className="h-10 w-10 rounded-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${user.imageUrl})`,
                    }}
                  ></div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;