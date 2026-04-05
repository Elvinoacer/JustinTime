import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createSolarTemplate,
  deleteSolarTemplate,
  getSolarTemplates,
} from "@/app/actions/solar";

export const dynamic = "force-dynamic";

const DEFAULT_PHASES = JSON.stringify(
  [
    {
      name: "Site Assessment",
      description: "On-site technical inspection and load study",
      durationDays: 1,
      checklistItems: [
        "Roof integrity",
        "Shading analysis",
        "Main panel audit",
      ],
    },
    {
      name: "Installation",
      description: "Panel, inverter, and wiring installation",
      durationDays: 2,
      checklistItems: ["Panel mounting", "DC cabling", "Inverter setup"],
    },
    {
      name: "Commissioning",
      description: "Testing, handover, and warranty orientation",
      durationDays: 1,
      checklistItems: [
        "Performance testing",
        "Client walkthrough",
        "Warranty docs",
      ],
    },
  ],
  null,
  2,
);

export default async function SolarTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const query = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!hasRole(session.user, "ADMIN")) {
    redirect("/dashboard/solar");
  }

  const templatesResult = await getSolarTemplates({ includeInactive: true });

  async function createTemplateAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const phasesRaw = String(formData.get("phases") || "[]").trim();
    const requiredEquipmentRaw = String(
      formData.get("requiredEquipment") || "",
    ).trim();
    const requiredCertsRaw = String(
      formData.get("requiredCertifications") || "",
    ).trim();
    const materialsRaw = String(formData.get("materialsTemplate") || "").trim();

    let phases: any[] = [];
    let materialsTemplate: any[] | undefined;

    try {
      const parsedPhases = JSON.parse(phasesRaw);
      if (!Array.isArray(parsedPhases)) {
        throw new Error("Phases must be an array");
      }
      phases = parsedPhases;
    } catch {
      redirect(
        "/dashboard/solar/templates?status=error&message=Invalid%20JSON%20for%20phases",
      );
    }

    if (materialsRaw) {
      try {
        const parsedMaterials = JSON.parse(materialsRaw);
        if (!Array.isArray(parsedMaterials)) {
          throw new Error("Materials must be an array");
        }
        materialsTemplate = parsedMaterials;
      } catch {
        redirect(
          "/dashboard/solar/templates?status=error&message=Invalid%20JSON%20for%20materials",
        );
      }
    }

    const result = await createSolarTemplate({
      name,
      description: description || undefined,
      basePriceMin: Number(formData.get("basePriceMin") || 0),
      basePriceMax: Number(formData.get("basePriceMax") || 0),
      estimatedDays: Number(formData.get("estimatedDays") || 1),
      teamSizeMin: Number(formData.get("teamSizeMin") || 1),
      teamSizeMax: Number(formData.get("teamSizeMax") || 1),
      phases,
      requiredEquipment: requiredEquipmentRaw
        ? requiredEquipmentRaw
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [],
      requiredCertifications: requiredCertsRaw
        ? requiredCertsRaw
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [],
      materialsTemplate,
      isActive: formData.get("isActive") === "on",
    });

    if (!result.success) {
      const message = encodeURIComponent(
        result.error || "Failed to create template",
      );
      redirect(`/dashboard/solar/templates?status=error&message=${message}`);
    }

    redirect("/dashboard/solar/templates?status=saved");
  }

  async function deleteTemplateAction(formData: FormData) {
    "use server";

    const templateId = String(formData.get("templateId") || "").trim();
    const result = await deleteSolarTemplate(templateId);

    if (!result.success) {
      const message = encodeURIComponent(
        result.error || "Failed to delete template",
      );
      redirect(`/dashboard/solar/templates?status=error&message=${message}`);
    }

    redirect("/dashboard/solar/templates?status=deleted");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Solar Project Templates
            </h1>
            <p className="text-gray-600">
              Create reusable milestone and material blueprints for
              quote-to-project conversion.
            </p>
          </div>
          <Link
            href="/dashboard/solar"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Back to Solar Dashboard
          </Link>
        </div>

        {query.status === "saved" ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">
            Template created successfully.
          </div>
        ) : null}

        {query.status === "deleted" ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">
            Template deleted.
          </div>
        ) : null}

        {query.status === "error" ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {query.message || "Template operation failed."}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Create Template
        </h2>
        <form action={createTemplateAction} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </span>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </span>
              <input
                name="description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Base Price Min
              </span>
              <input
                name="basePriceMin"
                type="number"
                min={1}
                defaultValue={350000}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Base Price Max
              </span>
              <input
                name="basePriceMax"
                type="number"
                min={1}
                defaultValue={650000}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Days
              </span>
              <input
                name="estimatedDays"
                type="number"
                min={1}
                defaultValue={4}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  Team Min
                </span>
                <input
                  name="teamSizeMin"
                  type="number"
                  min={1}
                  defaultValue={2}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  Team Max
                </span>
                <input
                  name="teamSizeMax"
                  type="number"
                  min={1}
                  defaultValue={4}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Phases (JSON array)
            </span>
            <textarea
              name="phases"
              rows={10}
              defaultValue={DEFAULT_PHASES}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Required Equipment (comma separated)
              </span>
              <input
                name="requiredEquipment"
                defaultValue="Safety Harness, Multimeter, Torque Wrench"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Required Certifications (comma separated)
              </span>
              <input
                name="requiredCertifications"
                defaultValue="EPRA Licensed Electrician"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Materials Template (optional JSON array)
            </span>
            <textarea
              name="materialsTemplate"
              rows={5}
              defaultValue=""
              placeholder='[{"name":"550W Panel","quantity":12,"unitPrice":19000}]'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="isActive" defaultChecked />
            Template is active
          </label>

          <div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Existing Templates
        </h2>

        {!templatesResult.success ? (
          <p className="text-red-600">{templatesResult.error}</p>
        ) : templatesResult.templates.length === 0 ? (
          <p className="text-gray-600">No templates created yet.</p>
        ) : (
          <div className="space-y-3">
            {templatesResult.templates.map((template) => (
              <article
                key={template.id}
                className="rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {template.description || "No description"} •{" "}
                    {template.estimatedDays} days • Team {template.teamSizeMin}-
                    {template.teamSizeMax}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    KES {template.basePriceMin.toString()} -{" "}
                    {template.basePriceMax.toString()} •{" "}
                    {template.isActive ? "Active" : "Inactive"}
                  </p>
                </div>

                <form action={deleteTemplateAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-sm"
                  >
                    Delete
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
