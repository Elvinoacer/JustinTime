import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getMySolarCertifications,
  getSolarCertificationsForReview,
  getSolarSpecialistsAdmin,
  reviewSolarCertification,
  updateSolarSpecialistAdminState,
} from "@/app/actions/solar";

export const dynamic = "force-dynamic";

export default async function SolarCertificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const isAdmin = hasRole(session.user, "ADMIN");
  const isProvider = hasRole(session.user, "PROVIDER");

  if (!isAdmin && !isProvider) {
    redirect("/dashboard");
  }

  const [myCertificationsResult, queueResult, specialistsResult] =
    await Promise.all([
      getMySolarCertifications(),
      isAdmin ? getSolarCertificationsForReview() : Promise.resolve(null),
      isAdmin ? getSolarSpecialistsAdmin() : Promise.resolve(null),
    ]);

  async function reviewAction(formData: FormData) {
    "use server";

    const certificationId = String(
      formData.get("certificationId") || "",
    ).trim();
    const decision = String(formData.get("decision") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    await reviewSolarCertification({
      certificationId,
      decision: decision as "VERIFIED" | "REJECTED" | "EXPIRED",
      notes: notes || undefined,
    });
  }

  async function updateSpecialistAction(formData: FormData) {
    "use server";

    const specialistId = String(formData.get("specialistId") || "").trim();
    const isVerified = formData.get("isVerified") === "on";
    const isFeatured = formData.get("isFeatured") === "on";
    const featuredUntilRaw = String(formData.get("featuredUntil") || "").trim();

    await updateSolarSpecialistAdminState({
      specialistId,
      isVerified,
      isFeatured,
      featuredUntil: featuredUntilRaw ? new Date(featuredUntilRaw) : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Solar Certifications
        </h1>
        <p className="text-gray-600 mb-4">
          Providers track certificate status here. Admins can verify submissions
          and manage specialist featured/verified state.
        </p>
        <div className="flex gap-3">
          <Link
            href="/dashboard/verticals/solar/apply"
            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            Submit Certification
          </Link>
          <Link
            href="/dashboard/solar"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Back to Solar Dashboard
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          My Certifications
        </h2>

        {!myCertificationsResult.success ? (
          <p className="text-red-600">{myCertificationsResult.error}</p>
        ) : myCertificationsResult.certifications.length === 0 ? (
          <p className="text-gray-600">No certifications submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {myCertificationsResult.certifications.map((certification) => (
              <article
                key={certification.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {certification.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    {certification.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {certification.issuingBody}
                </p>
                {certification.notes ? (
                  <p className="text-sm text-gray-700 mt-2">
                    {certification.notes}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {isAdmin && queueResult?.success && (
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Admin Review Queue
          </h2>

          {queueResult.certifications.length === 0 ? (
            <p className="text-gray-600">No certifications pending review.</p>
          ) : (
            <div className="space-y-4">
              {queueResult.certifications.map((certification) => (
                <form
                  key={certification.id}
                  action={reviewAction}
                  className="rounded-xl border border-gray-200 p-4 space-y-3"
                >
                  <input
                    type="hidden"
                    name="certificationId"
                    value={certification.id}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {certification.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {certification.issuingBody} •{" "}
                        {certification.user.name || certification.user.email}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {certification.status}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-center">
                    <select
                      name="decision"
                      defaultValue={
                        certification.status === "PENDING"
                          ? "VERIFIED"
                          : certification.status
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="VERIFIED">Verify</option>
                      <option value="REJECTED">Reject</option>
                      <option value="EXPIRED">Mark Expired</option>
                    </select>

                    <input
                      type="text"
                      name="notes"
                      defaultValue={certification.notes || ""}
                      placeholder="Review notes"
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    />

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdmin && specialistsResult?.success && (
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Specialist Verification & Featured Controls
          </h2>

          {specialistsResult.specialists.length === 0 ? (
            <p className="text-gray-600">No solar specialists found.</p>
          ) : (
            <div className="space-y-4">
              {specialistsResult.specialists.map((specialist) => (
                <form
                  key={specialist.id}
                  action={updateSpecialistAction}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <input
                    type="hidden"
                    name="specialistId"
                    value={specialist.id}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {specialist.user.name || specialist.user.email}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {specialist.user.profile?.location ||
                          "Location not set"}{" "}
                        • {specialist.experienceYears} yrs experience
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      Rating {specialist.averageRating.toFixed(1)} •{" "}
                      {specialist.projectsCompleted} projects
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[auto_auto_220px_auto] gap-4 items-center">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="isVerified"
                        defaultChecked={specialist.isVerified}
                        className="h-4 w-4"
                      />
                      Verified
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        defaultChecked={specialist.isFeatured}
                        className="h-4 w-4"
                      />
                      Featured
                    </label>

                    <input
                      type="datetime-local"
                      name="featuredUntil"
                      defaultValue={
                        specialist.featuredUntil
                          ? specialist.featuredUntil.toISOString().slice(0, 16)
                          : ""
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    />

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
                    >
                      Update
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
