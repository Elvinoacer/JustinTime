import { useQuery, useInfiniteQuery, UseQueryResult } from "@tanstack/react-query";
import apiClient from "../client";
import { queryKeys } from "../queryKeys";

// Types
export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  pricingUnit: string;
  images: string[];
  video?: string | null;
  views: number;
  favorites: number;
  category: {
    id: string;
    name: string;
  };
  provider: {
    id: string;
    name: string;
    image: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
    profile: {
      bio: string | null;
      location: string | null;
      hourlyRate: number | null;
      portfolio: string[];
      isVerified: boolean;
    } | null;
    rating: number;
    reviewCount: number;
    receivedReviews: {
      id: string;
      rating: number;
      comment: string | null;
      createdAt: string;
      author: {
        name: string | null;
        image: string | null;
      };
    }[];
  };
  otherServices: {
    id: string;
    title: string;
    category: { name: string };
  }[];
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
  minRating?: number;
  maxPrice?: number;
  search?: string;
  sort?: "relevance" | "rating" | "price_low" | "price_high" | "distance";
  latitude?: number;
  longitude?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

// Fetch services
async function fetchServices(
  filters: ServicesFilters = {}
): Promise<ServicesResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.category) params.append("category", filters.category);
  if (filters.verified !== undefined)
    params.append("verified", filters.verified.toString());
  if (filters.minPrice) params.append("minPrice", filters.minPrice.toString());
  if (filters.maxPrice) params.append("maxPrice", filters.maxPrice.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.latitude) params.append("latitude", filters.latitude.toString());
  if (filters.longitude)
    params.append("longitude", filters.longitude.toString());

  const { data } = await apiClient.get(`/services?${params.toString()}`);
  return data.data;
}

// Fetch categories
async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get("/categories");
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

// Infinite Hook to fetch services
export function useServicesInfinite(filters: ServicesFilters = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.services.list(filters), 'infinite'],
    queryFn: async ({ pageParam = 1 }) => fetchServices({ ...filters, page: pageParam as number, limit: 12 }),
    getNextPageParam: (lastPage: ServicesResponse) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch categories
export function useCategories(): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: ["categories"], // TODO: Add to queryKeys factory if needed
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
