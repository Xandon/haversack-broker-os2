import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ContactItem } from '@/hooks/use-account-detail';

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  isPrimary?: boolean;
}

interface ContactResponse {
  data: ContactItem;
}

export function useCreateContact(): ReturnType<
  typeof useMutation<
    ContactResponse,
    Error,
    { accountId: string; input: CreateContactInput }
  >
> {
  const queryClient = useQueryClient();

  return useMutation<
    ContactResponse,
    Error,
    { accountId: string; input: CreateContactInput }
  >({
    mutationFn: async ({ accountId, input }) => {
      const response = await apiClient<ContactResponse>(
        `/api/accounts/${accountId}/contacts`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      );
      return response;
    },
    onSuccess: (_data, { accountId }) => {
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
    },
  });
}

export function useUpdateContact(): ReturnType<
  typeof useMutation<
    ContactResponse,
    Error,
    { accountId: string; contactId: string; input: UpdateContactInput }
  >
> {
  const queryClient = useQueryClient();

  return useMutation<
    ContactResponse,
    Error,
    { accountId: string; contactId: string; input: UpdateContactInput }
  >({
    mutationFn: async ({ accountId, contactId, input }) => {
      const response = await apiClient<ContactResponse>(
        `/api/accounts/${accountId}/contacts/${contactId}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      );
      return response;
    },
    onSuccess: (_data, { accountId }) => {
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
    },
  });
}

export function useDeleteContact(): ReturnType<
  typeof useMutation<void, Error, { accountId: string; contactId: string }>
> {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { accountId: string; contactId: string }>({
    mutationFn: async ({ accountId, contactId }) => {
      await apiClient<void>(
        `/api/accounts/${accountId}/contacts/${contactId}`,
        { method: 'DELETE' },
      );
    },
    onSuccess: (_data, { accountId }) => {
      void queryClient.invalidateQueries({ queryKey: ['accounts', accountId] });
    },
  });
}
