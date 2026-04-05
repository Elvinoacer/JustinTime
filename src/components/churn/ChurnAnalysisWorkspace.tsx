"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createManualIntervention,
  getAtRiskUsers,
  triggerChurnAnalysis,
  triggerUserReEngagement,
  updateInterventionOutcome,
  type AtRiskUserRow,
} from "@/app/actions/churn";
import {
  ChurnInterventionChannel,
  ChurnInterventionOutcome,
  ChurnInterventionStatus,
  ChurnRiskLevel,
} from "@/generated/prisma/client";
import { ChurnRiskBadge } from "@/components/churn/ChurnRiskBadge";
import {
  AlertTriangle,
  Mail,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChurnWorkspaceMeta {
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  hasAnyScores: boolean;
  hasAnyLatestAtRisk: boolean;
}

interface ChurnStats {
  total: number;
  executed: number;
  deliverySuccessful: number;
  responses: number;
  converted: number;
  retained: number;
  reopened: number;
  booked: number;
  reactivatedWithin7Days: number;
  bookedWithin14Days: number;
  retainedWithin30Days: number;
  deliverySuccessRate: number;
  responseRate: number;
  conversionRate: number;
}

interface Props {
  initialUsers: AtRiskUserRow[];
  initialMeta: ChurnWorkspaceMeta;
  initialStats: ChurnStats;
}

type RiskFilter = "ALL" | ChurnRiskLevel;
type InterventionStatusFilter = "ALL" | ChurnInterventionStatus | "NONE";

export function ChurnAnalysisWorkspace({
  initialUsers,
  initialMeta,
  initialStats,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<AtRiskUserRow[]>(initialUsers);
  const [meta, setMeta] = useState<ChurnWorkspaceMeta>(initialMeta);
  const [stats] = useState<ChurnStats>(initialStats);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialUsers[0]?.userId ?? null,
  );
  const [activeReEngageUserId, setActiveReEngageUserId] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [search, setSearch] = useState("");
  const [interventionStatus, setInterventionStatus] =
    useState<InterventionStatusFilter>("ALL");
  const [onlyNotContacted, setOnlyNotContacted] = useState(false);
  const [contactedWithinDays, setContactedWithinDays] = useState("");
  const [scoreAgeDays, setScoreAgeDays] = useState("");

  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: initialUsers[0]?.userId ?? "",
    type: "MANUAL_OUTREACH",
    channel: "MANUAL_OUTREACH" as ChurnInterventionChannel,
    message: "",
    offerText: "",
    scheduledFor: "",
    assignee: "",
  });

  const [outcomeForm, setOutcomeForm] = useState({
    status: "RESPONDED" as ChurnInterventionStatus,
    outcome: "REOPENED" as ChurnInterventionOutcome,
    response: "",
  });

  const selectedRow = useMemo(
    () => rows.find((row) => row.userId === selectedUserId) || null,
    [rows, selectedUserId],
  );

  const applyFilters = (page = 1) => {
    startTransition(async () => {
      const result = await getAtRiskUsers({
        riskLevel: riskFilter === "ALL" ? undefined : riskFilter,
        search,
        interventionStatus:
          interventionStatus === "ALL" ? undefined : interventionStatus,
        onlyNotContacted,
        contactedWithinDays: contactedWithinDays
          ? Number(contactedWithinDays)
          : undefined,
        scoreAgeDays: scoreAgeDays ? Number(scoreAgeDays) : undefined,
        page,
        pageSize: meta.pageSize,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to load churn users");
        return;
      }

      setRows(result.users || []);
      setMeta(result.meta as ChurnWorkspaceMeta);

      if (result.users?.length) {
        setSelectedUserId((current) =>
          result.users.some((row) => row.userId === current)
            ? current
            : result.users[0].userId,
        );
      } else {
        setSelectedUserId(null);
      }
    });
  };

  const handleRunAnalysis = () => {
    startTransition(async () => {
      const result = await triggerChurnAnalysis();
      if (!result.success) {
        toast.error(result.error || "Failed to run analysis");
        return;
      }

      toast.success("Full churn analysis completed");
      applyFilters(1);
      router.refresh();
    });
  };

  const handleReEngage = (userId: string) => {
    setActiveReEngageUserId(userId);
    startTransition(async () => {
      const result = await triggerUserReEngagement(userId);
      setActiveReEngageUserId(null);

      if (!result.success) {
        toast.error(result.error || "Failed to trigger re-engagement");
        return;
      }

      if (result.skipped) {
        toast.info(
          "Re-engagement skipped due to cooldown or existing intervention",
        );
      } else {
        toast.success("Re-engagement triggered");
      }

      applyFilters(meta.page);
      router.refresh();
    });
  };

  const handleCreateManual = () => {
    if (!manualForm.userId || !manualForm.message.trim()) {
      toast.error("Select a user and enter a message");
      return;
    }

    const detailedMessage = [
      manualForm.message.trim(),
      manualForm.offerText.trim()
        ? `Offer/Discount: ${manualForm.offerText.trim()}`
        : null,
      manualForm.scheduledFor
        ? `Scheduled for: ${new Date(manualForm.scheduledFor).toISOString()}`
        : null,
      manualForm.assignee.trim()
        ? `Assignee: ${manualForm.assignee.trim()}`
        : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n\n");

    startTransition(async () => {
      const result = await createManualIntervention({
        userId: manualForm.userId,
        type: manualForm.type,
        channel: manualForm.channel,
        message: detailedMessage,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create intervention");
        return;
      }

      toast.success("Manual intervention draft created");
      setManualOpen(false);
      setManualForm((prev) => ({
        ...prev,
        message: "",
        offerText: "",
        scheduledFor: "",
        assignee: "",
      }));
      applyFilters(meta.page);
      router.refresh();
    });
  };

  const handleRetryFailed = () => {
    if (!selectedRow?.userId) {
      toast.error("Select a user first");
      return;
    }

    startTransition(async () => {
      const result = await triggerUserReEngagement(selectedRow.userId, {
        force: true,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to retry intervention");
        return;
      }

      toast.success("Retry request submitted");
      applyFilters(meta.page);
      router.refresh();
    });
  };

  const handleOutcomeUpdate = () => {
    if (!selectedRow?.lastIntervention) {
      toast.error("Select a user with an intervention first");
      return;
    }

    startTransition(async () => {
      const result = await updateInterventionOutcome({
        interventionId: selectedRow.lastIntervention!.id,
        status: outcomeForm.status,
        outcome: outcomeForm.outcome,
        response: outcomeForm.response.trim() || null,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update intervention");
        return;
      }

      toast.success("Intervention updated");
      setOutcomeForm((prev) => ({ ...prev, response: "" }));
      applyFilters(meta.page);
      router.refresh();
    });
  };

  const getEmptyStateMessage = () => {
    if (!meta.hasAnyScores) {
      return "No churn analysis has been run yet. Run Full Analysis to generate the first snapshot.";
    }

    if (!meta.hasAnyLatestAtRisk) {
      return "No at-risk users found in the latest snapshot.";
    }

    return "No users match the current filters.";
  };

  const getRecommendedAction = (row: AtRiskUserRow) => {
    if (!row.lastIntervention) {
      return "No contact yet. Trigger automated re-engagement or create a manual draft.";
    }

    if (row.lastIntervention.status === "FAILED") {
      return "Previous intervention failed. Retry now, then monitor delivery status.";
    }

    if (row.lastIntervention.status === "SENT") {
      return "Follow up with the user and record an outcome when they respond.";
    }

    if (row.lastIntervention.status === "RESPONDED") {
      return "Engagement detected. Track whether this converts to retained/booked state.";
    }

    if (row.lastIntervention.status === "CONVERTED") {
      return "User converted successfully. Keep monitoring score trend for relapse risk.";
    }

    if (
      row.latestScore.riskLevel === "HIGH" ||
      row.latestScore.riskLevel === "CRITICAL"
    ) {
      return "High-risk user. Keep intervention cadence within cooldown and record outcomes.";
    }

    return "Review score factors and decide whether outreach is still needed.";
  };

  const getStatusBadgeClass = (status: ChurnInterventionStatus) => {
    if (status === "FAILED") {
      return "bg-red-100 text-red-700";
    }
    if (status === "CONVERTED") {
      return "bg-green-100 text-green-700";
    }
    if (status === "RESPONDED") {
      return "bg-blue-100 text-blue-700";
    }
    if (status === "SENT") {
      return "bg-emerald-100 text-emerald-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8" />
            <span className="text-2xl font-bold">{meta.totalFiltered}</span>
          </div>
          <p className="text-red-100 text-sm font-medium">At-Risk Users</p>
        </div>

        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8" />
            <span className="text-2xl font-bold">{stats.total || 0}</span>
          </div>
          <p className="text-blue-100 text-sm font-medium">
            Total Interventions
          </p>
        </div>

        <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {stats.deliverySuccessRate || 0}%
            </span>
          </div>
          <p className="text-green-100 text-sm font-medium">
            Delivery Success Rate
          </p>
        </div>

        <div className="bg-linear-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-8 w-8" />
            <span className="text-2xl font-bold">
              {stats.conversionRate || 0}%
            </span>
          </div>
          <p className="text-amber-100 text-sm font-medium">Conversion Rate</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "MEDIUM", "HIGH", "CRITICAL"] as const).map((risk) => (
            <button
              key={risk}
              type="button"
              onClick={() => setRiskFilter(risk)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                riskFilter === risk
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {risk}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search user name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={interventionStatus}
            onChange={(event) =>
              setInterventionStatus(
                event.target.value as InterventionStatusFilter,
              )
            }
          >
            <option value="ALL">Any intervention status</option>
            <option value="NONE">No intervention yet</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXECUTING">Executing</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="RESPONDED">Responded</option>
            <option value="CONVERTED">Converted</option>
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={contactedWithinDays}
            onChange={(event) => setContactedWithinDays(event.target.value)}
          >
            <option value="">Any contact time</option>
            <option value="7">Contacted in 7 days</option>
            <option value="14">Contacted in 14 days</option>
            <option value="30">Contacted in 30 days</option>
          </select>

          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={scoreAgeDays}
            onChange={(event) => setScoreAgeDays(event.target.value)}
          >
            <option value="">Any score age</option>
            <option value="1">Scored in last 24h</option>
            <option value="7">Scored in last 7 days</option>
            <option value="30">Scored in last 30 days</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyNotContacted}
              onChange={(event) => setOnlyNotContacted(event.target.checked)}
            />
            Only users not contacted yet
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => applyFilters(1)}
              disabled={isPending}
            >
              Apply Filters
            </Button>

            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Create Manual Intervention</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Manual Intervention</DialogTitle>
                  <DialogDescription>
                    This creates a non-executed draft for admin follow-up.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 mt-2">
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={manualForm.userId}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        userId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select user</option>
                    {rows.map((row) => (
                      <option key={row.userId} value={row.userId}>
                        {row.user.name || "Unknown"} (
                        {row.user.email || row.userId})
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={manualForm.type}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="MANUAL_OUTREACH">Manual Outreach</option>
                    <option value="PERSONAL_CALL">Personal Call</option>
                    <option value="DISCOUNT_FOLLOW_UP">
                      Discount Follow-up
                    </option>
                  </select>

                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={manualForm.channel}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        channel: event.target.value as ChurnInterventionChannel,
                      }))
                    }
                  >
                    <option value="MANUAL_OUTREACH">Manual Outreach</option>
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="PUSH">Push</option>
                    <option value="DISCOUNT">Discount</option>
                  </select>

                  <textarea
                    className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Write outreach notes, script, or task details"
                    value={manualForm.message}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        message: event.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="Optional offer or incentive"
                    value={manualForm.offerText}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        offerText: event.target.value,
                      }))
                    }
                  />

                  <Input
                    type="datetime-local"
                    value={manualForm.scheduledFor}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        scheduledFor: event.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="Assignee (optional)"
                    value={manualForm.assignee}
                    onChange={(event) =>
                      setManualForm((prev) => ({
                        ...prev,
                        assignee: event.target.value,
                      }))
                    }
                  />
                </div>

                <DialogFooter className="mt-3">
                  <Button
                    variant="outline"
                    onClick={() => setManualOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateManual} disabled={isPending}>
                    {isPending ? "Saving..." : "Create Draft"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={handleRunAnalysis} disabled={isPending}>
              {isPending ? "Running..." : "Run Full Analysis"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              At-Risk Users
            </h2>
            <p className="text-sm text-gray-600">
              Latest score snapshot per user with intervention context
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      {getEmptyStateMessage()}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.userId}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedUserId === row.userId ? "bg-emerald-50/60" : ""
                      }`}
                      onClick={() => setSelectedUserId(row.userId)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {row.user.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.user.email || row.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ChurnRiskBadge riskLevel={row.latestScore.riskLevel} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        <div>{Math.round(row.latestScore.score * 100)}%</div>
                        <div className="text-xs text-gray-500">
                          {row.latestScore.lastActivityDays}d inactive
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {row.lastIntervention ? (
                          <div>
                            <div>{row.lastIntervention.type}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(
                                row.lastIntervention.createdAt,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          className="text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-60"
                          disabled={
                            isPending ||
                            activeReEngageUserId === row.userId ||
                            row.latestScore.riskLevel === "LOW"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleReEngage(row.userId);
                          }}
                        >
                          {activeReEngageUserId === row.userId
                            ? "Sending..."
                            : "Re-engage"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 p-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1 || isPending}
                onClick={() => applyFilters(meta.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages || isPending}
                onClick={() => applyFilters(meta.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">User Detail</h3>

          {!selectedRow ? (
            <p className="text-sm text-gray-500">
              Select a user to inspect churn factors and intervention workflow.
            </p>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-500">User</p>
                <p className="font-medium text-gray-900">
                  {selectedRow.user.name || "Unknown"}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedRow.user.email}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">Latest Score</p>
                <div className="flex items-center justify-between">
                  <ChurnRiskBadge
                    riskLevel={selectedRow.latestScore.riskLevel}
                    score={selectedRow.latestScore.score}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(
                      selectedRow.latestScore.calculatedAt,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Factor Breakdown</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <div>
                    Inactivity:{" "}
                    {selectedRow.latestScore.factors?.inactivityDays ?? "-"}{" "}
                    days
                  </div>
                  <div>
                    Booking decline:{" "}
                    {selectedRow.latestScore.bookingDecline ?? 0}%
                  </div>
                  <div>
                    Profile completeness:{" "}
                    {selectedRow.latestScore.factors?.profileCompleteness ?? 0}%
                  </div>
                  <div>
                    Average rating:{" "}
                    {selectedRow.latestScore.factors?.avgRating ?? 0}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Score History</p>
                {selectedRow.scoreHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">No history yet</p>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-700">
                    {selectedRow.scoreHistory.slice(0, 5).map((score) => (
                      <li
                        key={score.id}
                        className="flex items-center justify-between"
                      >
                        <span>{Math.round(score.score * 100)}%</span>
                        <span className="text-xs text-gray-500">
                          {new Date(score.calculatedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Intervention History
                </p>
                {selectedRow.interventionHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">No interventions yet</p>
                ) : (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {selectedRow.interventionHistory.slice(0, 5).map((item) => (
                      <li
                        key={item.id}
                        className="border border-gray-100 rounded-md p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-800">
                            {item.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                          {item.outcome ? ` • Outcome: ${item.outcome}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-xs font-medium text-emerald-700">
                  Recommended Next Action
                </p>
                <p className="text-sm text-emerald-900 mt-1">
                  {getRecommendedAction(selectedRow)}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-200 space-y-2">
                <p className="text-sm font-medium text-gray-800">
                  Intervention Controls
                </p>
                <p className="text-xs text-gray-500">
                  Last intervention status:{" "}
                  {selectedRow.lastIntervention?.status || "None"}
                </p>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={outcomeForm.status}
                  onChange={(event) =>
                    setOutcomeForm((prev) => ({
                      ...prev,
                      status: event.target.value as ChurnInterventionStatus,
                    }))
                  }
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="SENT">Sent</option>
                  <option value="RESPONDED">Responded</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="FAILED">Failed</option>
                </select>

                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={outcomeForm.outcome}
                  onChange={(event) =>
                    setOutcomeForm((prev) => ({
                      ...prev,
                      outcome: event.target.value as ChurnInterventionOutcome,
                    }))
                  }
                >
                  <option value="NO_RESPONSE">No response</option>
                  <option value="REOPENED">Reopened</option>
                  <option value="BOOKED">Booked</option>
                  <option value="RETAINED">Retained</option>
                </select>

                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add operator notes"
                  value={outcomeForm.response}
                  onChange={(event) =>
                    setOutcomeForm((prev) => ({
                      ...prev,
                      response: event.target.value,
                    }))
                  }
                />

                <Button
                  className="w-full"
                  disabled={!selectedRow.lastIntervention || isPending}
                  onClick={handleOutcomeUpdate}
                >
                  {isPending ? "Updating..." : "Update Intervention"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={
                    isPending ||
                    selectedRow.lastIntervention?.status !== "FAILED"
                  }
                  onClick={handleRetryFailed}
                >
                  Retry Failed Intervention
                </Button>
              </div>
            </>
          )}

          <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Response rate: {stats.responseRate}%
            </div>
            <div className="mt-1">
              Converted interventions: {stats.converted}
            </div>
            <div className="mt-1">
              Reactivated in 7 days: {stats.reactivatedWithin7Days}
            </div>
            <div className="mt-1">
              Booked in 14 days: {stats.bookedWithin14Days}
            </div>
            <div className="mt-1">
              Retained in 30 days: {stats.retainedWithin30Days}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
