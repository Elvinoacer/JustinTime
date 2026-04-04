"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  AUTH_CONTEXT_COOKIE_NAME,
  buildOnboardingIntentUrl,
  encodeAuthContextCookie,
  getAuthQueryState,
  withAuthQuery,
} from "@/lib/auth/query";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Users,
  ChevronLeft,
} from "lucide-react";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
  });
  const { ref: referralCode, callbackUrl, returnTo, intent } =
    getAuthQueryState(searchParams);
  const loginHref = withAuthQuery("/auth/login", {
    ref: referralCode,
    callbackUrl,
    returnTo,
    intent,
  });

  const calculatePasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, message: "" };

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

    return {
      score: Math.min(score, 6),
      message: messages[0],
    };
  };

  const getStrengthColor = (score: number) => {
    if (score <= 2) return "bg-red-500";
    if (score <= 4) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const handleGoogleSignIn = async () => {
    try {
      document.cookie = `${AUTH_CONTEXT_COOKIE_NAME}=${encodeAuthContextCookie(
        {
          ref: referralCode,
          callbackUrl,
          returnTo,
          intent,
        },
      )}; Path=/; Max-Age=600; SameSite=Lax`;

      const googleCallbackUrl = buildOnboardingIntentUrl(
        {
          ref: referralCode,
          callbackUrl,
          returnTo,
          intent,
        },
        intent === "provider" ? "/onboarding?intent=provider" : "/onboarding",
      );

      await signIn("google", { callbackUrl: googleCallbackUrl });
    } catch {
      toast.error("Failed to sign in with Google");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      password: String(formData.get("password") ?? "").trim(),
      referralCode: referralCode || undefined,
      role: intent === "provider" ? "PROVIDER" : undefined,
    };

    if (
      data.name.length > 80 ||
      data.email.length > 254 ||
      data.password.length > 128
    ) {
      const message = "One or more fields exceed the allowed length";
      setError(message);
      toast.error(message);
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const strength = calculatePasswordStrength(data.password);
    if (strength.score < 3) {
      setError("Please use a stronger password");
      toast.error("Please use a stronger password");
      setIsLoading(false);
      return;
    }

    try {
      // First, create the user account
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create account");
      }

      // Account created successfully, redirect to verification request page
      toast.success("Account created! Please verify your email.");
      router.push(
        withAuthQuery(
          `/auth/verify-request?email=${encodeURIComponent(data.email)}`,
          {
            ref: referralCode,
            callbackUrl,
            returnTo,
            intent,
          },
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative bg-gray-900">
        <Image
          src="https://syracusenewtimes.com/wp-content/uploads/2014/02/Young-Professionals-black-and-white.jpg"
          alt="Signup Background"
          fill
          className="object-cover opacity-60"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 text-white z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-4"
          >
            Join Our Community
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-200 max-w-md"
          >
            Start your journey with us today. Find professionals or grow your
            business.
          </motion.p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 xl:p-16 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg"
        >
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Create Your Account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href={loginHref}
                className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                Sign in instead
              </Link>
            </p>
            {referralCode && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Referral applied: {referralCode}
              </div>
            )}
          </div>

          {/* Error Alert */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: error ? 1 : 0, height: error ? "auto" : 0 }}
            className="mb-4 sm:mb-6 overflow-hidden"
          >
            {error && (
              <div className="rounded-lg sm:rounded-xl bg-red-50 border border-red-200 p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Form */}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  required
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all disabled:bg-gray-100"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all disabled:bg-gray-100"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  minLength={8}
                  maxLength={128}
                  onChange={(e) =>
                    setPasswordStrength(
                      calculatePasswordStrength(e.target.value),
                    )
                  }
                  className="block w-full pl-10 pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all disabled:bg-gray-100"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {passwordStrength.score > 0 && (
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
                  {passwordStrength.score >= 1 ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-gray-300" />
                  )}
                  At least 8 characters
                </li>
                <li className="flex items-center gap-1">
                  {passwordStrength.score >= 3 ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-gray-300" />
                  )}
                  Upper & lowercase letters
                </li>
                <li className="flex items-center gap-1">
                  {passwordStrength.score >= 4 ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-gray-300" />
                  )}
                  At least one number
                </li>
              </ul>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                disabled={isLoading}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer mt-1"
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-sm text-gray-900 cursor-pointer"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-emerald-600 hover:text-emerald-500"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-emerald-600 hover:text-emerald-500"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm sm:text-base font-bold rounded-lg sm:rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Alternative Sign Up Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  Or sign up with
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg sm:rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </button>
            </div>
          </div>

          {/* Mobile Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-200 lg:hidden">
            <div className="space-y-3">
              <div className="text-center">
                <Link
                  href={loginHref}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Already have an account? Sign in
                </Link>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  By signing up, you agree to our{" "}
                  <Link
                    href="/terms"
                    className="font-medium text-gray-700 hover:text-gray-900"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-gray-700 hover:text-gray-900"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignupPageContent />
    </Suspense>
  );
}
