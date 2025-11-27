import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import { toast } from "sonner";

export const useClientProfile = () => {
  return useQuery({
    queryKey: ["client", "profile"],
    queryFn: async () => {
      const response = await apiClient.get("/client/profile");
      return response.data;
    },
  });
};

export const useUpdateClientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put("/client/profile", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", "profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || "Failed to update profile";
      toast.error(errorMessage);
    },
  });
};
