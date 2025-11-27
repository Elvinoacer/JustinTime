import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BasicAnalytics from "@/components/dashboard/analytics/BasicAnalytics";
import AdvancedAnalytics from "@/components/dashboard/analytics/AdvancedAnalytics";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Analytics | JustInTime",
  description: "Track your performance and earnings",
};

export default async function AnalyticsPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      subscription: true,
      providerBookings: {
        where: {
          status: {
            in: ["COMPLETED", "CONFIRMED"]
          }
        }
      },
      receivedReviews: true,
      wallet: {
        include: {
          transactions: {
            where: {
              type: "EARNING"
            }
          }
        }
      }
    }
  });

  if (!user) {
    redirect("/auth/login");
  }

  const isPro = user.subscription?.plan === "PRO" || user.subscription?.plan === "BUSINESS";
  const isActive = user.subscription?.isActive ?? false;
  const showAdvanced = isPro && isActive;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">Track your performance and growth</p>
      </div>

      <BasicAnalytics 
        bookings={user.providerBookings}
        earnings={user.wallet?.transactions || []}
        reviews={user.receivedReviews}
      />

      {showAdvanced ? (
        <AdvancedAnalytics 
          bookings={user.providerBookings}
          earnings={user.wallet?.transactions || []}
          reviews={user.receivedReviews}
        />
      ) : (
        <div className="mt-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-emerald-500 opacity-10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <span className="material-symbols-outlined text-3xl text-amber-400">workspace_premium</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Unlock Advanced Insights</h2>
            <p className="text-gray-300 mb-8">
              Upgrade to Pro to access detailed customer retention metrics, revenue growth charts, and service performance analysis.
            </p>
            <Link 
              href="/dashboard/premium"
              className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20 transform hover:scale-105 inline-block"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
