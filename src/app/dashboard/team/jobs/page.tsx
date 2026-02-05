import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyTeam, createJob, getTodaysJobsAction, assignMembersToJob, updateJobStatusAction, markJobAsCollected } from "@/app/actions/team";
import { ArrowLeft, Plus, Clock, MapPin, DollarSign, Users, Check, Play } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function TeamJobsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const teamResult = await getMyTeam();
  
  if (!teamResult.success || !teamResult.team) {
    redirect("/dashboard/team");
  }

  const { team, isOwner } = teamResult;

  // Get all jobs with assignments
  const jobs = await prisma.teamJob.findMany({
    where: { teamId: team!.id },
    include: {
      assignments: {
        include: {
          member: {
            include: { user: { select: { name: true, image: true } } }
          }
        }
      }
    },
    orderBy: { scheduledAt: 'desc' },
    take: 50
  });

  // Get available members for assignment
  const availableMembers = await prisma.teamMember.findMany({
    where: { 
      teamId: team!.id,
      status: { in: ['ONLINE', 'OFFLINE'] }
    },
    include: { user: { select: { name: true, image: true } } }
  });

  const formatAmount = (amount: number | any) =>
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(Number(amount) || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-700';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/team"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Dispatch</h1>
            <p className="text-gray-600">Create and assign jobs to your team</p>
          </div>
        </div>
      </div>

      {/* Create Job Form */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Plus className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Create New Job</h2>
          </div>
          
          <form action={async (formData: FormData) => {
            "use server";
            const { createJob } = await import("@/app/actions/team");
            await createJob({
              teamId: formData.get('teamId') as string,
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              location: { address: formData.get('address') as string },
              scheduledAt: new Date(formData.get('scheduledAt') as string),
              amount: parseFloat(formData.get('amount') as string),
              clientName: formData.get('clientName') as string,
              clientPhone: formData.get('clientPhone') as string
            });
          }}>
            <input type="hidden" name="teamId" value={team!.id} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Kitchen Plumbing Repair"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES) *
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  placeholder="5000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  name="clientName"
                  placeholder="Client name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Phone
                </label>
                <input
                  type="tel"
                  name="clientPhone"
                  placeholder="0712345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location/Address
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Westlands, Nairobi"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Job details..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Create Job
            </button>
          </form>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">All Jobs</h2>
        
        {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Job Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                  {job.status}
                </div>
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">{formatAmount(job.amount)}</p>
                {job.collected && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Collected via {job.paymentMethod}
                  </span>
                )}
              </div>
            </div>

            {/* Job Details */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                {new Date(job.scheduledAt).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              
              {job.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {(job.location as any)?.address || 'Location set'}
                </div>
              )}
              
              {job.clientName && (
                <div className="text-gray-600">
                  <span className="font-medium">Client:</span> {job.clientName}
                </div>
              )}
              
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                {job.assignments.length} assigned
              </div>
            </div>

            {/* Assigned Members */}
            {job.assignments.length > 0 && (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {job.assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1">
                      <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden">
                        {a.member.user.image ? (
                          <img src={a.member.user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                            {a.member.user.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{a.member.user.name}</span>
                      <span className="text-xs text-gray-400">({a.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {isOwner && (
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {job.status === 'PENDING' && (
                  <form action={async (formData: FormData) => {
                    "use server";
                    const { assignMembersToJob } = await import("@/app/actions/team");
                    const memberId = formData.get('memberId') as string;
                    if (memberId) {
                      await assignMembersToJob(formData.get('jobId') as string, [memberId]);
                    }
                  }} className="flex-1 flex gap-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <select
                      name="memberId"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select member to assign...</option>
                      {availableMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.user.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Assign
                    </button>
                  </form>
                )}

                {job.status === 'ASSIGNED' && (
                  <form action={async () => {
                    "use server";
                    const { updateJobStatusAction } = await import("@/app/actions/team");
                    await updateJobStatusAction(job.id, 'IN_PROGRESS');
                  }}>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium">
                      <Play className="h-4 w-4" /> Start Job
                    </button>
                  </form>
                )}

                {job.status === 'IN_PROGRESS' && (
                  <form action={async () => {
                    "use server";
                    const { updateJobStatusAction } = await import("@/app/actions/team");
                    await updateJobStatusAction(job.id, 'COMPLETED');
                  }}>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                      <Check className="h-4 w-4" /> Complete
                    </button>
                  </form>
                )}

                {job.status === 'COMPLETED' && !job.collected && (
                  <form action={async (formData: FormData) => {
                    "use server";
                    const { markJobAsCollected } = await import("@/app/actions/team");
                    await markJobAsCollected(
                      formData.get('jobId') as string,
                      formData.get('method') as any
                    );
                  }} className="flex gap-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <select
                      name="method"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="CARD">Card</option>
                    </select>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                      <DollarSign className="h-4 w-4" /> Mark Collected
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No jobs yet. Create one above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
