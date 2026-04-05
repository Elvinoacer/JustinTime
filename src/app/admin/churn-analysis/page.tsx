import {
  getAtRiskUsers,
  getInterventionStats,
  triggerChurnAnalysis,
  triggerUserReEngagement,
} from "@/app/actions/churn";
import { ChurnRiskBadge } from "@/components/churn/ChurnRiskBadge";
import { AlertTriangle, TrendingUp, Users, Mail, Calendar } from "lucide-react";

export default async function ChurnAnalysisPage() {
  const [atRiskResult, statsResult] = await Promise.all([
    getAtRiskUsers(),
    getInterventionStats(),
  ]);

  if (!atRiskResult.success || !statsResult.success) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-600">Failed to load churn analysis data</p>
      </div>
    );
  }

  const atRiskUsers = atRiskResult.users || [];
  const stats = statsResult.stats;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Churn Analysis Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor at-risk users and manage re-engagement campaigns
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8" />
            <span className="text-2xl font-bold">{atRiskUsers.length}</span>
          </div>
          <p className="text-red-100 text-sm font-medium">At-Risk Users</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats?.total || 0}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">
            Total Interventions
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {stats?.successRate || 0}%
            </span>
          </div>
          <p className="text-green-100 text-sm font-medium">Success Rate</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Mail className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats?.successful || 0}</span>
          </div>
          <p className="text-purple-100 text-sm font-medium">Successful</p>
        </div>
      </div>

      {/* At-Risk Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">At-Risk Users</h2>
          <p className="text-sm text-gray-600 mt-1">
            Users identified as at risk of churning
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Intervention
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {atRiskUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No at-risk users found
                  </td>
                </tr>
              ) : (
                atRiskUsers.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {item.user.image ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={item.user.image}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-medium text-sm">
                                {item.user.name?.charAt(0) || "?"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.user.name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ChurnRiskBadge riskLevel={item.riskLevel} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.round(item.score * 100)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastActivityDays} days ago
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.interventions[0] ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {item.interventions[0].type}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(
                              item.interventions[0].createdAt,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <form
                        action={async () => {
                          "use server";
                          await triggerUserReEngagement(item.userId);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          Re-engage
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <form
          action={async () => {
            "use server";
            await triggerChurnAnalysis();
          }}
        >
          <button
            type="submit"
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Run Full Analysis
          </button>
        </form>
      </div>
    </div>
  );
}
