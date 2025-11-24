import { useQuery, UseQueryResult } from "@tanstack/react-query";
import apiClient from "../client";
import { queryKeys } from "../queryKeys";

// Types
export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  startingPrice: number;
  isVerified: boolean;
  imageUrl: string;
  pricingUnit?: string;
}

export interface ServicesResponse {
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServicesFilters {
  page?: number;
  limit?: number;
  category?: string;
  verified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "relevance" | "rating" | "price_low" | "price_high";
}

// Fetch services
async function fetchServices(filters: ServicesFilters = {}): Promise<ServicesResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.category) params.append("category", filters.category);
  if (filters.verified !== undefined) params.append("verified", filters.verified.toString());
  if (filters.minPrice) params.append("minPrice", filters.minPrice.toString());
  if (filters.maxPrice) params.append("maxPrice", filters.maxPrice.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.sort) params.append("sort", filters.sort);

  const { data } = await apiClient.get(`/services?${params.toString()}`);
  return data.data;
}

// Hook to fetch services
export function useServices(
  filters: ServicesFilters = {}
): UseQueryResult<ServicesResponse, Error> {
  return useQuery({
    queryKey: queryKeys.services.list(filters),
    queryFn: () => fetchServices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch single service
export function useService(id: string): UseQueryResult<Service, Error> {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/services/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
