import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DuplicateMatch {
  id: string;
  name: string;
  accountType: string;
  territory: { id: string; name: string };
  confidence: number;
  matchType: string;
}

export interface DuplicateCheckResponse {
  data: {
    hasDuplicates: boolean;
    matches: DuplicateMatch[];
  };
}

export function useCheckDuplicates(): ReturnType<
  typeof useMutation<DuplicateCheckResponse, Error, string>
> {
  return useMutation<DuplicateCheckResponse, Error, string>({
    mutationFn: async (name) => {
      const params = new URLSearchParams({ name });
      const response = await apiClient<DuplicateCheckResponse>(
        `/api/accounts/check-duplicates?${params.toString()}`,
      );
      return response;
    },
  });
}
