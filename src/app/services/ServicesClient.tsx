"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Filters from "@/components/Filters";
import ServicesList from "@/components/ServicesList";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";
import CategoryDropdown from "@/components/CategoryDropdown";
import AllCategoriesModal from "@/components/AllCategoriesModal";
import SortBottomSheet from "@/components/shared/SortBottomSheet";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

import { useCategories, ServicesFilters } from "@/lib/api/hooks/useServices";
import { useSearchParams } from "next/navigation";

function ServicesPageContent() {
  const { status } = useSession();
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

  const handleFilterChange = (newFilters: Partial<ServicesFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gray-50">
      <Header />
      <PageHeader 
        title="Discover Professional Services" 
        description="Book trusted experts for your home or business needs, from plumbing to software development."
      />

      {/* Sticky Search & Location Bar */}
      <div className="sticky top-[64px] sm:top-[72px] z-50 bg-white border-b border-gray-200 shadow-sm py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
            <input
              type="text"
              placeholder="What service do you need?"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-gray-100/80 rounded-full pl-11 pr-10 py-2.5 text-sm sm:text-base text-gray-900 border-2 border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="w-full sm:w-auto">
            <LocationPicker onLocationChange={setUserLocation} />
          </div>
        </div>
      </div>

      {/* Category Pills - Sticky */}
      <section className="bg-white border-b border-gray-100 shadow-sm sticky top-[132px] sm:top-[144px] z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            <div className="lg:hidden w-full">
              <CategoryDropdown
                categories={allCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
            <div className="hidden lg:flex gap-2 overflow-x-auto flex-1 px-1 no-scrollbar">
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
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-full font-medium hover:border-emerald-300 transition-all text-sm w-full lg:w-auto"
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
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

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className={`${showMobileFilters ? "block" : "hidden"} lg:block lg:w-72 flex-shrink-0`}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-[210px]">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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
