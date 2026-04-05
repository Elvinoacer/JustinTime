import { useQuery } from "@tanstack/react-query";

export type RecommendedProfessionalsFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export type RecommendedProfessionalsContext = {
  latitude?: number | null;
  longitude?: number | null;
};

export function useRecommendedProfessionals(
  userContext?: RecommendedProfessionalsContext,
  filters?: RecommendedProfessionalsFilters,
) {
  return useQuery({
    queryKey: ["recommendations", "professionals", userContext, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.page != null) params.set("page", String(filters.page));
      if (filters?.limit != null) params.set("limit", String(filters.limit));
      if (filters?.search) params.set("search", filters.search);

      if (userContext?.latitude != null) {
        params.set("latitude", String(userContext.latitude));
      }
      if (userContext?.longitude != null) {
        params.set("longitude", String(userContext.longitude));
      }

      const response = await fetch(
        `/api/recommendations/professionals?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load recommended professionals");
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
