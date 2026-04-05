import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { ApiResponse, FilterParams } from "@/types/api";

// Job types
export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  location: string;
  clientId: string;
  providerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobProposal {
  id: string;
  jobId: string;
  providerId: string;
  amount: number;
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

// Get list of jobs
export function useJobs(
  filters?: FilterParams<Job>,
  options?: Omit<UseQueryOptions<Job[], Error>, "queryKey" | "queryFn">,
) {
  const queryFilters = filters as Record<string, unknown> | undefined;

  return useQuery<Job[], Error>({
    queryKey: queryKeys.jobs.list(queryFilters),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Job[]>>(
        API_ENDPOINTS.jobs.list,
        { params: filters },
      );
      return data.data;
    },
    ...options,
  });
}

// Get single job by ID
export function useJob(
  id: string,
  options?: Omit<UseQueryOptions<Job, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<Job, Error>({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Job>>(
        API_ENDPOINTS.jobs.byId(id),
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

// Get job proposals
export function useJobProposals(
  jobId: string,
  options?: Omit<UseQueryOptions<JobProposal[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<JobProposal[], Error>({
    queryKey: queryKeys.jobs.proposals(jobId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<JobProposal[]>>(
        API_ENDPOINTS.jobs.proposals(jobId),
      );
      return data.data;
    },
    enabled: !!jobId,
    ...options,
  });
}
