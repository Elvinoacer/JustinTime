"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useDashboardJobs } from "@/lib/hooks/useDashboardJobs";
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

type DashboardJobResponseItem = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  createdAt?: string | number | Date;
  status?: unknown;
  budget?: unknown;
  location?: unknown;
  deadline?: unknown;
  distance?: unknown;
  distanceKm?: unknown;
  category?: {
    name?: unknown;
    slug?: unknown;
  } | null;
  client?: {
    id?: unknown;
    name?: unknown;
    image?: unknown;
    verified?: unknown;
  } | null;
  _count?: {
    proposals?: unknown;
  } | null;
  [key: string]: unknown;
};

const createDefaultFilters = (): DashboardFilters => ({
  search: "",
  category: "",
  location: "",
  budgetMin: "",
  budgetMax: "",
  status: "",
});

const countActiveFilters = (value: DashboardFilters) =>
  Object.entries(value).filter(
    ([key, currentValue]) => Boolean(currentValue) && key !== "status",
  ).length;

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
  const [filters, setFilters] =
    useState<DashboardFilters>(createDefaultFilters);
  const [mobileDraftFilters, setMobileDraftFilters] =
    useState<DashboardFilters>(createDefaultFilters);
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
      .map((rawItem) => {
        const item = rawItem as DashboardJobResponseItem;
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
          ...(item as unknown as DashboardJob),
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

  const firstName = useMemo(() => {
    const value = session?.user?.name?.trim();
    if (!value) return "there";
    return value.split(" ")[0] || "there";
  }, [session?.user?.name]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters],
  );
  const mobileDraftFilterCount = useMemo(
    () => countActiveFilters(mobileDraftFilters),
    [mobileDraftFilters],
  );
  const openJobsCount = useMemo(
    () => rawJobs.filter((job) => job.status === "OPEN").length,
    [rawJobs],
  );

  // Determine which jobs to display based on sort
  const jobs: DashboardJob[] = rawJobs;
  const { data: providerServicesData } = useProviderServices();
  const providerServices = Array.isArray(providerServicesData?.data)
    ? providerServicesData.data
    : Array.isArray(providerServicesData?.services)
      ? providerServicesData.services
      : [];
  const shouldShowServiceSetupPrompt =
    hasRole(session?.user, "PROVIDER") && providerServices.length === 0;

  const mobileQuickActions = [
    { label: "Jobs", href: "/dashboard/jobs", icon: "work" },
    { label: "Requests", href: "/dashboard/requests", icon: "inbox" },
    { label: "Bookings", href: "/dashboard/bookings", icon: "calendar_month" },
    { label: "Earnings", href: "/dashboard/earnings", icon: "payments" },
    { label: "Profile", href: "/dashboard/profile", icon: "person" },
  ];

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
  };

  const resetFilters = () => {
    const clearedFilters = createDefaultFilters();
    setFilters(clearedFilters);
    setMobileDraftFilters(clearedFilters);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const openMobileFilters = () => {
    setMobileDraftFilters(filters);
    setShowFilters(true);
  };

  const closeMobileFilters = () => {
    setShowFilters(false);
  };

  const applyMobileFilters = () => {
    setFilters(mobileDraftFilters);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const resetMobileDraftFilters = () => {
    setMobileDraftFilters(createDefaultFilters());
  };

  return (
    <div
      className="relative space-y-3 lg:space-y-8 pb-28 lg:pb-12 px-3 sm:px-6 lg:px-0"
      style={{ fontFamily: '"Work Sans", "Noto Sans", sans-serif' }}
    >
      <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-emerald-100/60 blur-3xl hidden lg:block" />
      <div className="pointer-events-none absolute top-56 -left-8 h-40 w-40 rounded-full bg-cyan-100/50 blur-3xl hidden lg:block" />

      {isMobile && (
        <button
          onClick={() => {
            if (showFilters) {
              closeMobileFilters();
            } else {
              openMobileFilters();
            }
          }}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 h-12 min-w-[122px] rounded-full bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-xl flex items-center justify-center hover:from-emerald-700 hover:to-teal-700 transition-colors px-4"
          aria-label={showFilters ? "Close filters" : "Open filters"}
        >
          <span className="material-symbols-outlined text-xl mr-1.5">
            {showFilters ? "close" : "tune"}
          </span>
          <span className="text-sm font-semibold">
            {showFilters
              ? "Close"
              : activeFilterCount > 0
                ? `Filters (${activeFilterCount})`
                : "Filters"}
          </span>
        </button>
      )}

      <header className="relative overflow-hidden rounded-2xl lg:rounded-3xl border border-emerald-100 bg-linear-to-br from-white via-emerald-50/40 to-cyan-50/60 p-4 sm:p-6 lg:p-8 shadow-sm">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/40 hidden lg:block" />
        <div className="absolute right-16 bottom-0 h-16 w-16 rounded-full bg-cyan-200/40 hidden lg:block" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-6">
          <div className="space-y-2">
            {!isMobile && (
              <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">
                Provider Command Center
              </p>
            )}
            <h1
              className={`${
                isMobile
                  ? "text-xl"
                  : "text-2xl sm:text-3xl lg:text-4xl xl:text-5xl"
              } font-extrabold text-gray-900 tracking-tight`}
            >
              {isMobile ? "Jobs" : "Find Jobs"}
            </h1>
            <p
              className={`${
                isMobile
                  ? "text-sm leading-5"
                  : "text-sm sm:text-base lg:text-lg"
              } text-gray-600 max-w-2xl`}
            >
              Welcome back,{" "}
              <span className="font-semibold text-emerald-600">
                {firstName}
              </span>
              {!isMobile && "! Discover your next opportunity."}
            </p>

            <div className="flex flex-wrap gap-2">
              {userLocation?.city && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                  <span className="material-symbols-outlined text-sm">
                    location_on
                  </span>
                  <span className="max-w-44 truncate">{userLocation.city}</span>
                </span>
              )}
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-700">
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </span>
              )}
              {sortBy === "distance" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-cyan-200 text-cyan-700">
                  Nearby
                </span>
              )}
              {locationLoading && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-emerald-200 text-emerald-700">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  Detecting location
                </span>
              )}
            </div>
          </div>

          {hasRole(session?.user, "CLIENT") && (
            <Link
              href="/client/post-job"
              className="flex items-center justify-center gap-2 h-11 bg-gray-900 text-white px-4 sm:px-6 sm:h-auto sm:py-3 sm:rounded-2xl rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:transform active:scale-95 group w-full sm:w-auto"
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
        <section className="bg-linear-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-sm sm:text-xl font-bold text-amber-900 leading-5 sm:leading-normal">
                Set up your profile before taking jobs
              </h2>
              <p className="text-xs sm:text-base text-amber-800 mt-1 max-w-2xl leading-5 sm:leading-6">
                You do not have any services yet. Add your first service and set
                your availability so clients can book you without scheduling
                friction.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/dashboard/services?create=true"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-auto px-3 sm:px-4 sm:py-2.5 bg-amber-600 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:bg-amber-700 transition-colors"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  add
                </span>
                <span className="sm:hidden">Service</span>
                <span className="hidden sm:inline">Create Service</span>
              </Link>
              <Link
                href="/dashboard/availability"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-auto px-3 sm:px-4 sm:py-2.5 bg-white text-amber-900 border border-amber-300 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm hover:bg-amber-100 transition-colors"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  schedule
                </span>
                <span className="sm:hidden">Availability</span>
                <span className="hidden sm:inline">Set Availability</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {isMobile ? (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="px-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                Jobs
              </p>
              <p className="text-lg font-bold text-gray-900">{totalJobs}</p>
            </div>
            <div className="px-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                Open
              </p>
              <p className="text-lg font-bold text-gray-900">
                {filters.status === "OPEN" ? totalJobs : openJobsCount}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                Filters
              </p>
              <p className="text-lg font-bold text-gray-900">
                {activeFilterCount}
              </p>
            </div>
          </div>
        </section>
      ) : (
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
      )}

      {isMobile && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Quick Actions
            </h2>
            <span className="text-xs text-gray-500">Core tools</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {mobileQuickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="min-w-[90px] h-12 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center gap-0.5 text-gray-700 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base text-emerald-600">
                  {action.icon}
                </span>
                <span className="text-[11px] font-semibold">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isMobile && showFilters && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeMobileFilters}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Filters</h2>
                <p className="text-xs text-gray-500">
                  {mobileDraftFilterCount} active
                </p>
              </div>
              <button
                onClick={closeMobileFilters}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto">
              <JobFilters
                filters={mobileDraftFilters}
                onFilterChange={setMobileDraftFilters}
                categories={categories}
                isMobile={true}
                mobileMode="sheet"
              />
            </div>
            <div className="border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetMobileDraftFilters}
                className="h-11 rounded-xl border border-gray-300 text-gray-700 font-semibold"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyMobileFilters}
                className="h-11 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-200"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
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

        <main
          className={`${
            isMobile ? "col-span-1" : "lg:col-span-3"
          } space-y-4 lg:space-y-8`}
        >
          <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 lg:gap-4 bg-white/95 backdrop-blur p-2.5 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
              {jobsLoading ? (
                <span>Loading jobs...</span>
              ) : isMobile ? (
                <span>
                  <span className="font-semibold text-gray-900">
                    {totalJobs}
                  </span>{" "}
                  jobs
                </span>
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
                  {isMobile
                    ? filters.status.replace(/_/g, " ")
                    : `Status: ${filters.status.replace(/_/g, " ")}`}
                </span>
              )}
            </div>
            <div className={isMobile ? "w-full" : undefined}>
              <JobSort
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                isMobile={isMobile}
              />
            </div>
          </div>

          {jobsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-6">
              {[...Array(isMobile ? 3 : 6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl lg:rounded-2xl h-40 sm:h-52 animate-pulse shadow-sm border border-gray-100 relative overflow-hidden"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-100 p-5 sm:p-8 lg:p-16 text-center shadow-sm">
              <div className="w-14 h-14 lg:w-24 lg:h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <span className="material-symbols-outlined text-gray-300 text-3xl lg:text-6xl">
                  work_off
                </span>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 lg:mb-3">
                No Jobs Found
              </h3>
              <p className="text-sm lg:text-base text-gray-500 mb-6 lg:mb-8 max-w-md mx-auto">
                {activeFilterCount > 0
                  ? "We could not find jobs matching these filters. Try adjusting them."
                  : "There are no jobs available at the moment. Please check back later."}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="h-11 px-6 lg:px-8 bg-emerald-600 text-white rounded-lg lg:rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-200 text-sm lg:text-base"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-6">
                {jobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={index}
                    isMobile={isMobile}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4 lg:pt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="h-11 px-7 lg:px-10 lg:h-auto lg:py-4 bg-white border border-gray-200 text-gray-900 rounded-lg lg:rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm hover:shadow-md text-sm lg:text-base"
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
