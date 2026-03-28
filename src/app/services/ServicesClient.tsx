"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Filters from "@/components/Filters";
import ServicesList from "@/components/ServicesList";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";
import CategoryDropdown from "@/components/CategoryDropdown";
import AllCategoriesModal from "@/components/AllCategoriesModal";
import SortBottomSheet from "@/components/shared/SortBottomSheet";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";

import { useCategories, ServicesFilters } from "@/lib/api/hooks/useServices";
import { useSearchParams } from "next/navigation";

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Services");
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [filters, setFilters] = useState<ServicesFilters>({
    page: 1,
    limit: 12,
    sort: "relevance",
    category: "All Services",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (categoryParam) {
      const formattedCategory =
        categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
      setSelectedCategory(formattedCategory);
    }
  }, [categoryParam]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery,
      category: selectedCategory,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      sort: userLocation ? "distance" : prev.sort,
      page: 1,
    }));
  }, [searchQuery, selectedCategory, userLocation]);

  const { data: categoriesData, isLoading: isCategoriesLoading } = useCategories();
  const allCategories = categoriesData || [{ name: "All Services", icon: "apps", count: 0 }];

  const topCategories = allCategories
    .filter((cat) => cat.name !== "All Services")
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8);

  const featuredCategories = [
    { name: "All Services", icon: "apps", count: 0 },
    ...topCategories,
  ];

  const activeFilterCount = [
    filters.minPrice ? 1 : 0,
    filters.maxPrice ? 1 : 0,
    filters.verified ? 1 : 0,
    filters.minRating ? 1 : 0,
    filters.category && filters.category !== "All Services" ? 1 : 0,
    filters.search ? 1 : 0,
    userLocation ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const handleFilterChange = (newFilters: Partial<ServicesFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gray-50">
      <Header />

      <section className="relative overflow-hidden border-b border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#f8fffc_0%,#ffffff_72%)]">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute left-[-6rem] top-[-5rem] h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute right-[-4rem] top-10 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-12 lg:pt-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 shadow-sm">
                <span className="material-symbols-outlined text-sm">travel_explore</span>
                Service Marketplace
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                Discover trusted experts without digging through noisy listings
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                Search by need, narrow by price and trust, and compare professionals in
                a cleaner flow built for fast decision-making.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[430px]">
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Categories
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-950">
                  {Math.max(allCategories.length - 1, 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Top Focus
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-gray-950">
                  {topCategories[0]?.name || "Popular picks"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm col-span-2 sm:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Filters Live
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-950">
                  {activeFilterCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Search & Location Bar */}
      <div className="sticky top-[64px] z-50 border-b border-gray-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:top-[72px] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
            <input
              type="text"
              placeholder="What service do you need?"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-2xl border-2 border-transparent bg-gray-100/80 py-3 pl-11 pr-10 text-sm text-gray-900 outline-none transition-all focus:border-emerald-500 focus:bg-white sm:text-base"
            />
          </div>
          <div className="w-full lg:w-auto">
            <LocationPicker onLocationChange={setUserLocation} />
          </div>
          <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
            <span className="material-symbols-outlined text-base text-emerald-600">filter_alt</span>
            <span>{activeFilterCount} active refinements</span>
          </div>
        </div>
      </div>

      {/* Category Pills - Sticky */}
      <section className="sticky top-[138px] z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur sm:top-[144px]">
        <div className="container mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
            <div className="lg:hidden w-full">
              <CategoryDropdown
                categories={allCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
            <div className="hidden flex-1 gap-2 overflow-x-auto px-1 no-scrollbar lg:flex">
              {isCategoriesLoading
                ? Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-9 w-32 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
                  ))
                : featuredCategories.map((category) => (
                    <motion.button
                      key={category.name}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all text-sm ${
                        selectedCategory === category.name
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setSelectedCategory(category.name)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="material-symbols-outlined text-base">{category.icon || "apps"}</span>
                      <span>{category.name}</span>
                    </motion.button>
                  ))}
            </div>
            <motion.button
              onClick={() => setIsAllCategoriesOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:border-emerald-300 lg:w-auto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="material-symbols-outlined text-base">apps</span>
              <span>All Categories</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Filters
            </button>
            <button
              onClick={() => setIsSortOpen(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              Sort
            </button>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row">
            <aside className={`${showMobileFilters ? "block" : "hidden"} lg:block lg:w-72 flex-shrink-0`}>
              <div className="sticky top-[210px] overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-4">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <span className="material-symbols-outlined text-emerald-600">tune</span>
                    Refine
                  </h2>
                  <button onClick={() => setShowMobileFilters(false)} className="lg:hidden p-1">
                    <span className="material-symbols-outlined text-gray-400">close</span>
                  </button>
                </div>
                <div className="p-6">
                  <Filters filters={filters} onFilterChange={handleFilterChange} onClose={() => setShowMobileFilters(false)} />
                </div>
              </div>
            </aside>

            <div className="flex-1 flex flex-col min-h-[500px]">
              <ServicesList
                filters={filters}
                onPageChange={handlePageChange}
                onSortChange={(sort) => handleFilterChange({ sort: sort as ServicesFilters["sort"] })}
              />
              
              <GuestCTAStrip 
                title="Ready to book a service?" 
                description="Sign up to book trusted professionals, track your orders in real-time, and pay securely via M-Pesa."
                buttonText="Join JustInTime"
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <SortBottomSheet
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        currentSort={filters.sort || "relevance"}
        onSortChange={(sort) => handleFilterChange({ sort: sort as ServicesFilters["sort"] })}
      />

      <AllCategoriesModal
        categories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={isAllCategoriesOpen}
        onClose={() => setIsAllCategoriesOpen(false)}
      />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" /></div>}>
      <ServicesPageContent />
    </Suspense>
  );
}
