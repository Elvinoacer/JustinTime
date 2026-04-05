import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMySolarProjects } from "@/app/actions/solar";
import { ArrowRight, ClipboardList, Sun } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SolarProjectsListPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!hasRole(session.user, "PROVIDER") && !hasRole(session.user, "ADMIN")) {
    redirect("/dashboard");
  }

  const projectsResult = await getMySolarProjects();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-3">
              <Sun className="h-4 w-4" />
              Solar Project Lifecycle
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Solar Projects
            </h1>
            <p className="text-gray-600">
              Track quote requests, assignments, status transitions, and
              milestones.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/solar/estimate"
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
            >
              New Quote Request
            </Link>
            <Link
              href="/dashboard/solar"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              Back to Solar Dashboard
            </Link>
          </div>
        </div>
      </section>

      {!projectsResult.success ? (
        <section className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-700">
          {projectsResult.error || "Failed to load solar projects."}
        </section>
      ) : projectsResult.projects.length === 0 ? (
        <section className="rounded-2xl bg-white border border-dashed border-gray-300 p-8 text-center">
          <ClipboardList className="h-10 w-10 text-amber-600 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No solar projects yet
          </h2>
          <p className="text-gray-600 mb-4">
            Quote requests submitted from the solar estimate flow will appear
            here.
          </p>
          <Link
            href="/solar/estimate"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
          >
            Create First Quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {projectsResult.projects.map((project) => (
              <article
                key={project.id}
                className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {project.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {project.siteAddress} •{" "}
                    {project.propertyType || "Property type pending"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {project.status}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      {project.systemSize
                        ? `${project.systemSize}kW`
                        : "Sizing pending"}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {project.provider ? "Assigned" : "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-600 md:text-right">
                  <p>
                    Client:{" "}
                    <span className="font-medium">
                      {project.client.name || "Client"}
                    </span>
                  </p>
                  <p>
                    Specialist:{" "}
                    <span className="font-medium">
                      {project.provider?.name || "Not assigned"}
                    </span>
                  </p>
                  <p>
                    Milestones:{" "}
                    <span className="font-medium">
                      {project.milestones.length}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/solar/projects/${project.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
