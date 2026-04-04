import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  parseApiData,
  type ProfessionalsListPayload,
  type ProfessionalListItem,
} from "@/lib/api/contracts/public-listings";

export type Professional = ProfessionalListItem;

interface UseProfessionalsParams {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  verifiedOnly?: boolean;
  backgroundCheckedOnly?: boolean;
  certifiedOnly?: boolean;
  latitude?: number;
  longitude?: number;
  page?: number;
  limit?: number;
}

function appendFilterParams(
  queryParams: URLSearchParams,
  params?: UseProfessionalsParams,
) {
  if (params?.search) queryParams.append("search", params.search);
  if (params?.minPrice !== undefined)
    queryParams.append("minPrice", params.minPrice.toString());
  if (params?.maxPrice !== undefined)
    queryParams.append("maxPrice", params.maxPrice.toString());
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.verifiedOnly) queryParams.append("verifiedOnly", "true");
  if (params?.backgroundCheckedOnly) {
    queryParams.append("backgroundCheckedOnly", "true");
  }
  if (params?.certifiedOnly) queryParams.append("certifiedOnly", "true");
  if (params?.latitude !== undefined)
    queryParams.append("latitude", params.latitude.toString());
  if (params?.longitude !== undefined)
    queryParams.append("longitude", params.longitude.toString());
}

export const useProfessionals = (params?: UseProfessionalsParams) => {
  return useQuery({
    queryKey: ["professionals", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      appendFilterParams(queryParams, params);
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(`/api/professionals?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch professionals");
      const json: unknown = await response.json();
      return parseApiData<ProfessionalsListPayload>(json);
    },
    staleTime: 60 * 1000,
  });
};

export const useProfessionalsInfinite = (params?: UseProfessionalsParams) => {
  return useInfiniteQuery({
    queryKey: ["professionals", "infinite", params],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      appendFilterParams(queryParams, params);
      queryParams.set("page", String(pageParam));
      queryParams.set("limit", String(params?.limit ?? 12));

      const response = await fetch(`/api/professionals?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch professionals");
      const json: unknown = await response.json();
      return parseApiData<ProfessionalsListPayload>(json);
    },
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60 * 1000,
  });
};
