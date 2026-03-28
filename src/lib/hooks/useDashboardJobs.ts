import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import { parseApiData, type JobsListPayload } from "@/lib/api/contracts/public-listings";

interface DashboardJobsFilters {
  search: string;
  category: string;
  location: string;
  budgetMin: string;
  budgetMax: string;
  status: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  userLat?: number | null;
  userLon?: number | null;
}

export const useDashboardJobs = (filters: DashboardJobsFilters) => {
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [filters.search]);

  return useQuery({
    queryKey: [
      "dashboard-jobs",
      debouncedSearch,
      filters.category,
      filters.location,
      filters.budgetMin,
      filters.budgetMax,
      filters.status,
      filters.sortBy,
      filters.sortOrder,
      filters.page,
      filters.userLat,
      filters.userLon,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filters.category) params.append("category", filters.category);
      if (filters.location) params.append("location", filters.location);
      if (filters.budgetMin) params.append("budgetMin", filters.budgetMin);
      if (filters.budgetMax) params.append("budgetMax", filters.budgetMax);
      if (filters.status) params.append("status", filters.status);
      params.append("sortBy", filters.sortBy);
      params.append("sortOrder", filters.sortOrder);
      params.append("page", filters.page.toString());
      params.append("pageSize", filters.pageSize.toString());
      
      // Add user coordinates if available
      if (filters.userLat !== null && filters.userLat !== undefined) {
        params.append("userLat", filters.userLat.toString());
      }
      if (filters.userLon !== null && filters.userLon !== undefined) {
        params.append("userLon", filters.userLon.toString());
      }

      const response = await apiClient.get<unknown>(`/jobs?${params.toString()}`);
      const parsed = parseApiData<JobsListPayload>(response.data);
      return {
        ...parsed,
        items: parsed.items.map((j) => ({
          ...j,
          distance: j.distanceKm,
          client: {
            id: j.client.id,
            name: j.client.name,
            image: j.client.image ?? undefined,
            verified: j.client.isVerified,
          },
          _count: { proposals: j.proposalCount },
        })),
      };
    },
  });
};
