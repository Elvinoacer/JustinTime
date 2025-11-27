import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

// Fetch provider booking requests
export function useProviderRequests(status: string = "pending", page: number = 1) {
  return useQuery({
    queryKey: ["provider-requests", status, page],
    queryFn: async () => {
      const response = await apiClient.get(`/provider/requests?status=${status}&page=${page}&pageSize=10`);
      return response.data;
    },
  });
}

// Accept a booking request
export function useAcceptBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post(`/bookings/${bookingId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-requests"] });
    },
  });
}

// Reject a booking request
export function useRejectBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      const response = await apiClient.post(`/bookings/${bookingId}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-requests"] });
    },
  });
}
