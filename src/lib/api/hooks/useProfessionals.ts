import { useQuery } from "@tanstack/react-query";

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
}

interface UseProfessionalsParams {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  verifiedOnly?: boolean;
}

export const useProfessionals = (params?: UseProfessionalsParams) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.minPrice) queryParams.append("minPrice", params.minPrice.toString());
  if (params?.maxPrice) queryParams.append("maxPrice", params.maxPrice.toString());
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.verifiedOnly) queryParams.append("verifiedOnly", "true");

  return useQuery<{ data: Professional[] }>({
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
