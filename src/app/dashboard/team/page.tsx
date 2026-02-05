import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyTeam, getTeamDashboard } from "@/app/actions/team";
import { MemberCard } from "@/components/teams/MemberCard";
import { EarningsOverview } from "@/components/teams/EarningsOverview";
import { Users, Briefcase, MapPin, DollarSign, Plus, Settings } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function TeamDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const teamResult = await getMyTeam();
  
  // No team yet - show create team UI
  if (!teamResult.success || !teamResult.team) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <div className="text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create Your Team
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Lead a crew? Create your team to track jobs, manage workers, 
            and handle payroll all in one place.
          </p>
          
          <form action={async (formData: FormData) => {
            "use server";
            const { createTeam } = await import("@/app/actions/team");
            const name = formData.get('name') as string;
            const description = formData.get('description') as string;
            await createTeam(name, description);
          }}>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Nairobi Plumbers"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What does your team specialize in?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                Create Team
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const { team, isOwner, role } = teamResult;
  const dashboardResult = await getTeamDashboard(team!.id);

  if (!dashboardResult.success) {
    return <div className="p-8 text-red-600">Failed to load dashboard</div>;
  }

  const { stats, members, todaysJobs, collections, pendingPayroll } = dashboardResult;

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(amount);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            👥 {team!.name}
          </h1>
          <p className="text-gray-600">
            {isOwner ? "Team Owner" : `Role: ${role}`} • {stats?.totalMembers || 0} members
          </p>
        </div>
        
        {isOwner && (
          <div className="flex gap-3">
            <Link
              href="/dashboard/team/members"
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </Link>
            <Link
              href="/dashboard/team/settings"
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats?.totalMembers || 0}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">Total Members</p>
          <div className="mt-2 text-xs text-blue-200">
            🟢 {stats?.onlineMembers || 0} online • 🟡 {stats?.busyMembers || 0} busy
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats?.todaysJobCount || 0}</span>
          </div>
          <p className="text-purple-100 text-sm font-medium">Today's Jobs</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-8 w-8" />
            <span className="text-xl font-bold">{formatAmount(stats?.todaysCollection || 0)}</span>
          </div>
          <p className="text-emerald-100 text-sm font-medium">Today's Collections</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="h-8 w-8" />
            <span className="text-xl font-bold">{formatAmount(pendingPayroll?.totalUnpaid || 0)}</span>
          </div>
          <p className="text-orange-100 text-sm font-medium">Pending Payroll</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members Column */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
            <Link
              href="/dashboard/team/jobs"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Dispatch Job →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members?.map((member: any) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          {(!members || members.length === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No team members yet</p>
              <Link
                href="/dashboard/team/members"
                className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
              >
                Invite Members
              </Link>
            </div>
          )}
        </div>

        {/* Earnings Column */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Collections</h2>
          <EarningsOverview 
            totalCollected={collections?.totalCollected || 0}
            jobCount={collections?.jobCount || 0}
            byMethod={collections?.byMethod || {}}
            byCollector={collections?.byCollector || {}}
          />
          
          {/* Quick Actions */}
          <div className="mt-6 space-y-3">
            <Link
              href="/dashboard/team/payroll"
              className="block w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-center"
            >
              Process Payroll
            </Link>
            <Link
              href="/dashboard/team/jobs"
              className="block w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
            >
              View All Jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
