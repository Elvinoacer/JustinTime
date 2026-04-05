import { useQuery } from "@tanstack/react-query";

export type RecommendedServicesFilters = {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
};

export type RecommendedServicesContext = {
  latitude?: number | null;
  longitude?: number | null;
};

export function useRecommendedServices(
  userContext?: RecommendedServicesContext,
  filters?: RecommendedServicesFilters,
) {
  return useQuery({
    queryKey: ["recommendations", "services", userContext, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.page != null) params.set("page", String(filters.page));
      if (filters?.limit != null) params.set("limit", String(filters.limit));
      if (filters?.category) params.set("category", filters.category);
      if (filters?.search) params.set("search", filters.search);

      if (userContext?.latitude != null) {
        params.set("latitude", String(userContext.latitude));
      }
      if (userContext?.longitude != null) {
        params.set("longitude", String(userContext.longitude));
      }

      const response = await fetch(
        `/api/recommendations/services?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load recommended services");
      }

      const json = (await response.json()) as {
        data?: {
          items?: unknown[];
          pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
          };
        };
      };

      return {
        items: Array.isArray(json?.data?.items) ? json.data.items : [],
        pagination: json?.data?.pagination,
      };
    },
    staleTime: 60 * 1000,
  });
}
