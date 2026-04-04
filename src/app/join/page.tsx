import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Join JustInTime as a Professional",
  description:
    "Create your professional account, get discovered by local clients, and grow recurring work on JustInTime.",
  canonical: "https://justintime.gtss.software/join",
});

interface JoinPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = (await searchParams) ?? {};
  const referralCode = getSingleValue(params.ref)?.trim();
  const callbackUrl = "/provider/onboarding";

  const signupParams = new URLSearchParams({
    callbackUrl,
  });

  if (referralCode) {
    signupParams.set("ref", referralCode);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <Header />
      <main className="flex-1 pt-[var(--public-header-h)]">
        <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_36%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_32%),linear-gradient(180deg,#04110d_0%,#081714_100%)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                Professional growth
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                Join the marketplace built for trusted local pros.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Create your profile, get discovered in public search, manage
                jobs in one workspace, and turn repeat clients into predictable
                income.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/auth/signup?${signupParams.toString()}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  Create pro account
                </Link>
                <Link
                  href="/professionals"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Browse top professionals
                </Link>
              </div>

              {referralCode ? (
                <p className="mt-4 text-sm text-emerald-200">
                  Referral applied: <span className="font-semibold">{referralCode}</span>
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Why pros join
              </p>
              <ul className="mt-4 space-y-4 text-sm text-slate-200">
                <li>Show up in public search with verification and trust signals.</li>
                <li>Receive job opportunities from clients already looking nearby.</li>
                <li>Manage proposals, messages, bookings, and payouts in one place.</li>
                <li>Build long-term credibility with reviews and repeat work.</li>
              </ul>
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-100">
                  Next step after signup
                </p>
                <p className="mt-1 text-sm text-emerald-50/80">
                  We’ll take you straight into provider onboarding so your
                  profile is ready for discovery.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
