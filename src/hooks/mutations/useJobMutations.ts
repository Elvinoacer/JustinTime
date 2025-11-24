import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { ApiResponse } from "@/types/api";
import { Job, JobProposal } from "../queries/useJobs";

// Create job mutation
export function useCreateJob(
  options?: Omit<
    UseMutationOptions<Job, Error, Omit<Job, "id" | "createdAt" | "updatedAt">>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<Job, Error, Omit<Job, "id" | "createdAt" | "updatedAt">>({
    mutationFn: async (jobData) => {
      const { data } = await apiClient.post<ApiResponse<Job>>(
        API_ENDPOINTS.jobs.create,
        jobData
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
    ...options,
  });
}

// Update job mutation
export function useUpdateJob(
  options?: Omit<
    UseMutationOptions<Job, Error, { id: string; data: Partial<Job> }>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<Job, Error, { id: string; data: Partial<Job> }>({
    mutationFn: async ({ id, data: jobData }) => {
      const { data } = await apiClient.put<ApiResponse<Job>>(
        API_ENDPOINTS.jobs.update(id),
        jobData
      );
      return data.data;
    },
    onSuccess: (data) => {
      // Update cache for this specific job
      queryClient.setQueryData(queryKeys.jobs.detail(data.id), data);
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
    ...options,
  });
}

// Delete job mutation
export function useDeleteJob(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (jobId) => {
      await apiClient.delete(API_ENDPOINTS.jobs.delete(jobId));
    },
    onSuccess: (_, jobId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
    ...options,
  });
}

// Submit proposal mutation
export function useSubmitProposal(
  options?: Omit<
    UseMutationOptions<
      JobProposal,
      Error,
      { jobId: string; amount: number; message: string }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    JobProposal,
    Error,
    { jobId: string; amount: number; message: string }
  >({
    mutationFn: async ({ jobId, amount, message }) => {
      const { data } = await apiClient.post<ApiResponse<JobProposal>>(
        API_ENDPOINTS.jobs.submitProposal(jobId),
        { amount, message }
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate proposals for this job
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobs.proposals(variables.jobId),
      });
    },
    ...options,
  });
}
