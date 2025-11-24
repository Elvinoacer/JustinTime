import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';

// Provider Stats Hook
export function useProviderStats() {
  return useQuery({
    queryKey: ['provider', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/provider/stats');
      return response.data;
    },
  });
}
// Provider Profile Hook
export function useProviderProfile() {
  return useQuery({
    queryKey: ['provider', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get('/provider/profile');
      return response.data;
    },
  });
}

// Update Provider Profile Hook
export function useUpdateProviderProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put('/provider/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'profile'] });
    },
  });
}

// Provider Earnings Chart Hook
export function useProviderEarningsChart() {
  return useQuery({
    queryKey: ['provider', 'earnings', 'chart'],
    queryFn: async () => {
      const response = await apiClient.get('/provider/earnings/chart');
      return response.data;
    },
  });
}

// Provider Activities Hook
export function useProviderActivities() {
  return useQuery({
    queryKey: ['provider', 'activities'],
    queryFn: async () => {
      const response = await apiClient.get('/provider/activities');
      return response.data;
    },
  });
}

// Provider Services Hook
export function useProviderServices() {
  return useQuery({
    queryKey: ['provider', 'services'],
    queryFn: async () => {
      const response = await apiClient.get('/provider/services');
      return response.data;
    },
  });
}

// Create Service Hook
export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/provider/services', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'services'] });
    },
  });
}

// Update Service Hook
export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/provider/services?id=${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'services'] });
    },
  });
}

// Delete Service Hook
export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/provider/services?id=${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'services'] });
    },
  });
}

// Provider Bookings Hook
export function useProviderBookings(status?: string) {
  return useQuery({
    queryKey: ['provider', 'bookings', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await apiClient.get(`/provider/bookings${params}`);
      return response.data;
    },
  });
}

// Provider Earnings Hook
export function useProviderEarnings(range?: string) {
  return useQuery({
    queryKey: ['provider', 'earnings', range],
    queryFn: async () => {
      const params = range ? `?range=${range}` : '';
      const response = await apiClient.get(`/provider/earnings${params}`);
      return response.data;
    },
  });
}

// Provider Reviews Hook
export function useProviderReviews() {
  return useQuery({
    queryKey: ['provider', 'reviews'],
    queryFn: async () => {
      const response = await apiClient.get('/provider/reviews');
      return response.data;
    },
  });
}
