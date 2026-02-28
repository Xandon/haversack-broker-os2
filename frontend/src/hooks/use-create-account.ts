import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateAccountInput } from '@haversack/shared';

export interface CreateAccountResponse {
  data: {
    id: string;
    name: string;
    accountType: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    territoryId: string;
    parentAccountId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export function useCreateAccount(): ReturnType<
  typeof useMutation<CreateAccountResponse, Error, CreateAccountInput>
> {
  const queryClient = useQueryClient();

  return useMutation<CreateAccountResponse, Error, CreateAccountInput>({
    mutationFn: async (input) => {
      const response = await apiClient<CreateAccountResponse>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
