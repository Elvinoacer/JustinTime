"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useDashboardJobs } from "@/lib/hooks/useDashboardJobs";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useProviderServices } from "@/lib/api/hooks/useProvider";
import JobCard from "@/components/dashboard/JobCard";
import JobFilters from "@/components/dashboard/JobFilters";
import JobSort from "@/components/dashboard/JobSort";
import Link from "next/link";
import { toast } from "sonner";
import NotificationPermissionOverlay from "@/components/NotificationPermissionOverlay";
import { useSearchParams, useRouter } from "next/navigation";
import { hasRole } from "@/lib/auth/roles";
import {
  detectCurrentLocation,
  getLocationFailureToastMessage,
  getLocationFallbackToastMessage,
} from "@/lib/utils/geolocation";

type DashboardFilters = {
  search: string;
  category: string;
  location: string;
  budgetMin: string;
  budgetMax: string;
  status: string;
};

type DashboardJob = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status?: string;
  budget?: number;
  location?: string;
  deadline?: string;
  distance?: number | null;
  score?: number;
  category?: {
    name: string;
    slug: string;
  };
  client?: {
    id: string;
    name: string;
    image?: string;
    verified?: boolean;
  };
  _count?: {
    proposals: number;
  };
  maxProposals?: number;
  [key: string]: unknown;
};

const DashboardPage = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    city?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Filter and sort state
  const [filters, setFilters] = useState<DashboardFilters>({
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

  // Handle payment callback from Intasend
  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    const paymentType = searchParams.get("payment_type");

    if (paymentStatus === "success" && paymentType === "onboarding") {
      toast.success(
        "🎉 Payment successful! Verification privileges are now active.",
        {
          duration: 5000,
        },
      );
      // Clean up URL params
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  // Get user's location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      setLocationLoading(true);
      try {
        const detected = await detectCurrentLocation();
        const locationLabel =
          detected.address?.split(",").slice(0, 2).join(", ").trim() ||
          `${detected.latitude.toFixed(5)}, ${detected.longitude.toFixed(5)}`;

        setUserLocation({
          latitude: detected.latitude,
          longitude: detected.longitude,
          city: locationLabel,
        });

        setFilters((prev) =>
          prev.location === locationLabel
            ? prev
            : { ...prev, location: locationLabel },
        );

        // Set default sort to distance when location is available
        setSortBy("distance");
        setSortOrder("asc");

        if (detected.source === "IP") {
          toast.info(
            getLocationFallbackToastMessage(detected) ||
              "Using approximate location from your network. You can refine it in filters.",
          );
        } else {
          toast.success(`Location detected: ${locationLabel}`);
        }
      } catch (error: unknown) {
        console.error("Location detection error:", error);
        toast.error(getLocationFailureToastMessage(error));
      } finally {
        setLocationLoading(false);
      }
    };

    void getUserLocation();
  }, []);

  // Fetch jobs with filters
  const { data: jobsData, isLoading: jobsLoading } = useDashboardJobs({
    ...filters,
    sortBy,
    sortOrder,
    page: currentPage,
    pageSize: isMobile ? 6 : 12,
    userLat: userLocation?.latitude ?? null,
    userLon: userLocation?.longitude ?? null,
  });

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  });

  const rawJobs = useMemo<DashboardJob[]>(() => {
    const items = Array.isArray(jobsData?.items) ? jobsData.items : [];

    return items
      .map((item: any) => {
        const createdAtValue = item.createdAt;
        const createdAt =
          typeof createdAtValue === "string"
            ? createdAtValue
            : new Date(
                (createdAtValue as string | number | Date | undefined) ??
                  Date.now(),
              ).toISOString();

        const categoryValue = item.category;
        const clientValue = item.client;

        return {
          ...(item as DashboardJob),
          id: String(item.id ?? ""),
          title:
            typeof item.title === "string" && item.title.trim().length > 0
              ? item.title
              : "Untitled job",
          description:
            typeof item.description === "string" ? item.description : "",
          createdAt,
          budget:
            item.budget == null || Number.isNaN(Number(item.budget))
              ? undefined
              : Number(item.budget),
          deadline:
            typeof item.deadline === "string" ? item.deadline : undefined,
          location:
            typeof item.location === "string" ? item.location : undefined,
          distance:
            typeof item.distance === "number"
              ? item.distance
              : typeof item.distanceKm === "number"
                ? item.distanceKm
                : null,
          category:
            categoryValue && typeof categoryValue === "object"
              ? {
                  name:
                    typeof categoryValue.name === "string"
                      ? categoryValue.name
                      : "General",
                  slug:
                    typeof categoryValue.slug === "string"
                      ? categoryValue.slug
                      : "general",
                }
              : undefined,
          client:
            clientValue && typeof clientValue === "object"
              ? {
                  id: typeof clientValue.id === "string" ? clientValue.id : "",
                  name:
                    typeof clientValue.name === "string"
                      ? clientValue.name
                      : "Client",
                  image:
                    typeof clientValue.image === "string"
                      ? clientValue.image
                      : undefined,
                  verified: Boolean(clientValue.verified),
                }
              : undefined,
          _count: {
            proposals: Number(
              (item._count as { proposals?: unknown } | undefined)?.proposals ??
                0,
            ),
          },
        };
      })
      .filter((job) => job.id.length > 0);
  }, [jobsData?.items]);
  const totalJobs = jobsData?.pagination?.total ?? 0;
  const hasMore = jobsData?.pagination?.hasMore ?? false;
  const categories = categoriesData?.data || [];

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => value && key !== "status",
      ).length,
    [filters],
  );

  const openJobsCount = useMemo(
    () => rawJobs.filter((job) => job.status === "OPEN").length,
    [rawJobs],
  );

  // Get recommendations
  const { recommendations } = useRecommendations(rawJobs, {
    interests: session?.user?.clientInterests || [],
    skills: [],
    bio: "",
  });

  const recommendedJobs = useMemo<DashboardJob[]>(
    () =>
      recommendations.map((job: any) => ({
        ...(job as DashboardJob),
        id: String(job?.id ?? ""),
        title:
          typeof job?.title === "string" && job.title.trim().length > 0
            ? job.title
            : "Untitled job",
        description:
          typeof job?.description === "string" ? job.description : "",
        createdAt:
          typeof job?.createdAt === "string"
            ? job.createdAt
            : new Date().toISOString(),
        budget:
          job?.budget == null || Number.isNaN(Number(job.budget))
            ? undefined
            : Number(job.budget),
        deadline: typeof job?.deadline === "string" ? job.deadline : undefined,
        location: typeof job?.location === "string" ? job.location : undefined,
        distance:
          typeof job?.distance === "number"
            ? job.distance
            : typeof job?.distanceKm === "number"
              ? job.distanceKm
              : null,
        category:
          job?.category && typeof job.category === "object"
            ? {
                name:
                  typeof job.category.name === "string"
                    ? job.category.name
                    : "General",
                slug:
                  typeof job.category.slug === "string"
                    ? job.category.slug
                    : "general",
              }
            : undefined,
        client:
          job?.client && typeof job.client === "object"
            ? {
                id: typeof job.client.id === "string" ? job.client.id : "",
                name:
                  typeof job.client.name === "string"
                    ? job.client.name
                    : "Client",
                image:
                  typeof job.client.image === "string"
                    ? job.client.image
                    : undefined,
                verified: Boolean(job.client.verified),
              }
            : undefined,
        _count: {
          proposals: Number(job?._count?.proposals ?? 0),
        },
      })),
    [recommendations],
  );

  // Determine which jobs to display based on sort
  const jobs: DashboardJob[] =
    sortBy === "recommended" ? recommendedJobs : rawJobs;
  const { data: providerServicesData } = useProviderServices();
  const providerServices = Array.isArray(providerServicesData?.data)
    ? providerServicesData.data
    : Array.isArray(providerServicesData?.services)
      ? providerServicesData.services
      : [];
  const shouldShowServiceSetupPrompt =
    hasRole(session?.user, "PROVIDER") && providerServices.length === 0;

  const handleSortChange = (
    newSortBy: string,
    newSortOrder: "asc" | "desc",
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    if (isMobile) setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      location: "",
      budgetMin: "",
      budgetMax: "",
      status: "",
    });
    setCurrentPage(1);
    if (isMobile) setShowFilters(false);
  };

  return (
    <div
      className="relative space-y-4 lg:space-y-8 pb-8 lg:pb-12 px-4 sm:px-6 lg:px-0"
      style={{ fontFamily: '"Work Sans", "Noto Sans", sans-serif' }}
    >
      <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-emerald-100/60 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-8 h-40 w-40 rounded-full bg-cyan-100/50 blur-3xl" />

      {/* Mobile Filter Toggle */}
      {isMobile && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="fixed bottom-6 right-6 z-50 h-14 rounded-full bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-2xl flex items-center justify-center hover:from-emerald-700 hover:to-teal-700 transition-colors px-5"
          aria-label={showFilters ? "Hide filters" : "Show filters"}
        >
          <span className="material-symbols-outlined text-2xl mr-1">
            {showFilters ? "close" : "filter_list"}
          </span>
          <span className="text-sm font-semibold">Filters</span>
        </button>
      )}

      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-linear-to-br from-white via-emerald-50/40 to-cyan-50/60 p-5 sm:p-7 lg:p-8 shadow-sm">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/40" />
        <div className="absolute right-16 bottom-0 h-16 w-16 rounded-full bg-cyan-200/40" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-6">
          <div className="space-y-2 lg:space-y-3">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">
              Provider Command Center
            </p>
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

            <div className="flex flex-wrap gap-2 pt-1">
              {locationLoading && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-emerald-200 text-emerald-700">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  Detecting location
                </span>
              )}
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-700">
                  {activeFilterCount} active filter
                  {activeFilterCount > 1 ? "s" : ""}
                </span>
              )}
              {sortBy === "recommended" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-indigo-200 text-indigo-700">
                  Personalized order
                </span>
              )}
            </div>
          </div>
          {/* Only show Post Job button for CLIENT role */}
          {hasRole(session?.user, "CLIENT") && (
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
        </div>
      </header>

      {shouldShowServiceSetupPrompt && (
        <section className="bg-linear-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-900">
                Set up your profile before taking jobs
              </h2>
              <p className="text-sm sm:text-base text-amber-800 mt-1 max-w-2xl">
                You do not have any services yet. Add your first service and set
                your availability so clients can book you without scheduling
                friction.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/services?create=true"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Create Service
              </Link>
              <Link
                href="/dashboard/availability"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-amber-900 border border-amber-300 rounded-xl font-semibold hover:bg-amber-100 transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  schedule
                </span>
                Set Availability
              </Link>
            </div>
          </div>
        </section>
      )}

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
              {filters.status === "OPEN" ? totalJobs : openJobsCount}
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
              {activeFilterCount}
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
            <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 flex-wrap">
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
              {filters.status && (
                <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 bg-gray-50">
                  Status: {filters.status.replace("_", " ")}
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
                  className="bg-white rounded-xl lg:rounded-2xl h-44 sm:h-52 animate-pulse shadow-sm border border-gray-100 relative overflow-hidden"
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
                {activeFilterCount > 0
                  ? "We couldn't find any jobs matching your current filters. Try adjusting them to see more results."
                  : "There are no jobs available at the moment. Please check back later!"}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-6 lg:px-8 py-2.5 lg:py-3 bg-emerald-600 text-white rounded-lg lg:rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-200 text-sm lg:text-base"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                {jobs.map((job, index) => (
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
    </div>
  );
};

export default DashboardPage;
