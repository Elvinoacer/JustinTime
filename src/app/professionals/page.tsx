"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useProfessionals } from "@/lib/api/hooks/useProfessionals";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProfessionalsPage() {
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [search, setSearch] = useState(""); // Debounced search term
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

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
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Find Top Professionals
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-emerald-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Connect with verified experts ready to help you succeed
            </motion.p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Filters Section */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Name, skills, bio..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    search
                  </span>
                  {searchInput && searchInput !== search && (
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin">
                      progress_activity
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Try searching by skills (e.g., "React", "Plumbing")
                </p>
              </div>

              {/* Min Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Price (Kes/hr)</label>
                <input
                  type="number"
                  value={minPrice || ""}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (Kes/hr)</label>
                <input
                  type="number"
                  value={maxPrice || ""}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="10000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 bg-white"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Verified Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">verified</span>
                <div>
                  <p className="font-semibold text-gray-900">Show Verified Professionals Only</p>
                  <p className="text-sm text-gray-600">See only professionals with verified profiles</p>
                </div>
              </div>
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  verifiedOnly ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    verifiedOnly ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </motion.div>

          {/* Results Count */}
          {!isLoading && (
            <div className="mb-6">
              <p className="text-gray-600">
                Showing <span className="font-bold text-gray-900">{professionals.length}</span> professionals
                {verifiedOnly && <span className="text-emerald-600 font-semibold"> (verified only)</span>}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
              <p className="text-red-700 font-medium">Failed to load professionals</p>
              <p className="text-red-600 text-sm mt-2">Please try again later</p>
            </div>
          )}

          {/* Professionals Grid */}
          {!isLoading && !error && professionals.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-gray-400 text-6xl mb-4">search_off</span>
              <p className="text-gray-600 font-medium text-lg">No professionals found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {professionals.map((professional, index) => (
              <motion.div
                key={professional.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Avatar */}
                    <div className="relative">
                      {professional.image ? (
                        <img
                          src={professional.image}
                          alt={professional.name}
                          className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-md">
                          {professional.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>

                    {/* Name & Title */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">
                        {professional.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {professional.title}
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-lg"
                          style={{
                            color: i < Math.floor(professional.rating) ? "#F59E0B" : "#E5E7EB",
                          }}
                        >
                          {i < professional.rating
                            ? i === Math.floor(professional.rating) && professional.rating % 1 >= 0.5
                              ? "star_half"
                              : "star"
                            : "star"}
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-900 font-semibold">{professional.rating.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm">({professional.reviews} reviews)</span>
                  </div>

                  {/* Location */}
                  {professional.location && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {professional.location}
                    </div>
                  )}

                  {/* Skills */}
                  {professional.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {professional.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {professional.skills.length > 3 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          +{professional.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">work</span>
                      <span>{professional.completedJobs} jobs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      <span>Member since {new Date(professional.memberSince).getFullYear()}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600 text-sm">Starting at</span>
                    <span className="text-emerald-600 font-bold text-2xl">
                      Kes {professional.hourlyRate.toLocaleString()}
                      <span className="text-sm font-normal">/hr</span>
                    </span>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/professionals/${professional.id}`}
                    className="block w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold text-center hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-200"
                  >
                    View Profile
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
