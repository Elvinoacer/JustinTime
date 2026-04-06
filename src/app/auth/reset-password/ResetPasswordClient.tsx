"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  KeyRound,
  Lock,
  Check,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Shield,
} from "lucide-react";
import { getAuthQueryState, withAuthQuery } from "@/lib/auth/query";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authQuery = getAuthQueryState(searchParams);
  const loginHref = withAuthQuery("/auth/login", authQuery);
  const loginSuccessHref = withAuthQuery("/auth/login?reset=success", authQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
  });

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setMessage({
        type: "error",
        text: "Invalid reset link. Please request a new one.",
      });
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength({ score: 0, message: "" });
      return;
    }

    let score = 0;
    const messages = [];

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Determine message
    if (score <= 2) {
      messages.push("Weak password");
    } else if (score <= 4) {
      messages.push("Fair password");
    } else if (score <= 5) {
      messages.push("Good password");
    } else {
      messages.push("Strong password");
    }

    // Add suggestions
    if (password.length < 8) messages.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) messages.push("Add uppercase letters");
    if (!/[0-9]/.test(password)) messages.push("Add numbers");
    if (!/[^A-Za-z0-9]/.test(password)) messages.push("Add special characters");

    setPasswordStrength({
      score: Math.min(score, 6),
      message: messages[0],
    });
  }, [password]);

  const getStrengthColor = (score: number) => {
    if (score <= 2) return "bg-red-500";
    if (score <= 4) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage({ type: "error", text: "Invalid reset token" });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (password.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters long",
      });
      return;
    }

    if (passwordStrength.score < 3) {
      setMessage({ type: "error", text: "Please use a stronger password" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text:
            data.message ||
            "Password reset successfully! Redirecting to login...",
        });
        setPassword("");
        setConfirmPassword("");

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push(loginSuccessHref);
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Something went wrong",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to reset password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-100/50 p-6 sm:p-8 border border-gray-100">
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-4">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-lg opacity-30" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Reset Password
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              {token
                ? "Enter your new password below"
                : "Validating reset link..."}
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
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Form */}
          {token && !message?.type.includes("success") && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base transition-all"
                    placeholder="Enter new password"
                    minLength={8}
                    maxLength={128}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Password strength:</span>
                      <span
                        className={`font-medium ${
                          passwordStrength.score <= 2
                            ? "text-red-600"
                            : passwordStrength.score <= 4
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      >
                        {passwordStrength.message}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor(
                          passwordStrength.score,
                        )}`}
                        style={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Requirements */}
                <ul className="mt-2 space-y-1 text-xs text-gray-500">
                  <li className="flex items-center gap-1">
                    {password.length >= 8 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-gray-300" />
                    )}
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-1">
                    {/[A-Z]/.test(password) && /[a-z]/.test(password) ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-gray-300" />
                    )}
                    Upper & lowercase letters
                  </li>
                  <li className="flex items-center gap-1">
                    {/[0-9]/.test(password) ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-gray-300" />
                    )}
                    At least one number
                  </li>
                </ul>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`block w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 text-sm sm:text-base transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? "border-red-300 focus:ring-red-500 focus:border-transparent"
                        : "border-gray-300 focus:ring-emerald-500 focus:border-transparent"
                    }`}
                    placeholder="Confirm new password"
                    minLength={8}
                    maxLength={128}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isLoading ||
                  password !== confirmPassword ||
                  passwordStrength.score < 3
                }
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg sm:rounded-xl text-white bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-semibold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login (Desktop) */}
          <div className="mt-6 text-center hidden lg:block">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors text-sm sm:text-base group"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-blue-700 font-medium mb-1">
                Security Information
              </p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Password reset links expire in 1 hour</li>
                <li>• Use a strong, unique password</li>
                <li>• Avoid reusing passwords across sites</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Need Help */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Having trouble?{" "}
            <Link
              href="/contact"
              className="font-medium text-gray-700 hover:text-gray-900"
            >
              Contact Support
            </Link>
          </p>
        </div>

        {/* Mobile Bottom Spacing */}
        <div className="h-8 sm:hidden" />
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-white to-blue-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-sm text-gray-600">Validating reset link...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

// Add missing Eye/EyeOff components
const Eye = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOff = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
    />
  </svg>
);
