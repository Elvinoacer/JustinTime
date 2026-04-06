import { getAtRiskUsers, getInterventionStats } from "@/app/actions/churn";
import { ChurnAnalysisWorkspace } from "@/components/churn/ChurnAnalysisWorkspace";

export default async function ChurnAnalysisPage() {
  const [atRiskResult, statsResult] = await Promise.all([
    getAtRiskUsers({ page: 1, pageSize: 25 }),
    getInterventionStats(),
  ]);

  if (!atRiskResult.success || !statsResult.success) {
    const unauthorized =
      atRiskResult.error?.toLowerCase().includes("unauthorized") ||
      statsResult.error?.toLowerCase().includes("unauthorized");

    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-red-600">
          {unauthorized
            ? "Admin access is required to view churn analysis data."
            : "Failed to load churn analysis data"}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Churn Analysis Workspace
        </h1>
        <p className="text-gray-600">
          Analyze latest user churn risk, manage interventions, and track
          retention outcomes.
        </p>
      </div>

      <ChurnAnalysisWorkspace
        initialUsers={atRiskResult.users || []}
        initialMeta={
          atRiskResult.meta || {
            page: 1,
            pageSize: 25,
            totalFiltered: 0,
            totalPages: 1,
            hasAnyScores: false,
            hasAnyLatestAtRisk: false,
          }
        }
        initialStats={
          statsResult.stats || {
            total: 0,
            executed: 0,
            deliverySuccessful: 0,
            responses: 0,
            converted: 0,
            retained: 0,
            reopened: 0,
            booked: 0,
            reactivatedWithin7Days: 0,
            bookedWithin14Days: 0,
            retainedWithin30Days: 0,
            deliverySuccessRate: 0,
            responseRate: 0,
            conversionRate: 0,
          }
        }
      />
    </div>
  );
}
