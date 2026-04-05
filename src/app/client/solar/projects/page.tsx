import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMySolarProjects } from "@/app/actions/solar";
import { ArrowRight, Sun } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientSolarProjectsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const projectsResult = await getMySolarProjects();

  const projects = projectsResult.success
    ? projectsResult.projects.filter(
        (project) => project.clientId === session.user.id,
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <section className="rounded-2xl bg-white border border-gray-200 p-6">
          <div className="flex flex-wrap justify-between gap-4 items-start">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-3">
                <Sun className="h-4 w-4" />
                Client Solar Quotes
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Solar Projects
              </h1>
              <p className="text-gray-600">
                Track your quote requests, specialist assignment, and milestone
                progress.
              </p>
            </div>

            <Link
              href="/solar/estimate"
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
            >
              New Quote Request
            </Link>
          </div>
        </section>

        {!projectsResult.success ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {projectsResult.error || "Failed to load projects"}
          </section>
        ) : projects.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No quote requests yet
            </h2>
            <p className="text-gray-600 mb-4">
              Start from the estimate wizard and submit your first site
              assessment request.
            </p>
            <Link
              href="/solar/estimate"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700"
            >
              Start Estimate
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {project.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {project.siteAddress}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {project.status}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        {project.provider?.name ||
                          "Awaiting specialist assignment"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/client/solar/projects/${project.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
