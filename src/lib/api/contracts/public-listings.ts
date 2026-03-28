/**
 * Shared response shapes for public marketplace listing APIs (/api/jobs, /api/professionals).
 * Client code should unwrap axios with parseApiData() for consistent typing.
 */

export type PaginationMeta = {
  page: number;
  pageSize: number;
  limit?: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type JobListClient = {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  category: { id: string; name: string; slug: string } | null;
  client: {
    id: string;
    name: string | null;
    image: string | null;
    isVerified: boolean;
  };
  proposalCount: number;
  distanceKm: number | null;
};

export type JobsListPayload = {
  items: JobListClient[];
  pagination: PaginationMeta;
};

export type ProfessionalListItem = {
  id: string;
  name: string;
  image: string | null;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviews: number;
  completedJobs: number;
  memberSince: string;
  verified: boolean;
  verificationAccessGranted: boolean;
  visibilityBoostScore: number;
  subscription: {
    plan: string;
    isActive: boolean;
  };
  distance?: number;
};

export type ProfessionalsListPayload = {
  items: ProfessionalListItem[];
  pagination: PaginationMeta;
  meta?: {
    limited?: boolean;
    totalMatched?: number;
    processed?: number;
  };
};

/** Axios/fetch body: { success?: boolean; data?: T } or legacy unwrapped T */
export function parseApiData<T>(body: unknown): T {
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    const o = body as { success?: boolean; data?: T };
    if (o.data !== undefined) return o.data;
  }
  return body as T;
}

export function emptyPagination(page: number, pageSize: number): PaginationMeta {
  return {
    page,
    pageSize,
    total: 0,
    totalPages: 0,
    hasMore: false,
  };
}
