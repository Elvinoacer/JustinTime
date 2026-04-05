import {
  useQuery,
  useInfiniteQuery,
  UseQueryResult,
} from "@tanstack/react-query";
import apiClient from "../client";
import { queryKeys } from "../queryKeys";

type RecommendationPagination = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
};

type RecommendationEnvelope<T> = {
  data?: T;
};

type RecommendedServicePayload = {
  items?: unknown[];
  pagination?: RecommendationPagination;
};

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
    | "recommended"
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

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function mapRecommendedServiceItem(item: unknown): ServiceListItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as {
    id?: string;
    title?: string;
    description?: string;
    price?: unknown;
    pricingUnit?: string;
    images?: unknown;
    video?: string | null;
    category?: { id?: string; name?: string; slug?: string };
    provider?: {
      id?: string;
      name?: string;
      image?: string | null;
      isVerified?: boolean;
      latitude?: unknown;
      longitude?: unknown;
      location?: string | null;
      subscription?: {
        plan?: string;
        isActive?: boolean;
      };
    };
    promoted?: {
      isPromoted?: boolean;
      plan?: string | null;
      until?: string | null;
    };
    rating?: unknown;
    reviews?: unknown;
    completedBookings?: unknown;
    distance?: unknown;
  };

  if (!source.id || !source.title || !source.description) return null;

  const price = toNumber(source.price);
  if (price == null) return null;

  return {
    id: source.id,
    title: source.title,
    description: source.description,
    price,
    pricingUnit: source.pricingUnit || "fixed",
    images: toStringArray(source.images),
    video: source.video ?? null,
    category: {
      id: source.category?.id || "uncategorized",
      name: source.category?.name || "General",
      slug: source.category?.slug || "general",
    },
    provider: {
      id: source.provider?.id || "unknown-provider",
      name: source.provider?.name || "Unknown Provider",
      image: source.provider?.image ?? null,
      isVerified: Boolean(source.provider?.isVerified),
      latitude: toNumber(source.provider?.latitude),
      longitude: toNumber(source.provider?.longitude),
      location: source.provider?.location ?? null,
      subscription: {
        plan: source.provider?.subscription?.plan || "FREE",
        isActive: Boolean(source.provider?.subscription?.isActive),
      },
    },
    promoted: {
      isPromoted: Boolean(source.promoted?.isPromoted),
      plan: source.promoted?.plan ?? null,
      until: source.promoted?.until ?? null,
    },
    rating: toNumber(source.rating) ?? 0,
    reviews: toNumber(source.reviews) ?? 0,
    rebookedCount: toNumber(source.completedBookings) ?? 0,
    distance: toNumber(source.distance) ?? undefined,
  };
}

function parseRecommendationPayload(
  body: unknown,
): RecommendedServicePayload | undefined {
  if (!body || typeof body !== "object") return undefined;

  const envelope = body as RecommendationEnvelope<RecommendedServicePayload>;
  if (envelope.data && typeof envelope.data === "object") {
    return envelope.data;
  }

  return body as RecommendedServicePayload;
}

function toSafePagination(
  pagination: RecommendationPagination | undefined,
  fallbackPage: number,
  fallbackLimit: number,
): ServicesResponse["pagination"] {
  const page = Math.max(
    1,
    Math.trunc(toNumber(pagination?.page) ?? fallbackPage),
  );
  const limit = Math.max(
    1,
    Math.trunc(toNumber(pagination?.limit) ?? fallbackLimit),
  );
  const total = Math.max(0, Math.trunc(toNumber(pagination?.total) ?? 0));
  const totalPages = Math.max(
    total === 0 ? 0 : 1,
    Math.trunc(
      toNumber(pagination?.totalPages) ??
        (total === 0 ? 0 : Math.ceil(total / limit)),
    ),
  );

  return {
    page,
    limit,
    total,
    totalPages,
  };
}

async function fetchRecommendedServices(
  filters: ServicesFilters = {},
): Promise<ServicesResponse> {
  const params = new URLSearchParams();

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (filters.category && filters.category !== "All Services") {
    params.set("category", filters.category);
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.latitude != null)
    params.set("latitude", String(filters.latitude));
  if (filters.longitude != null)
    params.set("longitude", String(filters.longitude));
  if (filters.verified !== undefined) {
    params.set("verified", String(filters.verified));
  }
  if (filters.minPrice != null) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice != null) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.minRating != null) {
    params.set("minRating", String(filters.minRating));
  }

  const response = await fetch(
    `/api/recommendations/services?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch recommended services");
  }

  const body: unknown = await response.json();
  const payload = parseRecommendationPayload(body);
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    services: items
      .map((item) => mapRecommendedServiceItem(item))
      .filter((item): item is ServiceListItem => item !== null),
    pagination: toSafePagination(payload?.pagination, page, limit),
  };
}

async function fetchMarketplaceServices(
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

// Fetch services
async function fetchServices(
  filters: ServicesFilters = {},
): Promise<ServicesResponse> {
  if (filters.sort === "recommended") {
    return fetchRecommendedServices(filters);
  }

  return fetchMarketplaceServices(filters);
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
