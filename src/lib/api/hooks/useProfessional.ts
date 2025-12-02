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
  certifications: any[];
  education: any[];
  memberSince: string;
  completedJobs: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  views: number;
  favorites: number;
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
    images: any;
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
