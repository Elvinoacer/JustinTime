"use client";

import { motion } from "framer-motion";
import { Mail, ArrowLeft, RefreshCw, Shield, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function maskEmailAddress(email: string | null): string | null {
  if (!email || !email.includes("@")) {
    return null;
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return null;
  }

  const maskedLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? "*"}*`
      : `${localPart.slice(0, 2)}${"*".repeat(Math.max(1, localPart.length - 2))}`;

  return `${maskedLocal}@${domain}`;
}

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const maskedEmail = maskEmailAddress(email);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");

  const handleResendEmail = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setResendSuccess(false);
    setResendError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResendError(data.error || "Failed to send. Try again.");
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch {
      setResendError("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-md w-full">
        {/* Mobile Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Verify Your Email
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                One more step to secure your account
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl overflow-hidden border border-slate-200"
        >
          <div className="p-5 sm:p-8">
            {/* Main Content */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
              </div>

              <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">
                Check Your Email
              </h2>

              <div className="space-y-3 sm:space-y-4">
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  We&apos;ve sent a verification link to your email address.
                  {maskedEmail ? (
                    <>
                      {" "}
                      <span className="font-semibold text-slate-900 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {maskedEmail}
                      </span>
                    </>
                  ) : null}
                </p>

                <p className="text-sm sm:text-base text-slate-600">
                  Please click the link in the email to verify your account and
                  continue.
                </p>
              </div>
            </div>

            {/* Email Preview Card */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200">
                    <Mail className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Verification Email Sent
                  </h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Sent just now</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Link expires in 24 hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 sm:mb-8 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs">💡</span>
                </span>
                Can&apos;t find the email?
              </h4>
              <ul className="text-xs text-blue-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Check your spam or junk folder</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Search for &quot;JustInTime Verification&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <span>Ensure your email address is correct</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98] text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>

                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all active:scale-[0.98] text-sm ${
                    isResending
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {isResending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resend Email
                    </>
                  )}
                </button>
              </div>

              {/* Resend Success Message */}
              {resendSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-emerald-50 border border-emerald-100 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 text-xs">✓</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Verification email sent! Check your inbox.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Resend Error Message */}
              {resendError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-red-50 border border-red-100 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-xs">✕</span>
                    </div>
                    <p className="text-xs text-red-700">{resendError}</p>
                  </div>
                </motion.div>
              )}

              {/* Support Link */}
              <div className="text-center pt-2">
                <Link
                  href="/support"
                  className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                >
                  Need help? Contact Support
                  <span className="text-slate-400">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-3 sm:p-4 text-center border-t border-slate-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-slate-500 order-2 sm:order-1">
                &copy; {new Date().getFullYear()} JustInTime
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Shield className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500">
                  Secure Verification
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 order-3">
                Your privacy is protected
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mobile Bottom Links */}
        <div className="mt-6 sm:hidden">
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← Return to Homepage
            </Link>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <Link href="/privacy" className="hover:text-slate-700">
                Privacy
              </Link>
              <span className="text-slate-300">•</span>
              <Link href="/terms" className="hover:text-slate-700">
                Terms
              </Link>
              <span className="text-slate-300">•</span>
              <Link href="/help" className="hover:text-slate-700">
                Help
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Stats */}
        <div className="hidden sm:block mt-8">
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">Instant</div>
              <div className="text-xs text-slate-500">Email Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">24h</div>
              <div className="text-xs text-slate-500">Link Valid</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">99.9%</div>
              <div className="text-xs text-slate-500">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
              <Mail className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Preparing email...
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Loading verification details
            </p>
          </div>
        </div>
      }
    >
      <VerifyRequestContent />
    </Suspense>
  );
}
