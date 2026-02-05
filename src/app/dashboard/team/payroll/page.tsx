import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyTeam, getPendingPayrollAction, generatePayrollAction, processPayrollAction } from "@/app/actions/team";
import { ArrowLeft, DollarSign, Users, Calendar, Check, Clock } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function TeamPayrollPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const teamResult = await getMyTeam();
  
  if (!teamResult.success || !teamResult.team) {
    redirect("/dashboard/team");
  }

  const { team, isOwner } = teamResult;

  // Get pending payroll
  const pendingResult = await getPendingPayrollAction(team!.id);
  
  // Get payroll history
  const payrolls = await prisma.teamPayroll.findMany({
    where: { teamId: team!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      _count: { select: { earnings: true } }
    }
  });

  const formatAmount = (amount: number | any) =>
    new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES', 
      maximumFractionDigits: 0 
    }).format(Number(amount) || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Default period: last 7 days
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

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
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600">Process payments for your team members</p>
        </div>
      </div>

      {/* Pending Payroll Summary */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Unpaid Earnings</h2>
          <DollarSign className="h-8 w-8 opacity-80" />
        </div>
        <p className="text-4xl font-bold mb-2">
          {formatAmount(pendingResult.success ? pendingResult.totalUnpaid : 0)}
        </p>
        <p className="text-purple-200">
          {pendingResult.success ? pendingResult.unpaidCount : 0} earnings pending • 
          {pendingResult.success ? pendingResult.byMember?.length || 0 : 0} members
        </p>
      </div>

      {/* By Member Breakdown */}
      {pendingResult.success && pendingResult.byMember && pendingResult.byMember.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Pending by Member</h3>
          <div className="space-y-3">
            {pendingResult.byMember.map((m: any) => (
              <div key={m.memberId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                  {m.memberImage ? (
                    <img src={m.memberImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                      {m.memberName?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{m.memberName}</p>
                </div>
                <p className="text-lg font-bold text-purple-600">{formatAmount(m.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Payroll Form */}
      {isOwner && pendingResult.success && (pendingResult.totalUnpaid || 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Generate Payroll Batch</h3>
          
          <form action={async (formData: FormData) => {
            "use server";
            const { generatePayrollAction, processPayrollAction } = await import("@/app/actions/team");
            const teamId = formData.get('teamId') as string;
            const start = new Date(formData.get('periodStart') as string);
            const end = new Date(formData.get('periodEnd') as string);
            
            const result = await generatePayrollAction(teamId, start, end);
            
            // Auto-process if successful
            if (result.success && result.payroll) {
              await processPayrollAction(result.payroll.id);
            }
          }}>
            <input type="hidden" name="teamId" value={team!.id} />
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start
                </label>
                <input
                  type="date"
                  name="periodStart"
                  defaultValue={periodStart.toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End
                </label>
                <input
                  type="date"
                  name="periodEnd"
                  defaultValue={periodEnd.toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Process Payroll ({formatAmount(pendingResult.totalUnpaid || 0)})
            </button>
          </form>
          
          <p className="text-sm text-gray-500 mt-3 text-center">
            This will mark all pending earnings as paid
          </p>
        </div>
      )}

      {/* Payroll History */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Payroll History</h3>
        
        <div className="space-y-3">
          {payrolls.map((payroll) => (
            <div key={payroll.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payroll.status)}`}>
                    {payroll.status === 'COMPLETED' && <Check className="h-4 w-4 inline mr-1" />}
                    {payroll.status === 'PENDING' && <Clock className="h-4 w-4 inline mr-1" />}
                    {payroll.status}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(payroll.periodStart).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - 
                      {new Date(payroll.periodEnd).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {payroll.memberCount} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {payroll._count.earnings} earnings
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">{formatAmount(payroll.totalAmount)}</p>
                  {payroll.processedAt && (
                    <p className="text-xs text-gray-500">
                      Paid {new Date(payroll.processedAt).toLocaleDateString('en-KE')}
                    </p>
                  )}
                </div>
              </div>

              {/* Process button for pending payrolls */}
              {isOwner && payroll.status === 'PENDING' && (
                <form action={async () => {
                  "use server";
                  const { processPayrollAction } = await import("@/app/actions/team");
                  await processPayrollAction(payroll.id);
                }} className="mt-4">
                  <button className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                    Process This Payroll
                  </button>
                </form>
              )}
            </div>
          ))}

          {payrolls.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No payroll history yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
