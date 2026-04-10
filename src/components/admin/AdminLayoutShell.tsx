"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAdminMessagesRoute = pathname?.startsWith("/admin/messages");

  return (
    <div className="fixed inset-0 flex bg-slate-50 overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden shrink-0 flex items-center justify-between p-4 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-lg text-gray-900">Admin Panel</span>
        </div>
      </div>

      {/* Sidebar Wrapper */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          w-72
        `}
      >
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main
        className={`flex-1 w-full ${
          isAdminMessagesRoute
            ? "overflow-hidden p-0"
            : "overflow-y-auto p-4 lg:p-8"
        }`}
      >
        <div
          className={
            isAdminMessagesRoute ? "h-full min-h-0" : "max-w-7xl mx-auto"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
