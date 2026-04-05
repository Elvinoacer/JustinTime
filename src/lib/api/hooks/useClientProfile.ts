import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../client";
import { toast } from "sonner";

export interface ClientProfileData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  role: string;
  roles: string[];
  preferredWorkspace: string | null;
  clientInterests: string[];
  createdAt: string;
}

export interface UpdateClientProfilePayload {
  name?: string;
  phone?: string | null;
  image?: string;
  clientInterests?: string[];
}

export const useClientProfile = () => {
  return useQuery<ClientProfileData>({
    queryKey: ["client", "profile"],
    queryFn: async () => {
      const response = await apiClient.get("/client/profile");
      return response.data as ClientProfileData;
    },
  });
};

export const useUpdateClientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateClientProfilePayload) => {
      const response = await apiClient.put("/client/profile", data);
      return response.data as ClientProfileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", "profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: unknown) => {
      const known = error as {
        data?: { error?: string };
        message?: string;
      };

      const errorMessage =
        known?.data?.error || known?.message || "Failed to update profile";
      toast.error(errorMessage);
    },
  });
};
