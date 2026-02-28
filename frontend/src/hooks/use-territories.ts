import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Territory {
  id: string;
  name: string;
  region: string;
}

export function useTerritories(): ReturnType<typeof useQuery<Territory[]>> {
  return useQuery<Territory[]>({
    queryKey: ['territories'],
    queryFn: async () => {
      const response = await apiClient<{ data: Territory[] }>('/api/territories');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
