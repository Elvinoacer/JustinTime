import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { z } from "zod";
import {
  createJobSchema,
  quickCreateJobSchema,
} from "@/lib/validations/schemas";

type CreateJobInput = z.infer<typeof createJobSchema>;
type QuickCreateJobInput = z.infer<typeof quickCreateJobSchema> & {
  mode: "quick";
};
type CreateJobPayload = CreateJobInput | QuickCreateJobInput;

export interface JobDetail {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  location: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  maxApplicants: number | null;
  maxAcceptedProviders: number | null;
  acceptedProposalsCount?: number;
  effectiveMaxAcceptedProviders?: number;
  acceptanceSlotsRemaining?: number;
  acceptingMoreProviders?: boolean;
  images: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  client: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
    phone?: string | null;
    isVerified?: boolean;
  } | null;
  _count?: {
    proposals: number;
  };
}

export interface JobProposal {
  id: string;
  bookingId?: string | null;
  jobId: string;
  providerId: string;
  coverLetter: string;
  price: number;
  estimatedDays: number | null;
  attachments: string[] | null;
  status: string;
  latestStatusReason?: string | null;
  statusHistory?: Array<{
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    reason: string | null;
    changedByName: string | null;
    changedByRole: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  provider?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface SavedProposalTemplate {
  id: string;
  name: string;
  coverLetter: string;
  price: string | number;
  estimatedDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderTeamOption {
  id: string;
  name: string;
}

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJobPayload) => {
      const response = await apiClient.post("/jobs", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client", "dashboard", "jobs"],
      });
      queryClient.invalidateQueries({
        queryKey: ["client", "dashboard", "stats"],
      });
    },
  });
};

// Provider Jobs Hooks

// Fetch provider jobs based on tab
export function useProviderJobs(tab: string = "available", page: number = 1) {
  return useQuery({
    queryKey: ["provider-jobs", tab, page],
    queryFn: async () => {
      const response = await apiClient.get(
        `/provider/jobs?tab=${tab}&page=${page}&pageSize=10`,
      );
      return response.data;
    },
  });
}

export function useProviderTeams(enabled: boolean = true) {
  return useQuery<{ items: ProviderTeamOption[] }>({
    queryKey: ["provider-teams"],
    queryFn: async () => {
      const response = await apiClient.get("/provider/teams");
      return response.data;
    },
    enabled,
  });
}

// Fetch single job details
export function useJob(id: string) {
  return useQuery<JobDetail>({
    queryKey: ["job", id],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Submit a proposal to a job
export function useSubmitProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jobId: string;
      coverLetter: string;
      price: number;
      estimatedDays?: number;
      attachments?: string[];
    }) => {
      const response = await apiClient.post("/proposals", data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["job", variables.jobId] });
      queryClient.invalidateQueries({
        queryKey: ["job", variables.jobId, "proposals"],
      });
    },
  });
}

export function useJobProposals(jobId: string, enabled: boolean = true) {
  return useQuery<JobProposal[]>({
    queryKey: ["job", jobId, "proposals"],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${jobId}/proposals`);
      return response.data;
    },
    enabled: enabled && !!jobId,
    retry: false,
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
      queryClient.invalidateQueries({
        queryKey: ["proposal", variables.proposalId],
      });
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useProposalTemplates(enabled: boolean = true) {
  return useQuery<{ items: SavedProposalTemplate[] }>({
    queryKey: ["proposal-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/proposals/templates");
      return response.data;
    },
    enabled,
  });
}

export function useCreateProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      coverLetter: string;
      price: number;
      estimatedDays?: number | null;
    }) => {
      const response = await apiClient.post("/proposals/templates", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
    },
  });
}

export function useUpdateProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: {
        name?: string;
        coverLetter?: string;
        price?: number;
        estimatedDays?: number | null;
      };
    }) => {
      const response = await apiClient.patch(
        `/proposals/templates/${templateId}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
    },
  });
}

export function useDeleteProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.delete(`/proposals/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
    },
  });
}
