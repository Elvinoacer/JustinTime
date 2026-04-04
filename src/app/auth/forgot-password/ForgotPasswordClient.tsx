"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LockKeyhole,
  Mail,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";
import { getAuthQueryState, withAuthQuery } from "@/lib/auth/query";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const authQuery = getAuthQueryState(searchParams);
  const loginHref = withAuthQuery("/auth/login", authQuery);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    // Basic email validation
    if (!normalizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      return;
    }

    if (normalizedEmail.length > 254) {
      setMessage({
        type: "error",
        text: "Email must be 254 characters or fewer",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message || "Password reset link sent! Check your email.",
        });
        setEmail("");
      } else {
        setMessage({
          type: "error",
          text: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to send reset link. Please check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-3 sm:p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-100/50 p-6 sm:p-8 border border-gray-100">
          {/* Icon */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-lg opacity-30" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <LockKeyhole className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              No worries! Enter your email and we&apos;ll send you a reset
              link.
            </p>
          </div>

          {/* Alert Messages */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: message ? 1 : 0, scale: message ? 1 : 0.95 }}
            className="mb-4 sm:mb-6"
          >
            {message && (
              <div
                className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border ${
                  message.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:pl-12 pr-4 py-3 border border-gray-300 rounded-lg sm:rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm sm:text-base"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-semibold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors text-sm sm:text-base group"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Help Text & Security Note */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{" "}
              <Link
                href={loginHref}
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          {/* Security Note */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Security Note:</span> Password
                reset links expire in 1 hour and can only be used once.
              </p>
            </div>
          </div>

          {/* Need Help */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Need help?{" "}
              <Link
                href="/contact"
                className="font-medium text-gray-700 hover:text-gray-900"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </div>

        {/* Mobile Bottom Spacing */}
        <div className="h-8 sm:hidden" />
      </motion.div>
    </div>
  );
}
