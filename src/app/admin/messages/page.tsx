"use client";

import { Suspense } from "react";

import { MessagesWorkspaceContent } from "@/app/dashboard/messages/page";

export const dynamic = "force-dynamic";

function AdminMessagesContent() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="hidden md:flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
            Admin Workspace
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Messages Center
          </h1>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <MessagesWorkspaceContent variant="admin" />
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={null}>
      <AdminMessagesContent />
    </Suspense>
  );
}
