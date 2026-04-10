import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  addProjectMilestone,
  assignSolarProjectProvider,
  completeProjectMilestone,
  getSolarInstallers,
  getSolarProjectById,
  updateProjectStatus,
} from "@/app/actions/solar";
import { ArrowLeft, CheckCircle2, ClipboardList, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "QUOTE_REQUESTED",
  "SITE_ASSESSMENT",
  "PROPOSAL_SENT",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "WARRANTY",
  "CANCELLED",
] as const;

export default async function SolarProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const [projectResult, installersResult] = await Promise.all([
    getSolarProjectById(id),
    getSolarInstallers({ limit: 20 }),
  ]);

  if (!projectResult.success) {
    return (
      <section className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700">
        {projectResult.error || "Project not found"}
      </section>
    );
  }

  if (!projectResult.project) {
    return (
      <section className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700">
        Project not found
      </section>
    );
  }

  const project = projectResult.project;

  const isAdmin = hasRole(session.user, "ADMIN");
  const isClient = project.clientId === session.user.id;
  const isAssignedProvider = project.providerId === session.user.id;

  const formatMoney = (value: unknown) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return "KES 0";
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(numeric);
  };

  async function updateStatusAction(formData: FormData) {
    "use server";

    const status = String(formData.get("status") || "");
    const notes = String(formData.get("notes") || "").trim();

    await updateProjectStatus(id, status as any, notes || undefined);
  }

  async function assignProviderAction(formData: FormData) {
    "use server";

    const specialistId = String(formData.get("specialistId") || "").trim();
    if (!specialistId) return;

    await assignSolarProjectProvider({
      projectId: id,
      specialistId,
    });
  }

  async function addMilestoneAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const checklist = String(formData.get("checklist") || "").trim();
    const paymentRequired = formData.get("paymentRequired") === "on";
    const paymentAmountRaw = String(formData.get("paymentAmount") || "").trim();
    const parsedPaymentAmount = Number.parseFloat(paymentAmountRaw);
    const paymentAmount =
      paymentRequired && Number.isFinite(parsedPaymentAmount)
        ? parsedPaymentAmount
        : undefined;

    await addProjectMilestone({
      projectId: id,
      name,
      description: description || undefined,
      paymentRequired,
      paymentAmount,
      checklistItems: checklist
        ? checklist
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    });
  }

  async function completeMilestoneAction(formData: FormData) {
    "use server";

    const milestoneId = String(formData.get("milestoneId") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    await completeProjectMilestone({
      milestoneId,
      notes: notes || undefined,
    });
  }

  return (
    <div className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <Link
          href="/dashboard/solar/projects"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Solar Projects
        </Link>

        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.title}
            </h1>
            <p className="text-gray-600">
              {project.siteAddress} •{" "}
              {project.propertyType || "Property type pending"}
            </p>
          </div>

          <div className="text-sm text-gray-600">
            <p>
              Status: <strong>{project.status}</strong>
            </p>
            <p>
              Specialist:{" "}
              <strong>{project.provider?.name || "Not assigned"}</strong>
            </p>
            <p>
              Client: <strong>{project.client.name || "Client"}</strong>
            </p>
          </div>
        </div>
      </section>

      {project.booking ? (
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Booking & Billing Link
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1 text-gray-700">
              <p>
                Booking status: <strong>{project.booking.status}</strong>
              </p>
              <p>
                Deposit amount:{" "}
                <strong>{formatMoney(project.booking.totalAmount)}</strong>
              </p>
              <p>
                Payment:{" "}
                <strong>{project.booking.payment?.status || "PENDING"}</strong>
              </p>
            </div>
            <div className="space-y-1 text-gray-700">
              <p>
                Invoice:{" "}
                <strong>
                  {project.booking.invoice?.status || "GENERATED"}
                </strong>
              </p>
              <p>
                Invoice number:{" "}
                <strong>{project.booking.invoice?.number || "Pending"}</strong>
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/bookings/${project.booking.id}/invoice`}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Open Invoice
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="px-3 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                >
                  Open Bookings
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : project.status === "APPROVED" ? (
        <section className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-900">
          Booking and deposit artifacts are being prepared for this approved
          project. Refresh in a moment if links are not visible yet.
        </section>
      ) : null}

      {!project.provider && (isAdmin || isClient) && (
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" />
            Assign Specialist
          </h2>

          <form
            action={assignProviderAction}
            className="flex flex-wrap gap-3 items-center"
          >
            <select
              name="specialistId"
              required
              className="min-w-70 rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select specialist</option>
              {installersResult.success && installersResult.specialists
                ? installersResult.specialists.map((specialist) => (
                    <option key={specialist.id} value={specialist.id}>
                      {(specialist.name || "Specialist").trim()} • Rating{" "}
                      {specialist.averageRating.toFixed(1)}
                    </option>
                  ))
                : null}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
            >
              Assign
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Update Project Status
        </h2>

        <form
          action={updateStatusAction}
          className="grid md:grid-cols-[220px_1fr_auto] gap-3 items-center"
        >
          <select
            name="status"
            defaultValue={project.status}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            {STATUS_OPTIONS.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="notes"
            placeholder="Status notes (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
          >
            Save
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-2">
          Access control and transition validation are enforced server-side.
        </p>
      </section>

      {(isAdmin || isAssignedProvider) && (
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Add Milestone
          </h2>
          <form
            action={addMilestoneAction}
            className="grid md:grid-cols-4 gap-3"
          >
            <input
              type="text"
              name="name"
              required
              placeholder="Milestone name"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              type="text"
              name="description"
              placeholder="Description"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              type="text"
              name="checklist"
              placeholder="Checklist (comma separated)"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />

            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="paymentRequired"
                className="h-4 w-4"
              />
              Payment milestone
            </label>

            <input
              type="number"
              name="paymentAmount"
              min={1}
              step={0.01}
              placeholder="Payment amount (KES)"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />

            <button
              type="submit"
              className="md:col-span-4 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
            >
              Add Milestone
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-600" />
          Milestone Timeline
        </h2>

        {project.milestones.length === 0 ? (
          <p className="text-gray-600">No milestones added yet.</p>
        ) : (
          <ol className="space-y-3">
            {project.milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {milestone.name}
                    </h3>
                    {milestone.description ? (
                      <p className="text-sm text-gray-600">
                        {milestone.description}
                      </p>
                    ) : null}
                    {milestone.paymentRequired ? (
                      <p className="text-sm text-amber-700 mt-1">
                        Payment milestone:{" "}
                        {formatMoney(milestone.paymentAmount)}{" "}
                        <span className="font-medium">
                          ({milestone.paymentPaid ? "Paid" : "Pending payment"})
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      milestone.isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {milestone.isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>

                {!milestone.isCompleted && (isAdmin || isAssignedProvider) ? (
                  <form
                    action={completeMilestoneAction}
                    className="flex flex-wrap gap-2 items-center"
                  >
                    <input
                      type="hidden"
                      name="milestoneId"
                      value={milestone.id}
                    />
                    <input
                      type="text"
                      name="notes"
                      placeholder="Completion notes"
                      className="min-w-55 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Complete
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
