import { useMutation, useQueryClient } from "@tanstack/react-query";
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
