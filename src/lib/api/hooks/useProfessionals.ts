import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

export interface Professional {
  id: string;
  name: string;
  image: string | null;
  title: string;
  bio: string | null;
  skills: string[];
  hourlyRate: number;
  location: string | null;
  rating: number;
  reviews: number;
  completedJobs: number;
  memberSince: string;
  verified?: boolean;
  distance?: number;
  subscription?: {
    plan: string;
    isActive: boolean;
  };
}

interface UseProfessionalsParams {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  verifiedOnly?: boolean;
  latitude?: number;
  longitude?: number;
  page?: number;
  limit?: number;
}

export const useProfessionals = (params?: UseProfessionalsParams) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.minPrice) queryParams.append("minPrice", params.minPrice.toString());
  if (params?.maxPrice) queryParams.append("maxPrice", params.maxPrice.toString());
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.verifiedOnly) queryParams.append("verifiedOnly", "true");
  if (params?.latitude) queryParams.append("latitude", params.latitude.toString());
  if (params?.longitude) queryParams.append("longitude", params.longitude.toString());

  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  return useQuery<{ data: Professional[], pagination: any }>({
    queryKey: ["professionals", params],
    queryFn: async () => {
      const response = await fetch(`/api/professionals?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch professionals");
      }
      return response.json();
    },
  });
};

export const useProfessionalsInfinite = (params?: UseProfessionalsParams) => {
  return useInfiniteQuery({
    queryKey: ["professionals", "infinite", params],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append("search", params.search);
      if (params?.minPrice) queryParams.append("minPrice", params.minPrice.toString());
      if (params?.maxPrice) queryParams.append("maxPrice", params.maxPrice.toString());
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.verifiedOnly) queryParams.append("verifiedOnly", "true");
      if (params?.latitude) queryParams.append("latitude", params.latitude.toString());
      if (params?.longitude) queryParams.append("longitude", params.longitude.toString());
      
      queryParams.append("page", pageParam.toString());
      queryParams.append("limit", (params?.limit || 12).toString());

      const response = await fetch(`/api/professionals?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch professionals");
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination || lastPage.data?.pagination || {};
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};
