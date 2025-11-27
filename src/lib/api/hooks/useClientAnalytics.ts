import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

// Types
export interface AnalyticsOverview {
  spending: {
    total: number;
    average: number;
    byCategory: { category: string; amount: number }[];
    byStatus: { status: string; amount: number; count: number }[];
  };
  jobs: {
    total: number;
    byStatus: { status: string; count: number }[];
    avgProposals: number;
    completionRate: number;
    avgTimeToHire: number;
  };
  providers: {
    unique: number;
    repeatHireRate: number;
    avgRating: number;
    topProviders: {
      id: string;
      name: string;
      jobsCompleted: number;
      avgRating: number;
    }[];
  };
}

export interface AnalyticsTrends {
  jobsPosted: { date: string; count: number }[];
  spending: { date: string; amount: number }[];
  proposals: { date: string; count: number }[];
}

// Hooks
export const useAnalyticsOverview = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["client", "analytics", "overview", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const { data } = await apiClient.get<AnalyticsOverview>(
        `/client/analytics/overview?${params.toString()}`
      );
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAnalyticsTrends = (
  startDate: string,
  endDate: string,
  interval: "day" | "week" | "month" = "day"
) => {
  return useQuery({
    queryKey: ["client", "analytics", "trends", startDate, endDate, interval],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        interval,
      });

      const { data } = await apiClient.get<AnalyticsTrends>(
        `/client/analytics/trends?${params.toString()}`
      );
      return data;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
