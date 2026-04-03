import { Metadata } from "next";
import { ShieldCheck, Info } from "lucide-react";
import TrustedContactsManager from "@/components/safety/TrustedContactsManager";
import PanicButton from "@/components/safety/PanicButton";
import SOSOverlay from "@/components/safety/SOSOverlay";
import BlockedUsersManager from "@/components/safety/BlockedUsersManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Safety Center | JustInTime",
  description: "Manage your trusted contacts and safety settings.",
};

export default function SafetyPage() {
  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8">
      {/* Global Components for Demo purposes - Ideally SOSOverlay is in layout */}
      <SOSOverlay />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Safety Center
          </h1>
          <p className="text-gray-500 mt-2">
            Manage your emergency contacts and safety preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900">
              Emergency Test
            </p>
            <p className="text-xs text-gray-500">
              Test the button functionality
            </p>
          </div>
          <PanicButton className="px-6 py-3 text-lg shadow-red-200 shadow-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Trusted Contacts
              </h2>
              <p className="text-gray-500 text-sm">
                These people will be notified immediately when you trigger an
                SOS.
              </p>
            </div>
            <TrustedContactsManager />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Blocked Users
              </h2>
              <p className="text-gray-500 text-sm">
                Manage people you have blocked from messaging and communication.
              </p>
            </div>
            <BlockedUsersManager />
          </section>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5" /> Safety Tips
            </h3>
            <ul className="space-y-3 text-sm text-blue-800">
              <li className="flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                <span>Always keep 2+ trusted contacts updated correctly.</span>
              </li>
              <li className="flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                <span>
                  Use the Panic Button if you feel unsafe during a home service.
                </span>
              </li>
              <li className="flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                <span>
                  Live location sharing stops automatically when you mark
                  yourself safe.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">How SOS Works</h3>
            <div className="relative border-l-2 border-gray-200 ml-2 space-y-8 pl-6 py-2">
              <div className="relative">
                <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-red-500 border-2 border-white ring-1 ring-gray-200"></div>
                <h4 className="text-sm font-bold text-gray-900">1. Trigger</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Tap the Panic Button. Your location is instantly captured.
                </p>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-indigo-500 border-2 border-white ring-1 ring-gray-200"></div>
                <h4 className="text-sm font-bold text-gray-900">2. Notify</h4>
                <p className="text-xs text-gray-500 mt-1">
                  We dispatch SMS alerts to your trusted contacts using
                  configured emergency messaging providers.
                </p>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-green-500 border-2 border-white ring-1 ring-gray-200"></div>
                <h4 className="text-sm font-bold text-gray-900">3. Support</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Active SOS incidents are escalated to platform admins for
                  immediate follow-up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
