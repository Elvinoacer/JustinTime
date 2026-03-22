"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Mail,
  Shield,
  RefreshCw,
} from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage("Your email has been successfully verified!");
          // B7: Auto-redirect to login after 2 seconds
          setTimeout(() => {
            router.push("/auth/login?verified=true");
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify email.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleRetry = () => {
    setStatus("loading");
    setMessage("Retrying verification...");
    setTimeout(() => {
      if (token) {
        const retryVerification = async () => {
          try {
            const response = await fetch(
              `/api/auth/verify-email?token=${token}`
            );
            const data = await response.json();
            if (response.ok) {
              setStatus("success");
              setMessage("Your email has been successfully verified!");
            } else {
              setStatus("error");
              setMessage(data.error || "Failed to verify email.");
            }
          } catch (error) {
            setStatus("error");
            setMessage("An unexpected error occurred. Please try again.");
          }
        };
        retryVerification();
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-md w-full">
        {/* Header for Mobile */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Email Verification
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Secure your account with email verification
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl overflow-hidden border border-slate-200"
        >
          <div className="p-5 sm:p-8">
            {/* Status Icon */}
            <div className="flex justify-center mb-5 sm:mb-6">
              {status === "loading" && (
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-7 h-7 sm:w-10 sm:h-10 text-indigo-600 animate-spin" />
                  </div>
                  <div className="absolute inset-0 animate-ping rounded-full bg-indigo-200 opacity-50" />
                </div>
              )}
              {status === "success" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-7 h-7 sm:w-10 sm:h-10 text-emerald-600" />
                </motion.div>
              )}
              {status === "error" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-full flex items-center justify-center"
                >
                  <XCircle className="w-7 h-7 sm:w-10 sm:h-10 text-red-600" />
                </motion.div>
              )}
            </div>

            {/* Status Title */}
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 text-center mb-2">
              {status === "loading"
                ? "Verifying Email"
                : status === "success"
                ? "Email Verified!"
                : "Verification Failed"}
            </h2>

            {/* Status Message */}
            <div className="mb-6 sm:mb-8">
              <p className="text-sm sm:text-base text-slate-600 text-center">
                {message}
              </p>

              {/* Additional Info for Mobile */}
              {status === "loading" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-slate-500 text-center mt-2"
                >
                  This usually takes a few seconds...
                </motion.p>
              )}
            </div>

            {/* Loading Progress Bar */}
            {status === "loading" && (
              <div className="max-w-[180px] sm:max-w-[200px] mx-auto mb-6 sm:mb-8">
                <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Processing verification...
                </p>
              </div>
            )}

            {/* Two Column Layout for Desktop, Stacked for Mobile */}
            <div className="space-y-4">
              {/* Success Actions */}
              {status === "success" && (
                <div className="space-y-4">
                  <Link
                    href="/auth/login"
                    className="flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl sm:rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98] shadow-md shadow-emerald-500/20"
                  >
                    <span className="text-sm sm:text-base">
                      Continue to Login
                    </span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="w-3 h-3" />
                    <span>Your account is now secured and ready to use</span>
                  </div>
                </div>
              )}

              {/* Error Actions */}
              {status === "error" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/auth/login"
                      className="flex items-center justify-center px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98] text-sm"
                    >
                      Back to Login
                    </Link>

                    <button
                      onClick={handleRetry}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] text-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Need Help?
                    </h4>
                    <p className="text-xs text-slate-600">
                      If the problem persists, please contact our support team.
                    </p>
                    <button
                      onClick={() => router.push("/support")}
                      className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Contact Support →
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State Tips */}
              {status === "loading" && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Verification Tips
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      <span>
                        Please keep this page open during verification
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      <span>Check your email for the verification link</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      <span>Verification may take up to 30 seconds</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-3 sm:p-4 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} JustInTime. All rights reserved.
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
              Your security is our priority
            </p>
          </div>
        </motion.div>

        {/* Mobile Bottom Navigation */}
        <div className="mt-6 sm:hidden">
          <div className="flex justify-between items-center text-xs text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              ← Back to Home
            </Link>
            <Link
              href="/support"
              className="hover:text-slate-900 transition-colors"
            >
              Help Center
            </Link>
          </div>
        </div>

        {/* Desktop Stats */}
        <div className="hidden sm:block mt-8">
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">99.9%</div>
              <div className="text-xs text-slate-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">&lt;3s</div>
              <div className="text-xs text-slate-500">
                Avg. Verification Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">256-bit</div>
              <div className="text-xs text-slate-500">Encryption</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
              <Loader2 className="w-7 h-7 sm:w-10 sm:h-10 text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">
              Loading verification...
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Preparing your secure session
            </p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
