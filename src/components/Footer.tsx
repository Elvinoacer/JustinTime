"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Phone, ChevronRight, Send } from "lucide-react";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "footer",
          website,
        }),
      });
      const data = await response.json();
      if (response.ok || response.status === 202) {
        toast.success(
          data.message ||
            "Please check your inbox to confirm your subscription.",
        );
        setEmail("");
        setWebsite("");
      } else if (response.status === 409) {
        toast.info("You're already subscribed to our newsletter!");
      } else {
        toast.error(data.error || "Failed to subscribe. Please try again.");
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const socialLinks = [
    {
      href: process.env.NEXT_PUBLIC_SOCIAL_X_URL,
      label: "X",
      path: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
    },
    {
      href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL,
      label: "Facebook",
      path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    },
    {
      href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL,
      label: "Instagram",
      path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
    },
    {
      href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL,
      label: "LinkedIn",
      path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    },
  ].filter((item): item is { href: string; label: string; path: string } =>
    Boolean(item.href && /^https?:\/\//i.test(item.href)),
  );

  return (
    <footer className="relative border-t border-emerald-400/[0.08] bg-[#0a0f0d] text-white py-8 sm:py-12 md:py-16">
      {/* Top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(52,211,153,0.4) 20%, rgba(34,211,238,0.5) 50%, rgba(52,211,153,0.4) 80%, transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(52,211,153,0.1) 20%, rgba(34,211,238,0.15) 50%, rgba(52,211,153,0.1) 80%, transparent)",
          filter: "blur(4px)",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand & Newsletter */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4 sm:mb-5">
              <Image
                src="/images/JustinTimeLogo.png"
                alt="JustInTime Logo"
                width={160}
                height={40}
                className="h-8 sm:h-10 w-auto"
              />
              <h2 className="gradient-text-hero text-xl sm:text-2xl font-bold">
                JustInTime
              </h2>
            </div>
            <p className="text-white/65 text-sm sm:text-base leading-relaxed max-w-md text-center sm:text-left mb-6 sm:mb-8">
              Connecting you with the best local service providers in Kenya,
              just when you need them most.
            </p>
            <div className="mb-6 sm:mb-0">
              <h4 className="text-white/80 font-medium mb-3 text-sm sm:text-base">
                Stay Updated
              </h4>
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="hidden"
                />
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 disabled:opacity-50 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="shimmer-btn flex items-center justify-center gap-2 bg-emerald-500/90 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Subscribing</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Subscribe</span>
                    </>
                  )}
                </button>
              </form>
              <p className="text-white/30 text-xs mt-2">
                No spam. Unsubscribe anytime.
              </p>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5 text-white/90">
              Quick Links
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { name: "About Us", href: "/about" },
                { name: "Contact", href: "/contact" },
                { name: "Blog", href: "/blog" },
                { name: "FAQ", href: "/faq" },
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Terms", href: "/terms" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="text-white/40 hover:text-emerald-400 text-sm sm:text-base transition-colors flex items-center group py-0.5"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400 mr-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Services & Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5 text-white/90">
              Services
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-6 sm:mb-8">
              {[
                { name: "Plumbing", href: "/services?category=plumbing" },
                { name: "Electrical", href: "/services?category=electrical" },
                { name: "Cleaning", href: "/services?category=cleaning" },
                { name: "Carpentry", href: "/services?category=carpentry" },
                { name: "Painting", href: "/services?category=painting" },
                { name: "All Services", href: "/services" },
              ].map((service, index) => (
                <Link
                  key={index}
                  href={service.href}
                  className="text-white/40 hover:text-emerald-400 text-sm transition-all hover:bg-white/[0.04] px-2 py-1.5 rounded hover:translate-x-0.5"
                >
                  {service.name}
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-white/50">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">Call Us</p>
                  <p className="text-xs text-white/40">+254 790 670 542</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/50">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">Email Us</p>
                  <p className="text-xs break-all text-white/40">
                    support@gtss.software
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.hr
          className="my-8 sm:my-10 border-white/[0.06]"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
          style={{ transformOrigin: "left" }}
          viewport={{ once: true }}
        />

        {/* Bottom Bar */}
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="text-center sm:text-left">
            <p className="text-white/30 text-xs sm:text-sm">
              © {new Date().getFullYear()} JustInTime. All rights reserved.
            </p>
            <p className="text-white/20 text-[10px] sm:text-xs mt-1">
              Made with ❤️ in Kenya
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {socialLinks.length > 0 ? (
              socialLinks.map(({ href, label, path }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-white/25 hover:text-emerald-400 transition-all duration-300 p-2 hover:bg-white/[0.04] rounded-lg hover:scale-110"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d={path} />
                  </svg>
                </a>
              ))
            ) : (
              <span className="text-xs text-white/40">
                Social links coming soon
              </span>
            )}
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center sm:justify-end gap-1 text-xs sm:text-sm">
            {[
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
              { href: "/cookie-policy", label: "Cookies" },
              { href: "/sitemap", label: "Sitemap" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-white/30 hover:text-emerald-400 transition-colors px-2 py-1 hover:bg-white/[0.04] rounded"
              >
                {label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Mobile App Download */}
        <div className="mt-8 sm:hidden">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center">
            <h4 className="text-sm font-semibold mb-3 text-white/80">
              Get Our Mobile App
            </h4>
            <div className="flex justify-center gap-3">
              {[
                {
                  store: "App Store",
                  sub: "Download on the",
                  icon: "M17.1 12.6c.7-.8 1.2-1.9 1-3.1-.9.1-2 .6-2.7 1.4-.6.7-1.2 1.9-1 3 .9 0 2-.5 2.7-1.3zM20 15.5c-.4.9-.9 1.6-1.5 2.5-.7 1-1.5 2.1-2.6 2.1-1.1 0-1.4-.7-2.9-.7-1.5 0-1.8.7-2.9.7-1.1 0-1.9-1.1-2.6-2.1C5.9 17.1 5 14.9 5 12.7c0-3.2 2-4.9 4-4.9 1.1 0 2 .7 2.9.7.9 0 1.7-.7 2.9-.7 1.6 0 2.8 1.1 3.4 2.2-1.4.8-2.3 2.4-2.3 4.3 0 1.8.7 3.1 1.5 4.1z",
                },
                {
                  store: "Google Play",
                  sub: "GET IT ON",
                  icon: "M3 20.5V3.5C3 2.67 3.67 2 4.5 2h15C20.33 2 21 2.67 21 3.5v17c0 .83-.67 1.5-1.5 1.5h-15C3.67 22 3 21.33 3 20.5zM8 19h8v-3H8v3zm0-5h8v-3H8v3zm0-5h8V6H8v3z",
                },
              ].map(({ store, sub, icon }) => (
                <button
                  key={store}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white/70"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d={icon} />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] text-white/40">{sub}</div>
                    <div className="text-xs font-semibold text-white/80">
                      {store}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
