import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { z } from "zod";
import { createJobSchema } from "@/lib/validations/schemas";

type CreateJobInput = z.infer<typeof createJobSchema>;

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJobInput) => {
      const response = await apiClient.post("/jobs", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", "dashboard", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["client", "dashboard", "stats"] });
    },
  });
};

// Provider Jobs Hooks

// Fetch provider jobs based on tab
export function useProviderJobs(tab: string = "available", page: number = 1) {
  return useQuery({
    queryKey: ["provider-jobs", tab, page],
    queryFn: async () => {
      const response = await apiClient.get(`/provider/jobs?tab=${tab}&page=${page}&pageSize=10`);
      return response.data;
    },
  });
}

// Fetch single job details
export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Submit a proposal to a job
export function useSubmitProposal(jobId?: string, p0?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      jobId: string;
      coverLetter: string;
      price: number;
      estimatedDays?: number;
    }) => {
      const response = await apiClient.post("/proposals", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["job", data.jobId] });
    },
  });
}

// Withdraw a proposal
export function useWithdrawProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (proposalId: string) => {
      await apiClient.delete(`/proposals/${proposalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

// Get specific proposal details
export function useProposal(proposalId: string | null) {
  return useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: async () => {
      const response = await apiClient.get(`/proposals/${proposalId}`);
      return response.data;
    },
    enabled: !!proposalId,
  });
}

// Update a proposal
export function useUpdateProposal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      proposalId,
      data,
    }: {
      proposalId: string;
      data: { coverLetter?: string; price?: number };
    }) => {
      const response = await apiClient.patch(`/proposals/${proposalId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", variables.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
