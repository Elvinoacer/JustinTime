import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getTaxSettings,
  updateTaxSettings,
  verifyAndSaveKraDetails,
} from "@/app/actions/tax";
import { Shield, Check, AlertTriangle, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

interface TaxSettingsSearchParams {
  status?: string;
  message?: string;
  action?: string;
}

export default async function TaxSettingsPage({
  searchParams,
}: {
  searchParams: Promise<TaxSettingsSearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const params = await searchParams;

  const result = await getTaxSettings();
  const settings = result.success ? result.settings : null;
  const isTccValid = settings?.tccExpiry
    ? new Date(settings.tccExpiry) > new Date()
    : false;
  const isCompliant = Boolean(
    settings?.kraPinVerified && settings?.tccNumber && isTccValid,
  );

  const statusMessage = params.message;
  const isSuccess = params.status === "success";

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏛️ Tax & Compliance Settings
        </h1>
        <p className="text-gray-600">
          Configure your KRA tax details for eTIMS-compliant invoicing
        </p>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            isSuccess
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Compliance Status */}
      <div
        className={`rounded-xl p-6 mb-8 ${
          isCompliant
            ? "bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200"
            : "bg-linear-to-r from-yellow-50 to-orange-50 border border-yellow-200"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isCompliant ? "bg-emerald-100" : "bg-yellow-100"
            }`}
          >
            {isCompliant ? (
              <Check className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {isCompliant ? "Tax Compliant ✓" : "Complete Your Tax Setup"}
            </h3>
            <p className="text-gray-600 mt-1">
              {isCompliant
                ? "Your KRA PIN and TCC are valid. Invoices will be generated with compliant tax details."
                : "Add and verify your KRA PIN plus a valid TCC to complete compliance."}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const saveResult = await updateTaxSettings({
            kraPin: formData.get("kraPin") as string,
            tccNumber: formData.get("tccNumber") as string,
            vatRegistered: formData.get("vatRegistered") === "on",
            businessName: formData.get("businessName") as string,
          });

          const message = saveResult.success
            ? "Tax settings saved successfully"
            : saveResult.error || "Failed to save tax settings";

          redirect(
            `/dashboard/settings/tax?status=${saveResult.success ? "success" : "error"}&action=save&message=${encodeURIComponent(message)}`,
          );
        }}
      >
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* KRA PIN Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                KRA Details
              </h2>
            </div>

            <div className="space-y-4">
              {/* KRA PIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KRA PIN
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    name="kraPin"
                    defaultValue={settings?.kraPin || ""}
                    placeholder="A000000000B"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase"
                    maxLength={11}
                  />
                  {settings?.kraPinVerified ? (
                    <span className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
                      <Check className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    <button
                      type="submit"
                      formAction={async (formData: FormData) => {
                        "use server";
                        const pin = formData.get("kraPin") as string;
                        const tccNumber = formData.get("tccNumber") as string;
                        const verifyResult = await verifyAndSaveKraDetails(
                          pin,
                          tccNumber,
                        );

                        const message = verifyResult.success
                          ? "KRA PIN verified successfully"
                          : verifyResult.error || "PIN verification failed";

                        redirect(
                          `/dashboard/settings/tax?status=${verifyResult.success ? "success" : "error"}&action=verify&message=${encodeURIComponent(message)}`,
                        );
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Verify
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Format: Letter + 9 digits + Letter (e.g., A123456789B)
                </p>
              </div>

              {/* TCC Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Compliance Certificate (TCC) Number
                </label>
                <input
                  type="text"
                  name="tccNumber"
                  defaultValue={settings?.tccNumber || ""}
                  placeholder="TCC-2025-00000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business/Trading Name
                </label>
                <input
                  type="text"
                  name="businessName"
                  defaultValue={settings?.businessName || ""}
                  placeholder="Your business name for invoices"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* VAT Section */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                VAT Registration
              </h2>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="vatRegistered"
                defaultChecked={settings?.vatRegistered}
                className="h-5 w-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="font-medium text-gray-900">
                  I am VAT Registered
                </span>
                <p className="text-sm text-gray-500">
                  Enable if your annual turnover exceeds KES 5 million
                </p>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="p-6 bg-gray-50">
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              Save Tax Settings
            </button>
          </div>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          Why is this important?
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>
            • <strong>Clients</strong> can claim your services as tax-deductible
            expenses
          </li>
          <li>
            • <strong>You</strong> maintain KRA compliance automatically
          </li>
          <li>
            • <strong>Corporate clients</strong> prefer verified tax-compliant
            providers
          </li>
          <li>
            • <strong>Higher trust</strong> and ability to charge premium rates
          </li>
        </ul>
      </div>
    </div>
  );
}
