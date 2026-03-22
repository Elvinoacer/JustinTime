"use client";
import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";
import { loginWithCredentials, resendTwoFactorToken } from "@/app/actions/auth";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  UserPlus,
  KeyRound,
  ChevronLeft,
} from "lucide-react";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const verified = searchParams.get("verified");

  // B7: Show toast if user just verified their email
  useEffect(() => {
    if (verified === "true") {
      toast.success("Email verified! You can now sign in.");
    }
  }, [verified]);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await resendTwoFactorToken(loginData.email);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Code resent successfully");
      }
    } catch (error) {
      toast.error("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (showTwoFactor) {
        // Step 2: Verify 2FA
        const result = await signIn("credentials", {
          email: loginData.email,
          password: loginData.password,
          code: twoFactorCode,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid code");
          toast.error("Invalid code");
        } else {
          toast.success("Successfully logged in!");
          // B5: Smart redirect based on user role
          let shouldSmartRedirect = !callbackUrl;
          try {
            if (callbackUrl) {
              const url = new URL(callbackUrl, window.location.origin);
              if (url.pathname === "/") {
                shouldSmartRedirect = true;
              }
            }
          } catch (e) {
            shouldSmartRedirect = true;
          }

          if (!shouldSmartRedirect) {
            router.push(callbackUrl);
          } else {
            const session = await getSession();
            const role = session?.user?.role;
            const onboarded = session?.user?.onboardingCompleted;
            if (!onboarded) {
              router.push("/onboarding");
            } else if (role === "PROVIDER") {
              router.push("/dashboard");
            } else if (role === "ADMIN") {
              router.push("/admin");
            } else {
              router.push("/client/dashboard");
            }
          }
        }
      } else {
        // Step 1: Check credentials & 2FA status
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const result = await loginWithCredentials(formData);

        if (result.error) {
          setError(result.error);
          toast.error(result.error);
        } else if (result.twoFactor) {
          setLoginData({ email, password });
          setShowTwoFactor(true);
          toast.info("Please enter the code sent to your email");
        } else {
          // No 2FA, proceed to login
          const signInResult = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (signInResult?.error) {
            setError("Invalid credentials");
            toast.error("Invalid credentials");
          } else {
            toast.success("Successfully logged in!");
            // B5: Smart redirect based on user role
            let shouldSmartRedirect = !callbackUrl;
            try {
              if (callbackUrl) {
                const url = new URL(callbackUrl, window.location.origin);
                if (url.pathname === "/") {
                  shouldSmartRedirect = true;
                }
              }
            } catch (e) {
              shouldSmartRedirect = true;
            }

            if (!shouldSmartRedirect) {
              router.push(callbackUrl);
            } else {
              const session = await getSession();
              const role = session?.user?.role;
              const onboarded = session?.user?.onboardingCompleted;
              if (!onboarded) {
                router.push("/onboarding");
              } else if (role === "PROVIDER") {
                router.push("/dashboard");
              } else if (role === "ADMIN") {
                router.push("/admin");
              } else {
                router.push("/client/dashboard");
              }
            }
          }
        }
      }
    } catch (error) {
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl: callbackUrl || "/onboarding" });
    } catch (error) {
      toast.error("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 relative bg-gray-900">
        <Image
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
          alt="Login Background"
          fill
          className="object-cover opacity-60"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 text-white z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-4"
          >
            Welcome Back
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-gray-200 max-w-md"
          >
            Connect with top-tier professionals and manage your services
            effortlessly.
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <KeyRound className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {showTwoFactor ? "Two-Factor Authentication" : "Welcome Back"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {showTwoFactor ? (
                "Enter the 6-digit code sent to your email"
              ) : (
                <>
                  Don't have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    Sign up now
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl bg-red-50 border border-red-200 p-3 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {!showTwoFactor ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Email */}
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
                        autoComplete="current-password"
                        required
                        disabled={isLoading}
                        className="block w-full pl-10 pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all disabled:bg-gray-100"
                        placeholder="••••••••"
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
                  </div>

                  {/* Remember & Forgot */}
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-gray-900 cursor-pointer"
                      >
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link
                        href="/auth/forgot-password"
                        className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors inline-flex items-center gap-1"
                      >
                        <KeyRound className="w-4 h-4" />
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="2fa-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  {/* 2FA Instructions */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 rounded-full mb-4">
                      <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      We've sent a 6-digit code to:
                    </p>
                    <p className="font-medium text-gray-900">
                      {loginData.email}
                    </p>
                  </div>

                  {/* 2FA Code Input */}
                  <div>
                    <label
                      htmlFor="code"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Enter 6-digit Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="code"
                        name="code"
                        type="text"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        required
                        disabled={isLoading}
                        value={twoFactorCode}
                        onChange={(e) =>
                          setTwoFactorCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base transition-all text-center font-mono tracking-widest disabled:bg-gray-100"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the 6-digit code from your authenticator app or
                      email
                    </p>
                  </div>

                  {/* 2FA Actions */}
                  <div className="space-y-3 text-center">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="text-sm text-emerald-600 hover:text-emerald-500 font-medium disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        "Resend Code"
                      )}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowTwoFactor(false)}
                        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm sm:text-base font-bold rounded-lg sm:rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    {showTwoFactor ? "Verifying..." : "Signing in..."}
                  </>
                ) : showTwoFactor ? (
                  "Verify & Continue"
                ) : (
                  "Sign in to Account"
                )}
              </button>
            </div>
          </form>

          {/* Social Login (Only show on login form) */}
          {!showTwoFactor && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg sm:rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                  Sign in with Google
                </button>
              </div>
            </div>
          )}

          {/* Mobile Footer Links */}
          <div className="mt-6 pt-6 border-t border-gray-200 lg:hidden">
            <div className="space-y-3">
              <div className="text-center">
                <Link
                  href="/auth/signup"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  Create new account
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="/"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
