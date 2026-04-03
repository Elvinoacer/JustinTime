import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

// Types
export interface DashboardStat {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: string;
  color: string;
}

export interface DashboardActivity {
  id: string;
  type: "PROPOSAL" | "JOB_COMPLETED" | "PAYMENT";
  title: string;
  desc: string;
  time: string;
  icon: string;
  color: string;
}

export interface DashboardJob {
  id: string;
  title: string;
  budget: string; // Decimal as string
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  _count: {
    proposals: number;
  };
  createdAt: string;
}

// Hooks
export const useClientStats = () => {
  return useQuery({
    queryKey: ["client", "dashboard", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ stats: DashboardStat[] }>(
        "/client/dashboard/stats",
      );
      return data.stats;
    },
  });
};

export const useClientActivity = () => {
  return useQuery({
    queryKey: ["client", "dashboard", "activity"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ activities: DashboardActivity[] }>(
        "/client/dashboard/activity",
      );
      return data.activities;
    },
  });
};

export const useClientJobs = (limit = 5) => {
  return useQuery({
    queryKey: ["client", "dashboard", "jobs", limit],
    queryFn: async () => {
      const { data } = await apiClient.get<{ jobs: DashboardJob[] }>(
        `/client/jobs?limit=${limit}`,
      );
      return data.jobs;
    },
  });
};
