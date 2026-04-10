import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import {
  getMyEquipmentRegistry,
  getMySolarProjects,
  getMySolarSpecialistProfile,
} from "@/app/actions/solar";
import { Battery, ClipboardList, ShieldCheck, Sun, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SolarDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!hasRole(session.user, "PROVIDER") && !hasRole(session.user, "ADMIN")) {
    redirect("/dashboard");
  }

  const [specialistResult, projectsResult, equipmentResult] = await Promise.all(
    [
      getMySolarSpecialistProfile(),
      getMySolarProjects(),
      getMyEquipmentRegistry(),
    ],
  );

  const specialist = specialistResult.success
    ? specialistResult.specialist
    : null;
  const certifications = specialistResult.success
    ? specialistResult.certifications
    : [];

  const projects = projectsResult.success ? projectsResult.projects : [];
  const equipment = equipmentResult.success ? equipmentResult.equipment : [];

  const activeProjects = projects.filter(
    (project) => !["COMPLETED", "CANCELLED"].includes(project.status),
  );

  return (
    <div className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-3">
              <Sun className="h-4 w-4" />
              Solar Vertical Workspace
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Solar Operations
            </h1>
            <p className="text-gray-600">
              Manage specialist profile, certifications, quotes, and
              milestone-based project delivery.
            </p>
          </div>
          <Link
            href="/solar/installers"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
          >
            View Public Directory
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500 mb-1">Profile Status</p>
          <p className="text-lg font-semibold text-gray-900">
            {specialist
              ? specialist.isVerified
                ? "Verified"
                : "Pending Review"
              : "Not Applied"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500 mb-1">Certifications</p>
          <p className="text-lg font-semibold text-gray-900">
            {certifications.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500 mb-1">Active Projects</p>
          <p className="text-lg font-semibold text-gray-900">
            {activeProjects.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500 mb-1">Equipment Items</p>
          <p className="text-lg font-semibold text-gray-900">
            {equipment.length}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/verticals/solar/apply"
          className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            Specialist Profile & Application
          </h2>
          <p className="text-sm text-gray-600">
            Update experience, service radius, portfolio, and onboarding
            details.
          </p>
        </Link>

        <Link
          href="/dashboard/solar/certifications"
          className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            Certification Queue
          </h2>
          <p className="text-sm text-gray-600">
            Submit licenses and track review status. Admins can verify and
            approve.
          </p>
        </Link>

        <Link
          href="/dashboard/solar/projects"
          className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <Battery className="h-5 w-5 text-amber-600" />
            Solar Projects
          </h2>
          <p className="text-sm text-gray-600">
            Manage quote lifecycle, status transitions, and project milestones.
          </p>
        </Link>

        <Link
          href="/dashboard/solar/config"
          className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            Estimation Config
          </h2>
          <p className="text-sm text-gray-600">
            Configure active pricing assumptions and county multipliers for
            estimate calculations.
          </p>
        </Link>

        <Link
          href="/dashboard/solar/templates"
          className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
        >
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            Template Management
          </h2>
          <p className="text-sm text-gray-600">
            Create and maintain reusable project phases, checklists, and
            material templates.
          </p>
        </Link>
      </div>

      {specialistResult.success && !specialist && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No specialist profile yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your solar specialist profile to start receiving quote
            assignments.
          </p>
          <Link
            href="/dashboard/verticals/solar/apply"
            className="inline-flex px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            Apply Now
          </Link>
        </div>
      )}
    </div>
  );
}
