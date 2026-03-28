import { useInfiniteQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import {
  parseApiData,
  type JobsListPayload,
} from "@/lib/api/contracts/public-listings";
import { queryKeys } from "@/lib/api/queryKeys";

export type PublicJobsFilters = {
  status: string;
  search?: string;
  category?: string;
  verifiedOnly?: boolean;
  latitude?: number;
  longitude?: number;
  pageSize?: number;
};

export function usePublicJobsInfinite(filters: PublicJobsFilters) {
  const pageSize = filters.pageSize ?? 12;

  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.jobs.lists(),
      "public-infinite",
      filters.status,
      filters.search ?? "",
      filters.category ?? "",
      filters.verifiedOnly ?? false,
      filters.latitude,
      filters.longitude,
      pageSize,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set("status", filters.status);
      params.set("page", String(pageParam));
      params.set("pageSize", String(pageSize));
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.verifiedOnly) params.set("verifiedOnly", "true");
      if (filters.latitude != null && filters.longitude != null) {
        params.set("latitude", String(filters.latitude));
        params.set("longitude", String(filters.longitude));
      }

      const { data } = await apiClient.get<unknown>(`/jobs?${params}`);
      return parseApiData<JobsListPayload>(data);
    },
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60 * 1000,
  });
}
