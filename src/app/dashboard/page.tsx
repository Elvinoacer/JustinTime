"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useDashboardJobs } from "@/lib/hooks/useDashboardJobs";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import JobCard from "@/components/dashboard/JobCard";
import JobFilters from "@/components/dashboard/JobFilters";
import JobSort from "@/components/dashboard/JobSort";
import Link from "next/link";
import { toast } from "sonner";
import NotificationPermissionOverlay from "@/components/NotificationPermissionOverlay";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";
import { OnboardingFeeModal } from "@/components/revenue/OnboardingFeeModal";

const DashboardPage = () => {
  const { data: session } = useSession();
  const [isMobile, setIsMobile] = useState(false);

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    city?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Filter and sort state
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    location: "",
    budgetMin: "",
    budgetMax: "",
    status: "", // Default to ALL
  });

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get user's location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      if ("geolocation" in navigator) {
        setLocationLoading(true);
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
              });
            }
          );

          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });

          // Reverse geocode to get city name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.county ||
              "";

            setUserLocation({ latitude, longitude, city });

            // Auto-fill location filter with city
            if (city) {
              setFilters((prev) => ({ ...prev, location: city }));
              toast.success(`Location detected: ${city}`);
            }

            // Set default sort to distance when location is available
            setSortBy("distance");
            setSortOrder("asc");
          } catch (error) {
            console.error("Reverse geocoding error:", error);
          }
        } catch (error: any) {
          if (error.code === 1) {
            toast.info(
              "Location access denied. You can manually enter your location in filters."
            );
          } else {
            console.error("Geolocation error:", error);
          }
        } finally {
          setLocationLoading(false);
        }
      }
    };

    getUserLocation();
  }, []);

  // Fetch jobs with filters
  const { data: jobsData, isLoading: jobsLoading } = useDashboardJobs({
    ...filters,
    sortBy,
    sortOrder,
    page: currentPage,
    pageSize: isMobile ? 6 : 12,
    userLat: userLocation?.latitude || null,
    userLon: userLocation?.longitude || null,
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  });

  const rawJobs = jobsData?.items || [];
  const totalJobs = jobsData?.total || 0;
  const hasMore = jobsData?.hasMore || false;
  const categories = categoriesData?.data || [];

  // Get recommendations
  const { recommendations, isModelLoading } = useRecommendations(rawJobs, {
    interests: session?.user?.clientInterests || [],
    skills: [],
    bio: "",
  });

  // Check onboarding fee status for Providers
  const isProvider = session?.user?.role === "PROVIDER";
  const { data: profileData } = useProviderProfile(isProvider);
  const showOnboardingModal = 
    isProvider && 
    profileData?.data && 
    !profileData.data.hasPaidOnboardingFee;

  // Determine which jobs to display based on sort
  const jobs = sortBy === "recommended" ? recommendations : rawJobs;

  const handleSortChange = (
    newSortBy: string,
    newSortOrder: "asc" | "desc"
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
    if (isMobile) setShowFilters(false);
  };

  return (
    <div
      className="space-y-4 lg:space-y-8 pb-8 lg:pb-12 px-4 sm:px-6 lg:px-0"
      style={{ fontFamily: '"Work Sans", "Noto Sans", sans-serif' }}
    >
      {/* Mobile Filter Toggle */}
      {isMobile && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-700 transition-colors"
          aria-label={showFilters ? "Hide filters" : "Show filters"}
        >
          <span className="material-symbols-outlined text-2xl">
            {showFilters ? "close" : "filter_list"}
          </span>
        </button>
      )}

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-6 pb-4 lg:pb-6 border-b border-gray-100">
        <div className="space-y-2 lg:space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-gray-900 tracking-tight">
            Find Jobs
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl">
            Welcome back,{" "}
            <span className="font-semibold text-emerald-600">
              {session?.user?.name}
            </span>
            ! Discover your next opportunity.
            {userLocation?.city && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs sm:text-sm font-medium">
                <span className="material-symbols-outlined text-xs sm:text-sm">
                  location_on
                </span>
                {userLocation.city}
              </span>
            )}
          </p>
        </div>
        {/* Only show Post Job button for CLIENT role */}
        {session?.user?.role === "CLIENT" && (
          <Link
            href="/client/post-job"
            className="flex items-center justify-center gap-2 bg-gray-900 text-white px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:transform active:scale-95 group w-full sm:w-auto"
          >
            <span
              className="material-symbols-outlined text-lg sm:text-xl group-hover:rotate-90 transition-transform"
              aria-hidden="true"
            >
              add
            </span>
            <span className="font-bold text-sm sm:text-base lg:text-lg">
              Post a Job
            </span>
          </Link>
        )}
      </header>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 lg:w-32 lg:h-32 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 lg:gap-4 mb-2 lg:mb-3">
              <div className="p-2 lg:p-3 bg-emerald-100 text-emerald-600 rounded-lg lg:rounded-xl">
                <span className="material-symbols-outlined text-xl lg:text-2xl">
                  work
                </span>
              </div>
              <p className="text-xs lg:text-sm text-gray-500 font-medium uppercase tracking-wider">
                Total Jobs
              </p>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {totalJobs}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 lg:w-32 lg:h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 lg:gap-4 mb-2 lg:mb-3">
              <div className="p-2 lg:p-3 bg-blue-100 text-blue-600 rounded-lg lg:rounded-xl">
                <span className="material-symbols-outlined text-xl lg:text-2xl">
                  search
                </span>
              </div>
              <p className="text-xs lg:text-sm text-gray-500 font-medium uppercase tracking-wider">
                Open Jobs
              </p>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {filters.status === "OPEN" ? totalJobs : "—"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group sm:col-span-2 lg:col-span-1"
        >
          <div className="absolute top-0 right-0 w-16 h-16 lg:w-32 lg:h-32 bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 lg:gap-4 mb-2 lg:mb-3">
              <div className="p-2 lg:p-3 bg-purple-100 text-purple-600 rounded-lg lg:rounded-xl">
                <span className="material-symbols-outlined text-xl lg:text-2xl">
                  filter_list
                </span>
              </div>
              <p className="text-xs lg:text-sm text-gray-500 font-medium uppercase tracking-wider">
                Filters Active
              </p>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {
                Object.entries(filters).filter(
                  ([key, value]) => value && key !== "status"
                ).length
              }
            </p>
          </div>
        </motion.div>
      </section>

      {/* Mobile Filter Overlay */}
      {isMobile && showFilters && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="absolute top-0 left-0 w-4/5 max-w-sm h-full bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-4">
              <JobFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                categories={categories}
                isMobile={true}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Filters Sidebar - Desktop */}
        {!isMobile && (
          <aside className="lg:col-span-1">
            <div className="sticky top-6">
              <JobFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                categories={categories}
              />
            </div>
          </aside>
        )}

        {/* Jobs Grid */}
        <main
          className={`${
            isMobile ? "col-span-1" : "lg:col-span-3"
          } space-y-6 lg:space-y-8`}
        >
          {/* Sort and Results Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-xs sm:text-sm text-gray-600">
              {jobsLoading ? (
                <span>Loading jobs...</span>
              ) : (
                <span>
                  Showing{" "}
                  <span className="font-bold text-gray-900">{jobs.length}</span>{" "}
                  of{" "}
                  <span className="font-bold text-gray-900">{totalJobs}</span>{" "}
                  jobs
                </span>
              )}
            </div>
            <JobSort
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              isMobile={isMobile}
            />
          </div>

          {/* Jobs Grid */}
          {jobsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              {[...Array(isMobile ? 3 : 6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl lg:rounded-2xl h-40 sm:h-48 animate-pulse shadow-sm border border-gray-100"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-100 p-8 lg:p-16 text-center shadow-sm">
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <span className="material-symbols-outlined text-gray-300 text-4xl lg:text-6xl">
                  work_off
                </span>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-3">
                No Jobs Found
              </h3>
              <p className="text-sm lg:text-base text-gray-500 mb-6 lg:mb-8 max-w-md mx-auto">
                {Object.entries(filters).some(
                  ([key, value]) => value && key !== "status"
                )
                  ? "We couldn't find any jobs matching your current filters. Try adjusting them to see more results."
                  : "There are no jobs available at the moment. Please check back later!"}
              </p>
              {Object.entries(filters).some(
                ([key, value]) => value && key !== "status"
              ) && (
                <button
                  onClick={() => {
                    setFilters({
                      search: "",
                      category: "",
                      location: "",
                      budgetMin: "",
                      budgetMax: "",
                      status: "", // Reset to ALL
                    });
                    if (isMobile) setShowFilters(false);
                  }}
                  className="px-6 lg:px-8 py-2.5 lg:py-3 bg-emerald-600 text-white rounded-lg lg:rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-200 text-sm lg:text-base"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                {jobs.map((job: any, index: number) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={index}
                    isMobile={isMobile}
                  />
                ))}
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="flex justify-center pt-4 lg:pt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-8 lg:px-10 py-3 lg:py-4 bg-white border border-gray-200 text-gray-900 rounded-lg lg:rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm hover:shadow-md text-sm lg:text-base"
                  >
                    Load More Jobs
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <NotificationPermissionOverlay />
      
      {/* Onboarding Fee Modal (Blocking for Providers) */}
      <OnboardingFeeModal 
        isOpen={!!showOnboardingModal} 
        userName={session?.user?.name?.split(" ")[0] || "Provider"} 
      />
    </div>
  );
};

export default DashboardPage;
