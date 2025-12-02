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

import { useCategories, ServicesFilters } from "@/lib/api/hooks/useServices";

import { useSearchParams } from "next/navigation";

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search
  const [selectedCategory, setSelectedCategory] = useState("All Services");
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Lifted filter state
  const [filters, setFilters] = useState<ServicesFilters>({
    page: 1,
    limit: 12,
    sort: "relevance",
    category: "All Services",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update selectedCategory when URL param changes
  useEffect(() => {
    if (categoryParam) {
      const formattedCategory =
        categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
      setSelectedCategory(formattedCategory);
    }
  }, [categoryParam]);

  // Update filters when search, category or location changes
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

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategories();

  const allCategories = categoriesData || [
    { name: "All Services", icon: "apps", count: 0 },
  ];

  // Get top 8 categories by count (excluding "All Services")
  const topCategories = allCategories
    .filter((cat) => cat.name !== "All Services")
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8);

  // Add "All Services" at the beginning
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

  // Handle window resize for responsive filters
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gray-50"
      style={{
        fontFamily: '"Work Sans", "Noto Sans", sans-serif',
      }}
    >
      <Header />

      {/* Hero Section with Search */}
      <section className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 py-10 sm:py-12 md:py-16 lg:py-20 xl:py-24 z-50">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGgzNnYzNkgzNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

        <div className="container mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-2">
              Find the Perfect{" "}
              <span className="text-emerald-200">Professional</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-emerald-50 mb-6 sm:mb-8 max-w-2xl mx-auto px-3">
              Connect with verified local service providers for all your needs
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mt-6 sm:mt-8 md:mt-12 max-w-2xl mx-auto">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  500+
                </div>
                <div className="text-xs sm:text-sm text-emerald-100 mt-1">
                  Verified Pros
                </div>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  10k+
                </div>
                <div className="text-xs sm:text-sm text-emerald-100 mt-1">
                  Jobs Completed
                </div>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  4.8★
                </div>
                <div className="text-xs sm:text-sm text-emerald-100 mt-1">
                  Avg Rating
                </div>
              </motion.div>
            </div>

            {/* Location Picker */}
            <div className="mt-4 sm:mt-6 md:mt-8 flex justify-center">
              <LocationPicker onLocationChange={setUserLocation} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Category Section */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-start lg:items-center">
            {/* Category Dropdown (Mobile/Tablet) */}
            <div className="lg:hidden w-full">
              <CategoryDropdown
                categories={allCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Featured Categories Pills (Desktop) */}
            <div
              className="hidden lg:flex gap-2 overflow-x-auto flex-1 px-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#10b981 transparent",
              }}
            >
              {isCategoriesLoading
                ? Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-28 sm:h-9 sm:w-32 bg-gray-100 rounded-full animate-pulse flex-shrink-0"
                    />
                  ))
                : featuredCategories.map((category, index) => (
                    <motion.button
                      key={category.name}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap font-medium transition-all flex-shrink-0 text-sm sm:text-base ${
                        selectedCategory === category.name
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setSelectedCategory(category.name)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="material-symbols-outlined text-sm sm:text-base">
                        {category.icon || "apps"}
                      </span>
                      <span className="truncate max-w-[80px] sm:max-w-none">
                        {category.name}
                      </span>
                      {category.count > 0 && (
                        <span
                          className={`text-xs px-1 sm:px-1.5 py-0.5 rounded-full ${
                            selectedCategory === category.name
                              ? "bg-white/20"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {category.count}
                        </span>
                      )}
                    </motion.button>
                  ))}
            </div>

            {/* View All Categories Button */}
            <motion.button
              onClick={() => setIsAllCategoriesOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-700 rounded-full font-medium hover:border-emerald-300 hover:shadow-md transition-all whitespace-nowrap text-sm sm:text-base w-full lg:w-auto justify-center lg:justify-start mt-2 lg:mt-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="material-symbols-outlined text-sm sm:text-base">
                apps
              </span>
              <span className="hidden sm:inline">All Categories</span>
              <span className="sm:hidden">All Categories</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-200 rounded-full">
                {allCategories.length}
              </span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* All Categories Modal */}
      <AllCategoriesModal
        categories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isOpen={isAllCategoriesOpen}
        onClose={() => setIsAllCategoriesOpen(false)}
      />

      {/* Main Content */}
      <main className="container mx-auto flex flex-1 flex-col px-3 xs:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Search Bar - Centered and Polished */}
        <motion.div
          className="w-full mb-4 sm:mb-6 md:mb-8 flex justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full max-w-2xl lg:max-w-3xl">
            <div className="relative">
              <div className="flex items-center gap-2 sm:gap-4 bg-white rounded-xl sm:rounded-2xl border border-gray-300 px-4 sm:px-6 py-3 sm:py-4 shadow-lg hover:shadow-xl focus-within:shadow-xl focus-within:border-emerald-500 transition-all duration-200">
                <span className="material-symbols-outlined text-gray-400 text-lg sm:text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400 text-sm sm:text-base min-w-0"
                />
                {searchInput && searchInput !== searchQuery && (
                  <span className="material-symbols-outlined text-emerald-500 animate-spin text-sm sm:text-base">
                    progress_activity
                  </span>
                )}
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                    }}
                    className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-sm sm:text-base">
                      close
                    </span>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 text-center">
                  Searching for:{" "}
                  <span className="font-semibold text-emerald-600">
                    {searchQuery}
                  </span>
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mobile Filter Toggle and Sort */}
        <div className="lg:hidden mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-md hover:shadow-lg hover:border-emerald-500 transition-all"
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              {showMobileFilters ? "Hide Filters" : "Show Filters"}
              <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                Filter
              </span>
            </button>
            <button
              onClick={() => {
                /* Implement sort modal */
              }}
              className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-white border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 shadow-md hover:shadow-lg hover:border-emerald-500 transition-all"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              Sort
            </button>
          </div>
        </div>

        {/* Content Grid - Filters and Services */}
        <div className="flex flex-col lg:flex-row lg:gap-4 xl:gap-6">
          {/* Filters Sidebar */}
          {(showMobileFilters || !isMobile) && (
            <aside className="lg:w-72 xl:w-80 flex-shrink-0 mb-4 sm:mb-6 lg:mb-0">
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-lg overflow-hidden sticky top-20 sm:top-24">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                        filter_list
                      </span>
                      Filters
                    </h2>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="lg:hidden p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                    >
                      <span className="material-symbols-outlined text-sm">
                        close
                      </span>
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <Filters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClose={() => setShowMobileFilters(false)}
                  />
                </div>
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <button
                    onClick={() =>
                      setFilters({
                        page: 1,
                        limit: 12,
                        sort: "relevance",
                        category: "All Services",
                      })
                    }
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Services List */}
          <div className="flex-1">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                      store
                    </span>
                    Available Services
                  </h2>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">Sort by:</span>
                    <select
                      value={filters.sort}
                      onChange={(e) =>
                        handleFilterChange({ sort: e.target.value as any })
                      }
                      className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="rating">Highest Rated</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="distance">Nearest First</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <ServicesList
                  filters={filters}
                  onPageChange={handlePageChange}
                  onSortChange={(sort) => handleFilterChange({ sort })}
                />
              </div>
            </div>

            {/* Mobile CTA */}
            <div className="lg:hidden mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base">Need Help Finding?</p>
                  <p className="text-emerald-100 text-xs mt-1">
                    Our team can assist you
                  </p>
                </div>
                <button className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 transition-colors text-sm">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips Section */}
        <div className="mt-8 sm:mt-12">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
            Quick Tips
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm sm:text-base">
                    verified
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                  Verified Professionals
                </h4>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                All providers are background-checked and verified for your
                safety.
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 sm:p-6 border border-emerald-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm sm:text-base">
                    payments
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                  Secure Payments
                </h4>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                Payment is held securely until your service is completed
                satisfactorily.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm sm:text-base">
                    support_agent
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                  24/7 Support
                </h4>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm">
                Our team is available round the clock to assist you with any
                issues.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}
