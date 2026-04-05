"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, UserPlus } from "lucide-react";

export default function AdminInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token")?.trim() || "";

  const callbackUrl = useMemo(() => {
    if (!token) return "/auth/admin-invite";
    return `/auth/admin-invite?token=${encodeURIComponent(token)}`;
  }, [token]);

  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const signupHref = `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const handleRedeem = async () => {
    if (!token || !session?.user) return;

    setError(null);
    setIsRedeeming(true);

    try {
      const response = await fetch("/api/admin/invites/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        role?: string;
        roles?: string[];
        preferredWorkspace?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to redeem invite");
      }

      await update({
        user: {
          ...session.user,
          role: payload.role || "ADMIN",
          roles: payload.roles || session.user.roles || ["ADMIN"],
          preferredWorkspace: payload.preferredWorkspace || "ADMIN",
        },
      });

      setSuccess(true);
      router.push("/admin/dashboard");
    } catch (redeemError) {
      const message =
        redeemError instanceof Error
          ? redeemError.message
          : "Could not redeem admin invite";
      setError(message);
    } finally {
      setIsRedeeming(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 text-amber-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h1 className="text-lg font-semibold">Invalid invite link</h1>
              <p className="mt-1 text-sm text-amber-700/90">
                This admin invite is missing a token. Request a new invite from
                an existing admin.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your session...
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Admin invite detected
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Sign in to the invited account to redeem this admin invitation.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Log in
            </Link>
            <Link
              href={signupHref}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Redeem admin invite
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-medium">{session.user.email}</span>.
              Continue to grant admin access.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Invite redeemed. Redirecting to admin dashboard...
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRedeem}
            disabled={isRedeeming}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isRedeeming ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redeeming...
              </span>
            ) : (
              "Redeem invite"
            )}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
