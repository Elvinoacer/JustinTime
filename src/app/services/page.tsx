"use client";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Filters from "@/components/Filters";
import ServicesList from "@/components/ServicesList";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LocationPicker from "@/components/LocationPicker";

import { useCategories, ServicesFilters } from "@/lib/api/hooks/useServices";

import { useSearchParams } from "next/navigation";

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Services");
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

  // Update selectedCategory when URL param changes
  useEffect(() => {
    if (categoryParam) {
      // Capitalize first letter to match category names (e.g. "plumbing" -> "Plumbing")
      // This is a simple heuristic; ideally we'd match against actual category data
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
      page: 1, // Reset page on filter change
    }));
  }, [searchQuery, selectedCategory, userLocation]);

  const { data: categoriesData, isLoading: isCategoriesLoading } = useCategories();
  
  const categories = categoriesData || [
    { name: "All Services", icon: "apps", count: 0 },
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

    // Set initial value
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

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-2xl p-2 shadow-2xl">
                <div className="flex-1 flex items-center gap-3 px-4">
                  <span className="material-symbols-outlined text-gray-400">search</span>
                  <input
                    type="text"
                    placeholder="What service do you need?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 py-3 outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
                <motion.button
                  className="bg-gradient-to-r from-emerald-500 to-green-600  px-8 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Search
                </motion.button>
              </div>
            </div>

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

      {/* Category Pills */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto py-4 no-scrollbar">
            {isCategoriesLoading ? (
               // Skeleton loading for categories
               Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="h-10 w-32 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
               ))
            ) : (
              categories.map((category, index) => (
                <motion.button
                  key={category.name}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
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
                  <span className="material-symbols-outlined text-lg">{category.icon}</span>
                  <span>{category.name}</span>
                  <span className="text-xs opacity-75">({category.count})</span>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto flex flex-1 flex-col px-4 sm:px-6 lg:px-8 py-8 md:flex-row md:gap-8">
        {/* Mobile Filter Button */}
        <div className="md:hidden mb-4">
          <motion.button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 hover:border-emerald-500 transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="material-symbols-outlined">filter_list</span>
            <span>{isFiltersOpen ? "Hide" : "Show"} Filters</span>
            <motion.span
              className="material-symbols-outlined ml-auto"
              animate={{ rotate: isFiltersOpen ? 180 : 0 }}
            >
              expand_more
            </motion.span>
          </motion.button>
        </div>

        {/* Filters Sidebar */}
        <motion.div
          className={`${isFiltersOpen ? "block" : "hidden"} md:block`}
          initial={false}
          animate={{ opacity: isFiltersOpen || isDesktop ? 1 : 0 }}
        >
          <Filters filters={filters} onFilterChange={handleFilterChange} />
        </motion.div>

        {/* Services List */}
        <ServicesList 
          filters={filters} 
          onPageChange={handlePageChange}
          onSortChange={(sort: any) => setFilters(prev => ({ ...prev, sort, page: 1 }))}
        />
      </main>

      <Footer />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
      <ServicesPageContent />
    </Suspense>
  );
}