import { useQuery } from "@tanstack/react-query";

export interface ProfessionalDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  bio: string | null;
  skills: string[];
  hourlyRate: number;
  isVerified: boolean;
  certifications: unknown[];
  education: unknown[];
  socialLinks: { platform: string; url: string }[];
  memberSince: string;
  completedJobs: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  views: number;
  favorites: number;
  subscription?: {
    plan: string;
    isActive: boolean;
  } | null;
  ratingDistribution: {
    stars: number;
    count: number;
  }[];
  services: {
    id: string;
    title: string;
    description: string | null;
    categoryId: string;
    price: number;
    pricingUnit: string;
    images: unknown;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
}

export const useProfessional = (id: string) => {
  return useQuery<{ data: ProfessionalDetail }>({
    queryKey: ["professional", id],
    queryFn: async () => {
      const response = await fetch(`/api/professionals/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch professional");
      }
      return response.json();
    },
    enabled: !!id,
  });
};
