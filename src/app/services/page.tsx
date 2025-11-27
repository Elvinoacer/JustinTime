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
      const formattedCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
      setSelectedCategory(formattedCategory);
    }
  }, [categoryParam]);

  // Update filters when search, category or location changes
  useEffect(() => {
    setFilters(prev => ({
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
  
  const allCategories = categoriesData || [
    { name: "All Services", icon: "apps", count: 0 },
  ];

  // Get top 8 categories by count (excluding "All Services")
  const topCategories = allCategories
    .filter(cat => cat.name !== "All Services")
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8);

  // Add "All Services" at the beginning
  const featuredCategories = [
    { name: "All Services", icon: "apps", count: 0 },
    ...topCategories,
  ];

  const handleFilterChange = (newFilters: Partial<ServicesFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle window resize for responsive filters
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
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
      <section className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 py-16 md:py-24 z-50">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGgzNnYzNkgzNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
              Find the Perfect{" "}
              <span className="text-emerald-200">Professional</span>
            </h1>
            <p className="text-lg sm:text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
              Connect with verified local service providers for all your needs
            </p>



            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 mt-12 max-w-2xl mx-auto">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white">500+</div>
                <div className="text-sm text-emerald-100 mt-1">Verified Pros</div>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white">10k+</div>
                <div className="text-sm text-emerald-100 mt-1">Jobs Completed</div>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white">4.8★</div>
                <div className="text-sm text-emerald-100 mt-1">Average Rating</div>
              </motion.div>
            </div>

            {/* Location Picker */}
            <div className="mt-8 flex justify-center">
              <LocationPicker onLocationChange={setUserLocation} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Category Section */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Category Dropdown (Mobile/Tablet) */}
            <div className="lg:hidden w-full">
              <CategoryDropdown
                categories={allCategories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>

            {/* Featured Categories Pills (Desktop) */}
            <div className="hidden lg:flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 transparent' }}>
              {isCategoriesLoading ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
                ))
              ) : (
                featuredCategories.map((category, index) => (
                  <motion.button
                    key={category.name}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all flex-shrink-0 ${
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
                    <span className="material-symbols-outlined text-lg">
                      {category.icon || "apps"}
                    </span>
                    <span>{category.name}</span>
                    {category.count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        selectedCategory === category.name
                          ? "bg-white/20"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {category.count}
                      </span>
                    )}
                  </motion.button>
                ))
              )}
            </div>

            {/* View All Categories Button */}
            <motion.button
              onClick={() => setIsAllCategoriesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 text-emerald-700 rounded-full font-medium hover:border-emerald-300 hover:shadow-md transition-all whitespace-nowrap"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="material-symbols-outlined">apps</span>
              <span className="hidden sm:inline">All Categories</span>
              <span className="sm:hidden">All</span>
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
      <main className="container mx-auto flex flex-1 flex-col px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar - Centered and Polished */}
        <motion.div
          className="w-full mb-8 flex justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-full max-w-3xl">
            <div className="relative">
              <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-300 px-6 py-4 shadow-lg hover:shadow-xl focus-within:shadow-xl focus-within:border-emerald-500 transition-all duration-200">
                <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
                <input
                  type="text"
                  placeholder="Search for services by name, category, or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 outline-none text-gray-900 placeholder-gray-400 text-base"
                />
                {searchInput && searchInput !== searchQuery && (
                  <span className="material-symbols-outlined text-emerald-500 animate-spin">
                    progress_activity
                  </span>
                )}
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-gray-400">close</span>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-gray-600 text-center">
                  Searching for: <span className="font-semibold text-emerald-600">{searchQuery}</span>
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Content Grid - Filters and Services */}
        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Mobile Filter Button */}
          <div className="md:hidden mb-6">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white border-2 border-gray-300 px-6 py-4 text-base font-semibold text-gray-700 shadow-md hover:shadow-lg hover:border-emerald-500 transition-all"
            >
              <span className="material-symbols-outlined">tune</span>
              {isFiltersOpen ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Filters Sidebar - Classic Card Style */}
          {(isDesktop || isFiltersOpen) && (
            <aside className="md:w-80 flex-shrink-0 mb-8 md:mb-0">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">filter_list</span>
                    Filters
                  </h2>
                </div>
                <div className="p-6">
                  <Filters filters={filters} onFilterChange={handleFilterChange} />
                </div>
              </div>
            </aside>
          )}

          {/* Services List - Classic Card Grid */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">store</span>
                  Available Services
                </h2>
              </div>
              <div className="p-6">
                <ServicesList 
                  filters={filters} 
                  onPageChange={handlePageChange}
                  onSortChange={(sort) => handleFilterChange({ sort })}
                />
              </div>
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
    <Suspense fallback={<div>Loading...</div>}>
      <ServicesPageContent />
    </Suspense>
  );
}