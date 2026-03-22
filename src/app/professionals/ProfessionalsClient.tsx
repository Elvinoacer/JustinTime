"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProfessionalCard from "@/components/ProfessionalCard";
import LocationPicker from "@/components/LocationPicker";
import SortBottomSheet from "@/components/shared/SortBottomSheet";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useProfessionalsInfinite } from "@/lib/api/hooks/useProfessionals";
import { useEffect, useState } from "react";
import { Search, Filter, CheckCircle, Loader2 } from "lucide-react";

export default function ProfessionalsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [sortBy, setSortBy] = useState("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (userLocation && sortBy === "rating") {
      setSortBy("distance");
    }
  }, [userLocation, sortBy]);

  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useProfessionalsInfinite({
    search,
    minPrice,
    maxPrice,
    sortBy,
    verifiedOnly,
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
  });

  const professionals = data?.pages.flatMap((page: any) => page.data) || [];

  return (
    <>
      <Header />
      <PageHeader 
        title="Find Top Professionals" 
        description="Connect with verified experts ready to help you succeed."
      />

        {/* Sticky Search & Location Bar */}
        <section className="bg-white border-b border-gray-200 sticky top-[64px] sm:top-[72px] z-40 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col lg:flex-row gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, skills, title..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-gray-100 border-2 border-transparent rounded-full focus:bg-white focus:border-emerald-500 focus:outline-none transition-all text-gray-900 text-sm sm:text-base"
                />
                {searchInput && searchInput !== search && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 animate-spin" />
                )}
              </div>
              
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <LocationPicker onLocationChange={(loc) => {
                  setUserLocation(loc);
                  if (loc) setSortBy("distance");
                }} />
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex flex-col max-w-7xl">
          
          {/* Mobile controls */}
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <Filter className="w-4 h-4 text-gray-600" />
              Filters
            </button>
            <button
              onClick={() => setIsSortOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              Sort
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1">
            {/* Sidebar Filters */}
            <aside className={`${showMobileFilters ? "block" : "hidden"} lg:block lg:w-72 flex-shrink-0`}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-[150px] overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">tune</span>
                    Refine Search
                  </h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="lg:hidden p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Price Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Hourly Rate</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">KES</span>
                        <input
                          type="number"
                          value={minPrice || ""}
                          onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Min"
                          className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white text-gray-900"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">KES</span>
                        <input
                          type="number"
                          value={maxPrice || ""}
                          onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Max"
                          className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Sort */}
                  <div className="hidden lg:block">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Sort By</label>
                    <div className="space-y-2">
                      {[
                        { value: "rating", label: "Highest Rated", icon: "star" },
                        { value: "distance", label: "Nearest First", icon: "near_me", disabled: !userLocation },
                        { value: "price_asc", label: "Price: Low to High", icon: "trending_up" },
                        { value: "price_desc", label: "Price: High to Low", icon: "trending_down" },
                        { value: "newest", label: "Newest First", icon: "schedule" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSortBy(opt.value)}
                          disabled={opt.disabled}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors text-sm ${
                            sortBy === opt.value
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                              : opt.disabled
                              ? "text-gray-400 cursor-not-allowed border border-transparent bg-white"
                              : "text-gray-600 hover:bg-gray-50 border border-transparent bg-white"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-sm ${sortBy === opt.value ? 'text-emerald-600' : ''}`}>
                            {opt.icon}
                          </span>
                          <span>{opt.label}</span>
                          {opt.disabled && <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider">Set Location</span>}
                          {sortBy === opt.value && <span className="material-symbols-outlined text-emerald-600 text-sm ml-auto">check_circle</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verified Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Trust & Safety</label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-gray-900">Verified Profiles</span>
                      </div>
                      <button
                        onClick={() => setVerifiedOnly(!verifiedOnly)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 outline-none ${verifiedOnly ? 'bg-emerald-600' : 'bg-gray-300'}`}
                        aria-label="Toggle Verified Only"
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${verifiedOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                      setSortBy("rating");
                      setVerifiedOnly(false);
                    }}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1 flex flex-col">
              {/* Desktop Results Header */}
              <div className="hidden lg:flex items-center justify-between mb-6 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-gray-600 text-sm">
                  Showing <strong className="text-gray-900">{Array.isArray(professionals) ? professionals.length : 0}</strong> professionals
                </p>
              </div>

              {isLoading && professionals.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl h-[330px] border border-gray-100 shadow-sm p-6 animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm flex-1 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
                  <p className="text-gray-900 font-bold mb-2">Failed to load</p>
                  <p className="text-gray-500 text-sm">We couldn't retrieve the professionals at this time.</p>
                </div>
              ) : professionals.length === 0 ? (
                <EmptyState 
                  title="No professionals found" 
                  description="Try adjusting your filters or search terms to find the right expert."
                  buttonText="Reset Defaults"
                  onAction={() => {
                    setSearchInput("");
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                    setSortBy("rating");
                    setVerifiedOnly(false);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {professionals.map((pro: any, index: number) => (
                    <ProfessionalCard key={pro.id} professional={pro} index={index} />
                  ))}
                </div>
              )}

              {/* Infinite Sentinel */}
              <InfiniteScrollSentinel
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              >
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium py-8 mt-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading more professionals...
                </div>
              </InfiniteScrollSentinel>
              
              {!hasNextPage && professionals.length > 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  You've seen all the professionals matching your criteria.
                </div>
              )}

              {/* Guest CTA */}
              <GuestCTAStrip 
                title="Want to join our network?" 
                description="Sign up as a professional to showcase your skills, find high-quality jobs, and manage your business all in one place."
                buttonText="Join as a Pro"
              />
            </div>
          </div>
        </div>
      
      <Footer />

      <SortBottomSheet
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        currentSort={sortBy}
        onSortChange={setSortBy}
      />
    </>
  );
}
