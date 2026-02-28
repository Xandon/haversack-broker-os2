'use client';

import type { CreateContactInput, UpdateContactInput } from '@haversack/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface Contact {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary: boolean;
  optOutEmail: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactListResponse {
  data: Contact[];
}

interface ContactResponse {
  data: Contact;
}

export function useContacts(accountId: string) {
  return useQuery<ContactListResponse>({
    queryKey: ['contacts', accountId],
    queryFn: () => apiClient.get(`/api/accounts/${accountId}/contacts`),
    enabled: !!accountId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      apiClient.post<ContactResponse>('/api/contacts', input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateContact(contactId: string, accountId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateContactInput) =>
      apiClient.patch<ContactResponse>(`/api/contacts/${contactId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', accountId] });
    },
  });
}

export function useDeleteContact(accountId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => apiClient.delete(`/api/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', accountId] });
    },
  });
}
