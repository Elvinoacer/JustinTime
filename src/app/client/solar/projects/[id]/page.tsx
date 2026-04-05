import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSolarProjectById, updateProjectStatus } from "@/app/actions/solar";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientSolarProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const result = await getSolarProjectById(id);
  if (!result.success) {
    return (
      <section className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700">
        {result.error || "Project not found"}
      </section>
    );
  }

  if (!result.project) {
    return (
      <section className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700">
        Project not found
      </section>
    );
  }

  const project = result.project;

  const formatMoney = (value: unknown) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return "KES 0";
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(numeric);
  };

  if (project.clientId !== session.user.id) {
    redirect("/client/solar/projects");
  }

  async function approveAction() {
    "use server";
    await updateProjectStatus(id, "APPROVED", "Approved by client");
  }

  async function cancelAction() {
    "use server";
    await updateProjectStatus(id, "CANCELLED", "Cancelled by client");
  }

  const canApprove = project.status === "PROPOSAL_SENT";
  const canCancel = !["COMPLETED", "CANCELLED"].includes(project.status);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <Link
            href="/client/solar/projects"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Solar Projects
          </Link>

          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {project.title}
              </h1>
              <p className="text-gray-600">{project.siteAddress}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {project.status}
                </span>
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                  Specialist: {project.provider?.name || "Pending assignment"}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>
                Estimated system:{" "}
                <strong>{project.systemSize || "-"} kW</strong>
              </p>
              <p>
                Panels: <strong>{project.panelCount || "-"}</strong>
              </p>
              <p>
                Quote amount:{" "}
                <strong>{project.quotedAmount?.toString() || "Pending"}</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Client Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <form action={approveAction}>
              <button
                type="submit"
                disabled={!canApprove}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Proposal
              </button>
            </form>

            <form action={cancelAction}>
              <button
                type="submit"
                disabled={!canCancel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="h-4 w-4" />
                Cancel Project
              </button>
            </form>

            <Link
              href={`/professionals/${project.providerId}`}
              className={`px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 ${
                project.providerId ? "" : "pointer-events-none opacity-50"
              }`}
            >
              View Specialist Profile
            </Link>
          </div>

          {!canApprove && project.status !== "PROPOSAL_SENT" ? (
            <p className="text-sm text-gray-500 mt-3">
              Proposal approval becomes available when the project reaches
              PROPOSAL_SENT.
            </p>
          ) : null}
        </section>

        {project.booking ? (
          <section className="rounded-2xl bg-white border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Booking & Payment
            </h2>

            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="space-y-1">
                <p>
                  Booking status: <strong>{project.booking.status}</strong>
                </p>
                <p>
                  Deposit amount:{" "}
                  <strong>{formatMoney(project.booking.totalAmount)}</strong>
                </p>
                <p>
                  Payment status:{" "}
                  <strong>
                    {project.booking.payment?.status || "PENDING"}
                  </strong>
                </p>
              </div>

              <div className="space-y-1">
                <p>
                  Invoice status:{" "}
                  <strong>
                    {project.booking.invoice?.status || "GENERATED"}
                  </strong>
                </p>
                <p>
                  Invoice number:{" "}
                  <strong>
                    {project.booking.invoice?.number || "Pending"}
                  </strong>
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href={`/bookings/${project.booking.id}/invoice`}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Open Invoice
                  </Link>
                  <Link
                    href="/client/bookings"
                    className="px-3 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                  >
                    Open My Bookings
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : project.status === "APPROVED" ? (
          <section className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-900">
            Your project has been approved and the billing artifacts are being
            prepared. Refresh shortly if the booking links are not visible yet.
          </section>
        ) : null}

        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Milestone Timeline
          </h2>

          {project.milestones.length === 0 ? (
            <p className="text-gray-600">
              No milestones have been recorded yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {project.milestones.map((milestone) => (
                <li
                  key={milestone.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {milestone.name}
                    </h3>
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
                  {milestone.description ? (
                    <p className="text-sm text-gray-600">
                      {milestone.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
