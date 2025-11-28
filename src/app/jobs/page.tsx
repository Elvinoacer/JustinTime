"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useCategories } from "@/lib/api/hooks/useServices";

const JobsPage = () => {
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search
  const [selectedStatus, setSelectedStatus] = useState("OPEN");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500); // Wait500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch categories
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("status", selectedStatus);
    params.append("page", currentPage.toString());
    params.append("pageSize", "12");
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCategory) params.append("category", selectedCategory);
    if (verifiedOnly) params.append("verifiedOnly", "true");
    return params.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", selectedStatus, currentPage, searchQuery, selectedCategory, verifiedOnly],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs?${buildQueryParams()}`);
      return response.data;
    },
  });
  
  const jobs = data?.items || [];

  const tabs = [
    { id: "OPEN", label: "Open Jobs", icon: "work" },
    { id: "IN_PROGRESS", label: "In Progress", icon: "pending" },
    { id: "COMPLETED", label: "Completed", icon: "check_circle" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 py-20 md:py-28">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGgzNnYzNkgzNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Find Your Next{" "}
              <span className="text-emerald-200">Project</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
              Browse available jobs and submit proposals to grow your business
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          {/* Search and Category Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
              />
              {searchInput && searchInput !== searchQuery && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin">
                  progress_activity
                </span>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.id || cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs and Verified Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                    selectedStatus === tab.id
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => {
                    setSelectedStatus(tab.id);
                    setCurrentPage(1);
                  }}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Verified Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 whitespace-nowrap">
              <span className="material-symbols-outlined text-emerald-600">verified</span>
              <span className="text-sm font-medium text-gray-900">Verified Clients Only</span>
              <button
                onClick={() => {
                  setVerifiedOnly(!verifiedOnly);
                  setCurrentPage(1);
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  verifiedOnly ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    verifiedOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Grid */}
      <main className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse shadow-lg" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-5xl text-gray-400">work_off</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job: any, index: number) => (
              <motion.div
                key={job.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="p-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-base">category</span>
                        <span>{job.category?.name || "General"}</span>
                      </div>
                    </div>
                    {job.budget && (
                      <div className="bg-emerald-50 px-3 py-1 rounded-full">
                        <span className="text-emerald-700 font-bold">
                          Kes {job.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                    {job.description}
                  </p>

                  {/* Meta Info */}
                  <div className="space-y-2 mb-4">
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="material-symbols-outlined text-base">description</span>
                      <span>{job._count?.proposals || 0} proposals</span>
                    </div>
                  </div>

                  {/* Posted by */}
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                      {job.client?.image ? (
                        <img
                          src={job.client.image}
                          alt={job.client.name || "Client"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-semibold">
                          {job.client?.name?.[0] || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Posted by</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {job.client?.name || "Anonymous"}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link href={`/jobs/${job.id}`} className="w-full">
                    <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all">
                      View Details
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.hasMore && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg"
            >
              Load More
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
