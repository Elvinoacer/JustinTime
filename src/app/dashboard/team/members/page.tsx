import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyTeam, inviteTeamMember, removeTeamMember } from "@/app/actions/team";
import { MemberCard } from "@/components/teams/MemberCard";
import { Users, ArrowLeft, UserPlus, Trash2 } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function TeamMembersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const teamResult = await getMyTeam();
  
  if (!teamResult.success || !teamResult.team) {
    redirect("/dashboard/team");
  }

  const { team, isOwner } = teamResult;

  // Get detailed member list
  const members = await prisma.teamMember.findMany({
    where: { teamId: team!.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, phone: true } }
    },
    orderBy: { joinedAt: 'asc' }
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/team"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">{team!.name} • {members.length} members</p>
        </div>
      </div>

      {/* Invite Form (Owner Only) */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Invite New Member</h2>
          </div>
          
          <form action={async (formData: FormData) => {
            "use server";
            const { inviteTeamMember } = await import("@/app/actions/team");
            const email = formData.get('email') as string;
            const role = formData.get('role') as 'ADMIN' | 'MEMBER';
            const teamId = formData.get('teamId') as string;
            await inviteTeamMember(teamId, email, role);
          }}>
            <input type="hidden" name="teamId" value={team!.id} />
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="worker@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Invite
                </button>
              </div>
            </div>
          </form>
          
          <p className="text-sm text-gray-500 mt-3">
            The user must already have a JustInTime account with this email.
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-4">
        {/* Owner Card */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-purple-200 overflow-hidden flex items-center justify-center">
              <span className="text-xl font-bold text-purple-600">👑</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Team Owner</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 text-purple-700">
                  OWNER
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                {isOwner ? "You" : "Another user"} • Controls team settings and payroll
              </p>
            </div>
          </div>
        </div>

        {/* Member Cards */}
        {members.map((member) => (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                {member.user.image ? (
                  <img src={member.user.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                    {member.user.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{member.user.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === 'ADMIN' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {member.role}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{member.user.email}</p>
              </div>

              <div className="text-right text-sm text-gray-500">
                <p>{member.totalJobsCompleted} jobs</p>
                <p className="text-emerald-600 font-medium">
                  KES {Number(member.totalEarnings).toLocaleString()}
                </p>
              </div>

              {isOwner && (
                <form action={async () => {
                  "use server";
                  const { removeTeamMember } = await import("@/app/actions/team");
                  await removeTeamMember(member.id);
                }}>
                  <button
                    type="submit"
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No members yet. Invite your team above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
