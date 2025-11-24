"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const jobs = [
  {
    id: 1,
    title: "Plumbing Repair at Downtown",
    client: "John Doe",
    location: "Nairobi, CBD",
    date: "Oct 24, 2023",
    amount: "KES 2,500",
    status: "Active",
    statusColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 2,
    title: "Full House Cleaning",
    client: "Alice Wambui",
    location: "Westlands",
    date: "Oct 25, 2023",
    amount: "KES 5,000",
    status: "Pending",
    statusColor: "bg-amber-100 text-amber-700",
  },
  {
    id: 3,
    title: "Electrical Wiring Fix",
    client: "Peter Kamau",
    location: "Kilimani",
    date: "Oct 20, 2023",
    amount: "KES 3,500",
    status: "Completed",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 4,
    title: "Garden Maintenance",
    client: "Sarah Jones",
    location: "Karen",
    date: "Oct 18, 2023",
    amount: "KES 4,000",
    status: "Completed",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
];

const tabs = ["All", "Active", "Pending", "Completed"];

export default function JobApplicationsPage() {
  const [activeTab, setActiveTab] = useState("All");

  const filteredJobs =
    activeTab === "All"
      ? jobs
      : jobs.filter((job) => job.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 font-medium">
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Find New Jobs</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-gray-900 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <span className="material-symbols-outlined">work</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {job.client}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {job.date}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{job.amount}</p>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${job.statusColor}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
