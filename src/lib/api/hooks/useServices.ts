import {
  useQuery,
  useInfiniteQuery,
  UseQueryResult,
} from "@tanstack/react-query";
import apiClient from "../client";
import { queryKeys } from "../queryKeys";

// Types
/** Single row from GET /api/services (marketplace list / infinite scroll). */
export interface ServiceListItem {
  id: string;
  title: string;
  description: string;
  price: number;
  pricingUnit: string;
  images: string[];
  video?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  provider: {
    id: string;
    name: string;
    image: string | null;
    isVerified: boolean;
    latitude?: number | null;
    longitude?: number | null;
    location?: string | null;
    subscription: {
      plan: string;
      isActive: boolean;
    };
  };
  promoted: {
    isPromoted: boolean;
    plan: string | null;
    until: string | null;
  };
  rating: number;
  reviews: number;
  rebookedCount?: number;
  distance?: number;
  dynamicPricing?: {
    multiplier: number;
    reason: string | null;
    finalPrice: number;
  };
}

/** Full payload from GET /api/services/[id] and server getPublicServiceDetail. */
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
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  provider: {
    id: string;
    name: string;
    image: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
    role: string;
    isVerified: boolean;
    profile: {
      bio: string | null;
      location: string | null;
      hourlyRate: number | null;
      portfolio: string[];
      verificationStatus?: string | null;
    } | null;
    subscription: {
      plan: string;
      isActive: boolean;
    };
    backgroundChecks: { id: string; status: string }[];
    rating: number;
    reviewCount: number;
    completedJobs: number;
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
    price: number;
    pricingUnit: string;
    category: { name: string; slug: string };
  }[];
  dynamicPricing?: {
    multiplier: number;
    reason: string | null;
    finalPrice: number;
    breakdown?: {
      timeMultiplier: number;
      demandMultiplier: number;
      weatherMultiplier: number;
      providerMultiplier?: number;
      trustMultiplier?: number;
    };
  };
}

export interface ServicesResponse {
  services: ServiceListItem[];
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
  sort?:
    | "relevance"
    | "rating"
    | "price_low"
    | "price_high"
    | "distance"
    | "rebooked";
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
  filters: ServicesFilters = {},
): Promise<ServicesResponse> {
  const params = new URLSearchParams();

  if (filters.page != null) params.append("page", filters.page.toString());
  if (filters.limit != null) params.append("limit", filters.limit.toString());
  if (filters.category) params.append("category", filters.category);
  if (filters.verified !== undefined)
    params.append("verified", filters.verified.toString());
  if (filters.minPrice != null)
    params.append("minPrice", filters.minPrice.toString());
  if (filters.maxPrice != null)
    params.append("maxPrice", filters.maxPrice.toString());
  if (filters.minRating != null)
    params.append("minRating", filters.minRating.toString());
  if (filters.search) params.append("search", filters.search);
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.latitude != null)
    params.append("latitude", filters.latitude.toString());
  if (filters.longitude != null)
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
  filters: ServicesFilters = {},
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
    queryKey: [...queryKeys.services.list(filters), "infinite"],
    queryFn: async ({ pageParam = 1 }) =>
      fetchServices({ ...filters, page: pageParam as number, limit: 12 }),
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
export function useService(
  id: string,
  options?: { initialData?: Service },
): UseQueryResult<Service, Error> {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/services/${id}`);
      return data.data;
    },
    enabled: !!id,
    initialData: options?.initialData,
    staleTime: options?.initialData ? 5 * 60 * 1000 : 60 * 1000,
  });
}
