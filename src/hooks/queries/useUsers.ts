import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/queryKeys";
import { ApiResponse, FilterParams } from "@/types/api";

// User type (reusing from Prisma schema concept)
export interface User {
  id: string;
  name: string;
  email: string;
  role: "CLIENT" | "PROVIDER" | "ADMIN";
  avatar?: string;
  phone?: string;
  location?: string;
  verified: boolean;
  createdAt: string;
}

// Get current authenticated user
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<User, Error>({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<User>>(
        API_ENDPOINTS.users.me,
      );
      return data.data;
    },
    ...options,
  });
}

// Get list of users (admin only)
export function useUsers(
  filters?: FilterParams<User>,
  options?: Omit<UseQueryOptions<User[], Error>, "queryKey" | "queryFn">,
) {
  const queryFilters = filters as Record<string, unknown> | undefined;

  return useQuery<User[], Error>({
    queryKey: queryKeys.users.list(queryFilters),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<User[]>>(
        API_ENDPOINTS.users.list,
        { params: filters },
      );
      return data.data;
    },
    ...options,
  });
}

// Get single user by ID
export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<User, Error>({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<User>>(
        API_ENDPOINTS.users.byId(id),
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}
