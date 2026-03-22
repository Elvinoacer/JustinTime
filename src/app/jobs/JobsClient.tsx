"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInfiniteQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useCategories } from "@/lib/api/hooks/useServices";
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel";
import LocationPicker from "@/components/LocationPicker";
import GuestCTAStrip from "@/components/shared/GuestCTAStrip";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import {
  Search,
  Filter,
  X,
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  User,
  CheckCircle,
  DollarSign,
  Loader2,
  ChevronDown,
  Building,
} from "lucide-react";

const JobsPage = () => {
  const [searchInput, setSearchInput] = useState(""); // User's input
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search
  const [selectedStatus, setSelectedStatus] = useState("OPEN");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch categories
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  const { 
    data, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: [
      "jobs",
      "infinite",
      selectedStatus,
      searchQuery,
      selectedCategory,
      verifiedOnly,
      userLocation?.latitude,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append("status", selectedStatus);
      params.append("page", pageParam.toString());
      params.append("pageSize", "12");
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      if (verifiedOnly) params.append("verifiedOnly", "true");
      if (userLocation) {
        params.append("latitude", userLocation.latitude.toString());
        params.append("longitude", userLocation.longitude.toString());
      }
      const response = await apiClient.get(`/jobs?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage: any) => {
      const { page, totalPages, currentPage } = lastPage.pagination || lastPage.meta || {};
      const actualPage = page || currentPage || 1;
      const actualTotalPages = totalPages || 1;
      return actualPage < actualTotalPages ? actualPage + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const jobs = data?.pages.flatMap((page: any) => page.items) || [];

  const tabs = [
    { id: "OPEN", label: "Open Jobs", icon: Briefcase },
    { id: "IN_PROGRESS", label: "In Progress", icon: Loader2 },
    { id: "COMPLETED", label: "Completed", icon: CheckCircle },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <PageHeader 
        title="Find Your Next Project" 
        description="Browse available jobs and submit proposals to grow your business."
      />

      {/* Sticky Search & Filter Bar */}
      <section className="bg-white border-b border-gray-200 sticky top-[64px] sm:top-[72px] z-40 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-gray-100 border-2 border-transparent rounded-full focus:bg-white focus:border-emerald-500 focus:outline-none transition-all text-gray-900 text-sm sm:text-base"
              />
              {searchInput && searchInput !== searchQuery && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 animate-spin" />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Category Filter Desktop */}
              <div className="hidden lg:block relative min-w-[200px]">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 border-2 border-gray-200 rounded-full focus:outline-none focus:border-emerald-500 transition-all text-gray-900 bg-white appearance-none text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.id || cat.name}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              
              <LocationPicker onLocationChange={setUserLocation} />
              
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden flex items-center justify-center p-2.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700"
              >
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Secondary Ribbon (Status Tabs + Verification) */}
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hidden lg:flex border-t border-gray-100 pt-3">
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                      selectedStatus === tab.id
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStatus(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Verified Toggle Desktop */}
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 transition-colors ${verifiedOnly ? 'bg-emerald-50' : 'bg-white'}`}
            >
               <span className="text-sm text-gray-700 font-medium">Verified Clients</span>
               <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${verifiedOnly ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                 <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${verifiedOnly ? 'translate-x-4' : ''}`} />
               </div>
            </button>
          </div>
        </div>
      </section>
      
      {/* Mobile Filters Dropdown */}
      {showMobileFilters && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-4 shadow-sm animate-in slide-in-from-top-2">
           <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm bg-white appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.id || cat.name}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
            
            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-medium border transition-colors ${
                      selectedStatus === tab.id
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                    onClick={() => setSelectedStatus(tab.id)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
               <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-600"/> Verified Clients Only</span>
               <button
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${verifiedOnly ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${verifiedOnly ? 'translate-x-4' : ''}`} />
                </button>
            </div>
        </div>
      )}

      {/* Jobs Grid */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex-1">
        {isLoading && jobs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-[330px] border border-gray-100 shadow-sm p-6 flex flex-col justify-between animate-pulse">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                     <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                     <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState 
            title="No Jobs Found" 
            description="There are no open jobs currently matching your filters and criteria. Try clearing them."
            buttonText="Clear All Filters"
            onAction={() => {
              setSearchInput("");
              setSearchQuery("");
              setSelectedCategory("");
              setVerifiedOnly(false);
              setSelectedStatus("OPEN");
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job: any, index: number) => (
              <motion.div
                key={job.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
              >
                <div className="p-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-3">
                      <Link href={`/jobs/${job.id}`}>
                         <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                           {job.title}
                         </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                           <Building className="w-3.5 h-3.5" />
                           {job.category?.name || "General"}
                         </span>
                         {job.location && (
                           <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium max-w-[140px] truncate">
                             <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                             <span className="truncate">{job.location}</span>
                           </span>
                         )}
                      </div>
                    </div>
                  </div>

                  {/* Budget Ribbon */}
                  {job.budget && (
                    <div className="mb-4 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-lg border border-emerald-100">
                      <DollarSign className="w-4 h-4" />
                      {job.budget.toLocaleString()}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-5 line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="mt-auto">
                     {/* Meta Stats */}
                     <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                       <span className="flex items-center gap-1.5">
                         <FileText className="w-3.5 h-3.5" /> {job._count?.proposals || 0} proposals
                       </span>
                       {job.deadline && (
                         <span className="flex items-center gap-1.5 text-orange-600">
                           <Calendar className="w-3.5 h-3.5" /> 
                           Due: {new Date(job.deadline).toLocaleDateString()}
                         </span>
                       )}
                     </div>

                     {/* Poster / Actions */}
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2.5">
                         <div className="w-9 h-9 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-200">
                           {job.client?.image ? (
                             <img src={job.client.image} alt={job.client.name || "Client"} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-700 font-bold">
                               {job.client?.name?.[0] || "?"}
                             </div>
                           )}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-xs text-gray-500">Client</span>
                           <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                             <span className="truncate max-w-[100px]">{job.client?.name || "Anonymous"}</span>
                             {job.client?.isVerified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                           </span>
                         </div>
                       </div>
                       
                       <Link href={`/jobs/${job.id}`}>
                         <button className="h-9 px-4 bg-gray-900 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                           View
                         </button>
                       </Link>
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <InfiniteScrollSentinel
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        >
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium py-8 mt-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading more jobs...
          </div>
        </InfiniteScrollSentinel>
        
        {!hasNextPage && jobs.length > 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            You've seen all available jobs matching your criteria.
          </div>
        )}

        {/* Guest CTA */}
        <GuestCTAStrip 
          title="Ready to find your next project?" 
          description="Sign up to submit proposals, communicate with clients, and grow your professional reputation."
          buttonText="Start Working"
        />
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
