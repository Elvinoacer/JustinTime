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

const DashboardPage = () => {
  const { data: session } = useSession();
  
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
    pageSize: 12,
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
  const { recommendations, isModelLoading } = useRecommendations(
    rawJobs,
    {
      interests: session?.user?.clientInterests || [],
      // For providers, we'd ideally use profile skills/bio, but falling back to empty for now
      // as we need to fetch profile data separately if not in session
      skills: [], 
      bio: "" 
    }
  );

  // Determine which jobs to display based on sort
  const jobs = sortBy === "recommended" ? recommendations : rawJobs;

  const handleSortChange = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 pb-12" style={{ fontFamily: '"Work Sans", "Noto Sans", sans-serif' }}>
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            Find Jobs
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Welcome back, <span className="font-semibold text-emerald-600">{session?.user?.name}</span>! 
            Discover your next opportunity.
            {userLocation?.city && (
              <span className="ml-2 inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                <span className="material-symbols-outlined text-base">location_on</span>
                {userLocation.city}
              </span>
            )}
          </p>
        </div>
        {/* Only show Post Job button for CLIENT role */}
        {session?.user?.role === "CLIENT" && (
          <Link
            href="/client/post-job"
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:transform active:scale-95 group"
          >
            <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform" aria-hidden="true">add</span>
            <span className="font-bold text-lg">Post a Job</span>
          </Link>
        )}
      </header>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <span className="material-symbols-outlined text-2xl">work</span>
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Jobs</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalJobs}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <span className="material-symbols-outlined text-2xl">search</span>
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Open Jobs</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {filters.status === "OPEN" ? totalJobs : "—"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <span className="material-symbols-outlined text-2xl">filter_list</span>
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Filters Active</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {Object.entries(filters).filter(([key, value]) => value && key !== "status").length}
            </p>
          </div>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            <JobFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              categories={categories}
            />
          </div>
        </aside>

        {/* Jobs Grid */}
        <main className="lg:col-span-3 space-y-8">
          {/* Sort and Results Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm text-gray-600">
              {jobsLoading ? (
                <span>Loading jobs...</span>
              ) : (
                <span>
                  Showing <span className="font-bold text-gray-900">{jobs.length}</span> of{" "}
                  <span className="font-bold text-gray-900">{totalJobs}</span> jobs
                </span>
              )}
            </div>
            <JobSort
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
          </div>

          {/* Jobs Grid */}
          {jobsLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl h-48 animate-pulse shadow-sm border border-gray-100"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-gray-300 text-6xl">
                  work_off
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Jobs Found</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {Object.entries(filters).some(([key, value]) => value && key !== "status")
                  ? "We couldn't find any jobs matching your current filters. Try adjusting them to see more results."
                  : "There are no jobs available at the moment. Please check back later!"}
              </p>
              {Object.entries(filters).some(([key, value]) => value && key !== "status") && (
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      category: "",
                      location: "",
                      budgetMin: "",
                      budgetMax: "",
                      status: "", // Reset to ALL
                    })
                  }
                  className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6">
                {jobs.map((job: any, index: number) => (
                  <JobCard key={job.id} job={job} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-10 py-4 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
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
    </div>
  );
};

export default DashboardPage;