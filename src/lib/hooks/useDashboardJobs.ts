import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/client";
import {
  parseApiData,
  type JobsListPayload,
} from "@/lib/api/contracts/public-listings";

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

      if (filters.sortBy === "recommended") {
        const recommendationParams = new URLSearchParams();
        if (debouncedSearch)
          recommendationParams.append("search", debouncedSearch);
        if (filters.category)
          recommendationParams.append("category", filters.category);
        recommendationParams.append("page", filters.page.toString());
        recommendationParams.append("pageSize", filters.pageSize.toString());
        if (filters.userLat !== null && filters.userLat !== undefined) {
          recommendationParams.append("latitude", filters.userLat.toString());
        }
        if (filters.userLon !== null && filters.userLon !== undefined) {
          recommendationParams.append("longitude", filters.userLon.toString());
        }

        const response = await apiClient.get<unknown>(
          `/recommendations/jobs?${recommendationParams.toString()}`,
        );
        const parsed = parseApiData<{
          items: Array<{
            id: string;
            title: string;
            description: string;
            createdAt?: string;
            status?: string;
            budget?: number;
            location?: string;
            latitude?: number | null;
            longitude?: number | null;
            category?: { id?: string; name?: string; slug?: string } | null;
            _count?: { proposals?: number };
            recommendation?: { score?: number };
          }>;
          pagination?: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
          };
        }>(response.data);

        const items = (parsed.items || []).map((job) => ({
          ...job,
          createdAt: job.createdAt || new Date().toISOString(),
          category: job.category
            ? {
                id: job.category.id || "",
                name: job.category.name || "General",
                slug: job.category.slug || "general",
              }
            : undefined,
          _count: {
            proposals: Number(job._count?.proposals || 0),
          },
          score: Number(job.recommendation?.score || 0),
        }));

        const fallbackPagination = {
          page: filters.page,
          pageSize: filters.pageSize,
          total: items.length,
          totalPages: items.length > 0 ? 1 : 0,
          hasMore: false,
        };

        return {
          items,
          pagination: parsed.pagination || fallbackPagination,
        };
      }

      const response = await apiClient.get<unknown>(
        `/jobs?${params.toString()}`,
      );
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
    placeholderData: keepPreviousData,
  });
};
