"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useCategories } from "@/lib/api/hooks/useServices";
import {
  Search,
  Filter,
  X,
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  User,
  CheckCircle,
  DollarSign,
  Loader2,
  ChevronDown,
  Building,
} from "lucide-react";

const JobsPage = () => {
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search
  const [selectedStatus, setSelectedStatus] = useState("OPEN");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500); // Wait 500ms after user stops typing

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
    queryKey: [
      "jobs",
      selectedStatus,
      currentPage,
      searchQuery,
      selectedCategory,
      verifiedOnly,
    ],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs?${buildQueryParams()}`);
      return response.data;
    },
  });

  const jobs = data?.items || [];

  const tabs = [
    { id: "OPEN", label: "Open Jobs", icon: Briefcase },
    { id: "IN_PROGRESS", label: "In Progress", icon: Loader2 },
    { id: "COMPLETED", label: "Completed", icon: CheckCircle },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 pt-16 pb-12 sm:pt-20 sm:pb-16 md:py-28">
        <div className="absolute inset-0 bg-black/10"></div>

        <div className="container mx-auto px-3 sm:px-4 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              Find Your Next <span className="text-emerald-200">Project</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-emerald-50/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              Browse available jobs and submit proposals to grow your business
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mobile Filter Bar */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
              {searchInput && searchInput !== searchQuery && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4 animate-spin" />
              )}
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center justify-center gap-1 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {showMobileFilters ? (
                <X className="w-4 h-4 text-gray-600" />
              ) : (
                <Filter className="w-4 h-4 text-gray-600" />
              )}
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filters Overlay */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-x-0 top-32 z-40 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-top">
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Status Tabs */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Job Status
              </h3>
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                        selectedStatus === tab.id
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => {
                        setSelectedStatus(tab.id);
                        setCurrentPage(1);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Category
              </h3>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.id || cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            {/* Verified Toggle */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-gray-900">
                  Verified Clients Only
                </span>
              </div>
              <button
                onClick={() => {
                  setVerifiedOnly(!verifiedOnly);
                  setCurrentPage(1);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  verifiedOnly ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    verifiedOnly ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Filters Bar */}
      <section className="hidden lg:block bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          {/* Search and Category Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
              />
              {searchInput && searchInput !== searchQuery && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 animate-spin" />
              )}
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 bg-white appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.id || cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          {/* Status Tabs and Verified Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
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
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Verified Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 whitespace-nowrap">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-900">
                Verified Clients Only
              </span>
              <button
                onClick={() => {
                  setVerifiedOnly(!verifiedOnly);
                  setCurrentPage(1);
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  verifiedOnly ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    verifiedOnly ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Active Filters Display - Mobile */}
      <div className="lg:hidden px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">
              {selectedCategory
                ? `${
                    categories.find((c) => c.id === selectedCategory)?.name ||
                    selectedCategory
                  } • ${selectedStatus}`
                : selectedStatus}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {jobs.length} jobs
            </span>
          </div>
          {(selectedCategory || verifiedOnly) && (
            <button
              onClick={() => {
                setSelectedCategory("");
                setVerifiedOnly(false);
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs Grid */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl sm:rounded-2xl h-80 animate-pulse shadow-lg"
              />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              No Jobs Found
            </h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {jobs.map((job: any, index: number) => (
              <motion.div
                key={job.id}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1 pr-2">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                        <Building className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{job.category?.name || "General"}</span>
                      </div>
                    </div>
                    {job.budget && (
                      <div className="bg-emerald-50 px-2 sm:px-3 py-1 rounded-full flex-shrink-0">
                        <span className="text-emerald-700 font-bold text-sm sm:text-base flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {job.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3 flex-1">
                    {job.description}
                  </p>

                  {/* Meta Info */}
                  <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                    {job.location && (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                    )}
                    {job.deadline && (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>
                          Deadline:{" "}
                          {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{job._count?.proposals || 0} proposals</span>
                    </div>
                  </div>

                  {/* Posted by */}
                  <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-100 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                      {job.client?.image ? (
                        <img
                          src={job.client.image}
                          alt={job.client.name || "Client"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-semibold text-sm">
                          {job.client?.name?.[0] || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Posted by</p>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {job.client?.name || "Anonymous"}
                      </p>
                    </div>
                    {job.client?.isVerified && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Action Button */}
                  <Link href={`/jobs/${job.id}`} className="w-full">
                    <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all text-sm sm:text-base flex items-center justify-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      View Details
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination / Load More */}
        {data && data.hasMore && (
          <div className="flex justify-center mt-8 sm:mt-12">
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg text-sm sm:text-base flex items-center gap-2"
            >
              Load More Jobs
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Job Stats - Desktop */}
        <div className="hidden lg:block mt-12">
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-200 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Job Market Insights
            </h3>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Total Open Jobs", value: "150+" },
                { label: "Avg. Budget", value: "Kes 5,000" },
                { label: "Avg. Proposals", value: "8" },
                { label: "Response Rate", value: "94%" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Tips - Mobile */}
        <div className="lg:hidden mt-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Pro Tips
            </h4>
            <ul className="text-blue-700 text-xs space-y-1.5">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                <span>Write personalized proposals for better chances</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                <span>Check client ratings before applying</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                <span>Apply early for new job postings</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
