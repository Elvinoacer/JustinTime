"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw, Shield } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; description: string }> =
    {
      Configuration: {
        title: "Server Error",
        description:
          "There is a problem with the server configuration. Please contact support.",
      },
      AccessDenied: {
        title: "Access Denied",
        description:
          "You do not have permission to sign in. This may happen if your account was denied during creation.",
      },
      AccountSuspended: {
        title: "Account Suspended",
        description:
          "This account has been suspended. Please contact support if you believe this is a mistake.",
      },
      Verification: {
        title: "Verification Error",
        description:
          "The verification link has expired or has already been used. Please request a new one.",
      },
      OAuthSignin: {
        title: "Sign In Error",
        description:
          "Could not start the sign-in process with the provider. Please try again.",
      },
      OAuthCallback: {
        title: "Callback Error",
        description:
          "Something went wrong processing the sign-in response. Please try again.",
      },
      OAuthAccountNotLinked: {
        title: "Account Not Linked",
        description:
          "This email is already associated with another sign-in method. Please sign in using your original method.",
      },
      CredentialsSignin: {
        title: "Sign In Failed",
        description:
          "The email or password you entered is incorrect. Please try again.",
      },
      CallbackRouteError: {
        title: "Sign In Unavailable",
        description:
          "We could not complete your sign-in request right now. Please try again shortly.",
      },
      Default: {
        title: "Authentication Error",
        description:
          "An unexpected error occurred during authentication. Please try again.",
      },
    };

  const { title, description } =
    errorMessages[error || ""] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-start justify-center bg-linear-to-br from-slate-50 to-red-50/30 px-3 py-6 sm:items-center sm:p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
        >
          <div className="p-6 sm:p-8">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Title & Message */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2">
              {title}
            </h2>
            <p className="text-sm text-slate-600 text-center mb-6">
              {description}
            </p>

            {error && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-slate-500 text-center">
                  Error code:{" "}
                  <code className="break-all font-mono text-slate-700">
                    {error}
                  </code>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Link>
              <Link
                href="/"
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>

          <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Shield className="w-3 h-3" />
              <span className="break-words">
                Need help? Email support@gtss.software
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div
            className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600"
            aria-label="Loading auth error page"
          />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
