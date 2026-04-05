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

type RecommendationPagination = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
};

type RecommendedProfessionalsPayload = {
  items?: unknown[];
  pagination?: RecommendationPagination;
};

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

function isRecommendedSort(params?: UseProfessionalsParams): boolean {
  return params?.sortBy === "recommended";
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

function mapRecommendedProfessionalItem(
  item: unknown,
): ProfessionalListItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as {
    id?: string;
    name?: string;
    image?: string | null;
    coverImage?: string | null;
    title?: string;
    bio?: string;
    location?: string;
    latitude?: unknown;
    longitude?: unknown;
    skills?: unknown;
    hourlyRate?: unknown;
    rating?: unknown;
    reviews?: unknown;
    completedJobs?: unknown;
    memberSince?: string;
    verified?: boolean;
    backgroundChecked?: boolean;
    certified?: boolean;
    trustBadges?: unknown;
    verificationAccessGranted?: boolean;
    visibilityBoostScore?: unknown;
    subscription?: {
      plan?: string;
      isActive?: boolean;
    };
    distance?: unknown;
    recommendation?: {
      score?: unknown;
    };
  };

  if (!source.id) return null;

  const nowIso = new Date().toISOString();
  const verified = Boolean(source.verified);
  const memberSince =
    typeof source.memberSince === "string" &&
    !Number.isNaN(new Date(source.memberSince).getTime())
      ? source.memberSince
      : nowIso;

  return {
    id: source.id,
    name: source.name || "Anonymous Professional",
    image: source.image ?? null,
    coverImage: source.coverImage ?? null,
    title: source.title || "Service Provider",
    bio: source.bio || "",
    skills: toStringArray(source.skills),
    hourlyRate: toNumber(source.hourlyRate) ?? 0,
    location: source.location || "Mobile Service",
    latitude: toNumber(source.latitude),
    longitude: toNumber(source.longitude),
    rating: toNumber(source.rating) ?? 0,
    reviews: toNumber(source.reviews) ?? 0,
    completedJobs: toNumber(source.completedJobs) ?? 0,
    memberSince,
    verified,
    backgroundChecked: Boolean(source.backgroundChecked),
    certified: Boolean(source.certified),
    trustBadges: toStringArray(source.trustBadges),
    verificationAccessGranted: Boolean(source.verificationAccessGranted),
    visibilityBoostScore: toNumber(source.visibilityBoostScore) ?? 0,
    subscription: {
      plan: source.subscription?.plan || "FREE",
      isActive: Boolean(source.subscription?.isActive),
    },
    distance: toNumber(source.distance) ?? undefined,
    relevanceScore: toNumber(source.recommendation?.score) ?? undefined,
  };
}

function toSafePagination(
  pagination: RecommendationPagination | undefined,
  fallbackPage: number,
  fallbackLimit: number,
): ProfessionalsListPayload["pagination"] {
  const page = Math.max(
    1,
    Math.trunc(toNumber(pagination?.page) ?? fallbackPage),
  );
  const pageSize = Math.max(
    1,
    Math.trunc(toNumber(pagination?.limit) ?? fallbackLimit),
  );
  const total = Math.max(0, Math.trunc(toNumber(pagination?.total) ?? 0));
  const totalPages = Math.max(
    total === 0 ? 0 : 1,
    Math.trunc(
      toNumber(pagination?.totalPages) ??
        (total === 0 ? 0 : Math.ceil(total / pageSize)),
    ),
  );
  const hasMore =
    typeof pagination?.hasMore === "boolean"
      ? pagination.hasMore
      : page < totalPages;

  return {
    page,
    pageSize,
    limit: pageSize,
    total,
    totalPages,
    hasMore,
  };
}

async function fetchMarketplaceProfessionals(
  params: UseProfessionalsParams | undefined,
  page: number,
  limit: number,
): Promise<ProfessionalsListPayload> {
  const queryParams = new URLSearchParams();
  appendFilterParams(queryParams, params);
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));

  const response = await fetch(`/api/professionals?${queryParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch professionals");
  const json: unknown = await response.json();
  return parseApiData<ProfessionalsListPayload>(json);
}

async function fetchRecommendedProfessionals(
  params: UseProfessionalsParams | undefined,
  page: number,
  limit: number,
): Promise<ProfessionalsListPayload> {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.set("search", params.search);
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (params?.minPrice !== undefined) {
    queryParams.set("minPrice", params.minPrice.toString());
  }
  if (params?.maxPrice !== undefined) {
    queryParams.set("maxPrice", params.maxPrice.toString());
  }
  if (params?.verifiedOnly) {
    queryParams.set("verifiedOnly", "true");
  }
  if (params?.backgroundCheckedOnly) {
    queryParams.set("backgroundCheckedOnly", "true");
  }
  if (params?.certifiedOnly) {
    queryParams.set("certifiedOnly", "true");
  }
  if (params?.latitude !== undefined) {
    queryParams.set("latitude", params.latitude.toString());
  }
  if (params?.longitude !== undefined) {
    queryParams.set("longitude", params.longitude.toString());
  }

  const response = await fetch(
    `/api/recommendations/professionals?${queryParams.toString()}`,
  );
  if (!response.ok)
    throw new Error("Failed to fetch recommended professionals");

  const json: unknown = await response.json();
  const payload = parseApiData<RecommendedProfessionalsPayload>(json);
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    items: items
      .map((item) => mapRecommendedProfessionalItem(item))
      .filter((item): item is ProfessionalListItem => item !== null),
    pagination: toSafePagination(payload?.pagination, page, limit),
  };
}

async function fetchProfessionalsPage(
  params: UseProfessionalsParams | undefined,
  page: number,
  limit: number,
): Promise<ProfessionalsListPayload> {
  if (isRecommendedSort(params)) {
    return fetchRecommendedProfessionals(params, page, limit);
  }

  return fetchMarketplaceProfessionals(params, page, limit);
}

export const useProfessionals = (params?: UseProfessionalsParams) => {
  return useQuery({
    queryKey: ["professionals", params],
    queryFn: async () => {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 12;
      return fetchProfessionalsPage(params, page, limit);
    },
    staleTime: 60 * 1000,
  });
};

export const useProfessionalsInfinite = (params?: UseProfessionalsParams) => {
  return useInfiniteQuery({
    queryKey: ["professionals", "infinite", params],
    queryFn: async ({ pageParam = 1 }) =>
      fetchProfessionalsPage(params, pageParam as number, params?.limit ?? 12),
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60 * 1000,
  });
};
