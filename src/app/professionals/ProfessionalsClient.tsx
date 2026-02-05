"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProfessionalCard from "@/components/ProfessionalCard";
import LocationPicker from "@/components/LocationPicker";
import { useProfessionals } from "@/lib/api/hooks/useProfessionals";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ProfessionalsPage() {
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [search, setSearch] = useState(""); // Debounced search term
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auto-switch to distance sort when location is set
  useEffect(() => {
    if (userLocation && sortBy === "rating") {
      setSortBy("distance");
    }
  }, [userLocation]);

  const { data, isLoading, error } = useProfessionals({
    search,
    minPrice,
    maxPrice,
    sortBy,
    verifiedOnly,
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
  });

  const professionals = data?.data || [];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white py-12 sm:py-16 md:py-20 px-3 xs:px-4 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
                Find Top{" "}
                <span className="text-emerald-200">Professionals</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-emerald-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Connect with verified experts ready to help you succeed
              </p>
              
              {/* Location Picker - Prominent */}
              <div className="flex justify-center">
                <LocationPicker onLocationChange={setUserLocation} />
              </div>

              {userLocation && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-sm text-emerald-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">location_on</span>
                  Showing professionals near {userLocation.address || 'your location'}
                </motion.p>
              )}
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">
                filter_list
              </span>
              {showMobileFilters ? "Hide Filters" : "Show Filters"}
              <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">
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
              <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 sticky top-24">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">tune</span>
                      Filters
                    </h2>
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
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Name, skills..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                      />
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                        search
                      </span>
                      {searchInput && searchInput !== search && (
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin text-lg">
                          progress_activity
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Range - Two Columns */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                          KES
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
                          className="w-full pl-12 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">
                          KES
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
                          className="w-full pl-12 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { value: "rating", label: "Highest Rated", icon: "star" },
                        { value: "distance", label: "Nearest First", icon: "near_me", disabled: !userLocation },
                        { value: "price_asc", label: "Price: Low to High", icon: "trending_up" },
                        { value: "price_desc", label: "Price: High to Low", icon: "trending_down" },
                        { value: "newest", label: "Newest First", icon: "schedule" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSortBy(option.value)}
                          disabled={option.disabled}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            sortBy === option.value
                              ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200"
                              : option.disabled
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-sm ${
                            sortBy === option.value ? "text-emerald-600" : ""
                          }`}>
                            {option.icon}
                          </span>
                          <span className="text-sm font-medium">
                            {option.label}
                          </span>
                          {option.disabled && (
                            <span className="ml-auto text-xs text-gray-400">Set location</span>
                          )}
                          {sortBy === option.value && (
                            <span className="material-symbols-outlined text-emerald-600 text-sm ml-auto">
                              check_circle
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verified Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-emerald-600 text-xl">
                        verified
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          Verified Only
                        </p>
                        <p className="text-gray-600 text-xs">
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
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
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
                    className="w-full mt-4 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
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
              <div className="hidden lg:flex items-center justify-between mb-6 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
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
                  {userLocation && (
                    <span className="text-emerald-600">
                      {" "}
                      near you
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
                    <option value="distance" disabled={!userLocation}>
                      {userLocation ? "Nearest First" : "Nearest First (set location)"}
                    </option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 md:py-20">
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 text-base">
                    Loading professionals...
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-red-500 text-5xl mb-4">
                    error
                  </span>
                  <p className="text-red-700 font-medium text-base">
                    Failed to load professionals
                  </p>
                  <p className="text-red-600 text-sm mt-2">
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
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-gray-400 text-4xl">
                      search_off
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold text-lg">
                    No professionals found
                  </p>
                  <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
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
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
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
                          <option value="distance" disabled={!userLocation}>Nearest</option>
                          <option value="price_asc">Price ↑</option>
                          <option value="price_desc">Price ↓</option>
                          <option value="newest">Newest</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {professionals.map((professional, index) => (
                      <ProfessionalCard
                        key={professional.id}
                        professional={professional}
                        index={index}
                      />
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
