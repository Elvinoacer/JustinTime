"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          data.message || "Successfully subscribed to our newsletter!"
        );
        setEmail(""); // Clear the input
      } else if (response.status === 409) {
        // Email already exists
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

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 text-center md:text-left">
          {/* Brand Section */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center md:justify-start gap-3 text-white mb-5">
              <img
                src="/images/JustinTimeLogo.png"
                alt="JustInTime Logo"
                className="h-10 w-auto"
              />
              <h2 className="text-2xl font-bold leading-tight tracking-tight bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                JustInTime
              </h2>
            </div>
            <p className="text-gray-300 mt-4 text-base leading-relaxed max-w-md mx-auto md:mx-0">
              Connecting you with the best local service providers in Kenya,
              just when you need them most. Quality service at your fingertips.
            </p>

            {/* Newsletter Subscription */}
            <div className="mt-6">
              <h4 className="text-gray-200 font-medium mb-3">Stay Updated</h4>
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto md:mx-0"
              >
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold tracking-wider mb-5 text-white">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {[
                { name: "About Us", href: "/about" },
                { name: "Contact", href: "/contact" },
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Terms of Service", href: "/terms" },
                { name: "FAQ", href: "/faq" },
                { name: "Blog", href: "/blog" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="text-gray-300 hover:text-emerald-400 text-base transition-colors duration-300 flex items-center justify-center md:justify-start group"
                  >
                    <span className="mr-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      •
                    </span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold tracking-wider mb-5 text-white">
              Services
            </h3>
            <ul className="space-y-3">
              {[
                { name: "Plumbing", href: "/services?category=plumbing" },
                { name: "Electrical", href: "/services?category=electrical" },
                { name: "Cleaning", href: "/services?category=cleaning" },
                { name: "Carpentry", href: "/services?category=carpentry" },
                { name: "Painting", href: "/services?category=painting" },
                { name: "More Services...", href: "/services" },
              ].map((service, index) => (
                <li key={index}>
                  <Link
                    href={service.href}
                    className="text-gray-300 hover:text-emerald-400 text-base transition-colors duration-300 flex items-center justify-center md:justify-start group"
                  >
                    <span className="mr-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      •
                    </span>
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact & Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold tracking-wider mb-5 text-white">
              Connect With Us
            </h3>

            {/* Contact Info */}
            <div className="mb-6">
              <div className="flex items-center justify-center md:justify-start text-gray-300 mb-2">
                <span className="material-symbols-outlined text-emerald-500 mr-2 text-lg">
                  mail
                </span>
                <span>support@justintime.co.ke</span>
              </div>
              <div className="flex items-center justify-center md:justify-start text-gray-300">
                <span className="material-symbols-outlined text-emerald-500 mr-2 text-lg">
                  call
                </span>
                <span>+254 790 670 542</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.hr
          className="my-10 border-gray-700"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
          style={{ transformOrigin: "left" }}
          viewport={{ once: true }}
        />

        <motion.div
          className="text-center text-gray-400 text-sm flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <p>
            © {new Date().getFullYear().toString()} JustInTime. All rights
            reserved.
          </p>
          <div className="flex gap-5 mt-3 md:mt-0">
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 text-xs"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 text-xs"
            >
              Terms of Service
            </Link>
            <Link
              href="/cookie-policy"
              className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 text-xs"
            >
              Cookie Policy
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
