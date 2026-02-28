import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UseGenerateLineCardResult {
  blob: Blob;
  filename: string;
}

export function useGenerateLineCard(): ReturnType<
  typeof useMutation<UseGenerateLineCardResult, Error, string>
> {
  return useMutation<UseGenerateLineCardResult, Error, string>({
    mutationFn: async (brandId) => {
      const response = await fetch(`/api/brands/${brandId}/line-card`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate line card');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="?(.+?)"?$/)?.[1] ?? 'line-card.pdf';
      return { blob, filename };
    },
  });
}

export interface ShareLineCardInput {
  brandId: string;
  accountId: string;
}

export function useShareLineCard(): ReturnType<
  typeof useMutation<{ success: boolean }, Error, ShareLineCardInput>
> {
  return useMutation<{ success: boolean }, Error, ShareLineCardInput>({
    mutationFn: async ({ brandId, accountId }) => {
      const response = await apiClient<{ success: boolean }>(
        `/api/brands/${brandId}/line-card/share`,
        {
          method: 'POST',
          body: JSON.stringify({ accountId }),
        },
      );
      return response;
    },
  });
}
