import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { ApiResponse } from "@/types/api";
import { User } from "../queries/useUsers";

// Update profile mutation
export function useUpdateProfile(
  options?: Omit<
    UseMutationOptions<User, Error, Partial<User>>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<User, Error, Partial<User>>({
    mutationFn: async (userData) => {
      const { data } = await apiClient.put<ApiResponse<User>>(
        API_ENDPOINTS.users.update("me"),
        userData
      );
      return data.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch current user
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() });
      queryClient.setQueryData(queryKeys.auth.currentUser(), data);
    },
    ...options,
  });
}

// Upload avatar mutation
export function useUploadAvatar(
  options?: Omit<
    UseMutationOptions<string, Error, File>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("avatar", file);

      const { data } = await apiClient.post<ApiResponse<{ url: string }>>(
        API_ENDPOINTS.users.uploadAvatar,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return data.data.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() });
    },
    ...options,
  });
}

// Update password mutation
export function useUpdatePassword(
  options?: Omit<
    UseMutationOptions<void, Error, { currentPassword: string; newPassword: string }>,
    "mutationFn"
  >
) {
  return useMutation<void, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: async (passwords) => {
      await apiClient.put("/users/password", passwords);
    },
    ...options,
  });
}
