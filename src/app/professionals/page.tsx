"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useProfessionals } from "@/lib/api/hooks/useProfessionals";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProfessionalsPage() {
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [search, setSearch] = useState(""); // Debounced search term
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useProfessionals({
    search,
    minPrice,
    maxPrice,
    sortBy,
    verifiedOnly,
  });

  const professionals = data?.data || [];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-10 sm:py-12 md:py-16 px-3 xs:px-4">
          <div className="max-w-7xl mx-auto">
            <motion.h1
              className="text-2xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Find Top Professionals
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg md:text-xl text-emerald-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Connect with verified experts ready to help you succeed
            </motion.p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                filter_list
              </span>
              {showMobileFilters ? "Hide Filters" : "Show Filters"}
              <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {professionals.length} found
              </span>
            </button>
          </div>

          <div className="lg:grid lg:grid-cols-4 lg:gap-6">
            {/* Filters Sidebar - Hidden on mobile by default */}
            <motion.div
              className={`${
                showMobileFilters ? "block" : "hidden"
              } lg:block lg:col-span-1 mb-6 lg:mb-0`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 sticky top-24">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="lg:hidden p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      <span className="material-symbols-outlined text-sm">
                        close
                      </span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="mb-4">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Name, skills..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                      />
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        search
                      </span>
                      {searchInput && searchInput !== search && (
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin text-sm">
                          progress_activity
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Try searching by skills
                    </p>
                  </div>

                  {/* Price Range - Two Columns */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                        Min Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                          Kes
                        </span>
                        <input
                          type="number"
                          value={minPrice || ""}
                          onChange={(e) =>
                            setMinPrice(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                          placeholder="0"
                          className="w-full pl-12 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                        Max Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                          Kes
                        </span>
                        <input
                          type="number"
                          value={maxPrice || ""}
                          onChange={(e) =>
                            setMaxPrice(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                          placeholder="10000"
                          className="w-full pl-12 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-6">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      Sort By
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { value: "rating", label: "Highest Rated" },
                        { value: "price_asc", label: "Price: Low to High" },
                        { value: "price_desc", label: "Price: High to Low" },
                        { value: "newest", label: "Newest First" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSortBy(option.value)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                            sortBy === option.value
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-xs sm:text-sm">
                            {option.label}
                          </span>
                          {sortBy === option.value && (
                            <span className="material-symbols-outlined text-emerald-600 text-sm">
                              check_circle
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verified Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-lg">
                        verified
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                          Verified Only
                        </p>
                        <p className="text-gray-600 text-xs truncate">
                          Show verified profiles
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        verifiedOnly ? "bg-emerald-600" : "bg-gray-300"
                      }`}
                      aria-label={
                        verifiedOnly
                          ? "Disable verified filter"
                          : "Enable verified filter"
                      }
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          verifiedOnly ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reset Filters Button */}
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                      setSortBy("rating");
                      setVerifiedOnly(false);
                    }}
                    className="w-full mt-4 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">
                      refresh
                    </span>
                    Reset All Filters
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {/* Results Count and Sort - Desktop */}
              <div className="hidden lg:flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm">
                  Showing{" "}
                  <span className="font-bold text-gray-900">
                    {professionals.length}
                  </span>{" "}
                  professionals
                  {verifiedOnly && (
                    <span className="text-emerald-600 font-semibold">
                      {" "}
                      (verified only)
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 bg-white"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-10 sm:py-16 md:py-20">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 text-sm sm:text-base">
                    Loading professionals...
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 sm:p-8 text-center">
                  <span className="material-symbols-outlined text-red-500 text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
                    error
                  </span>
                  <p className="text-red-700 font-medium text-sm sm:text-base">
                    Failed to load professionals
                  </p>
                  <p className="text-red-600 text-xs sm:text-sm mt-1 sm:mt-2">
                    Please try again later
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* No Results */}
              {!isLoading && !error && professionals.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 sm:p-8 md:p-12 text-center">
                  <span className="material-symbols-outlined text-gray-400 text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">
                    search_off
                  </span>
                  <p className="text-gray-600 font-medium text-base sm:text-lg">
                    No professionals found
                  </p>
                  <p className="text-gray-500 text-sm mt-1 sm:mt-2 max-w-md mx-auto">
                    Try adjusting your filters or search terms to find what
                    you're looking for
                  </p>
                </div>
              )}

              {/* Professionals Grid */}
              {!isLoading && !error && professionals.length > 0 && (
                <>
                  {/* Results Count - Mobile */}
                  <div className="lg:hidden mb-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-600 text-sm">
                        <span className="font-bold text-gray-900">
                          {professionals.length}
                        </span>{" "}
                        results
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs">Sort:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 bg-white"
                        >
                          <option value="rating">Top Rated</option>
                          <option value="price_asc">Price ↑</option>
                          <option value="price_desc">Price ↓</option>
                          <option value="newest">Newest</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {professionals.map((professional, index) => (
                      <motion.div
                        key={professional.id}
                        className="bg-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.03 }}
                        whileHover={{ y: -2 }}
                      >
                        {/* Card Header with Image */}
                        <div className="relative">
                          {professional.image ? (
                            <div className="h-32 sm:h-40 overflow-hidden">
                              <img
                                src={professional.image}
                                alt={professional.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div className="h-32 sm:h-40 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
                                {professional.name.charAt(0)}
                              </div>
                            </div>
                          )}

                          {/* Verified/PRO Badge */}
                          {(professional.verified || (["PRO", "BUSINESS"].includes(professional.subscription?.plan) && professional.subscription?.isActive === true)) && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-white rounded-full p-1 shadow-md">
                                <span
                                  className={`material-symbols-outlined text-sm ${
                                    ["PRO", "BUSINESS"].includes(
                                      professional.subscription?.plan
                                    ) && professional.subscription?.isActive === true
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  verified
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Price Badge */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-white">
                                <p className="text-xs opacity-90">
                                  Starting at
                                </p>
                                <p className="font-bold text-base sm:text-lg">
                                  Kes {professional.hourlyRate.toLocaleString()}
                                  <span className="text-xs font-normal">
                                    /hr
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          {/* Name & Title */}
                          <div className="mb-2">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate mb-0.5">
                              {professional.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 min-h-[2.5em]">
                              {professional.title}
                            </p>
                          </div>

                          {/* Rating */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className="material-symbols-outlined text-xs sm:text-sm"
                                  style={{
                                    color:
                                      i < Math.floor(professional.rating)
                                        ? "#F59E0B"
                                        : "#E5E7EB",
                                  }}
                                >
                                  {i < professional.rating
                                    ? i === Math.floor(professional.rating) &&
                                      professional.rating % 1 >= 0.5
                                      ? "star_half"
                                      : "star"
                                    : "star"}
                                </span>
                              ))}
                            </div>
                            <span className="text-gray-900 font-semibold text-xs sm:text-sm">
                              {professional.rating.toFixed(1)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              ({professional.reviews})
                            </span>
                          </div>

                          {/* Location */}
                          {professional.location && (
                            <div className="flex items-center gap-1 text-gray-600 text-xs sm:text-sm mb-3">
                              <span className="material-symbols-outlined text-xs">
                                location_on
                              </span>
                              <span className="truncate">
                                {professional.location}
                              </span>
                            </div>
                          )}

                          {/* Skills */}
                          {professional.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {professional.skills
                                .slice(0, 2)
                                .map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              {professional.skills.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  +{professional.skills.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">
                                work
                              </span>
                              <span>{professional.completedJobs} jobs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">
                                schedule
                              </span>
                              <span>
                                {new Date(
                                  professional.memberSince
                                ).getFullYear()}
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <Link
                            href={`/professionals/${professional.id}`}
                            className="block w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 sm:py-2.5 px-4 rounded-lg font-medium text-sm text-center hover:from-emerald-600 hover:to-green-700 transition-all duration-300 active:scale-[0.98] shadow-sm"
                          >
                            View Profile
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
