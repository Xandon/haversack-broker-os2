import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useDebounce } from '@/hooks/use-debounce';
import type { GlobalSearchResult } from '@haversack/shared';

interface AccountSearchResponse {
  data: Array<{
    id: string;
    name: string;
    territoryId: string;
    territory?: { name: string };
  }>;
}

interface ContactSearchResponse {
  data: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    accountId: string;
    accountName: string;
  }>;
}

interface ProductSearchResponse {
  data: Array<{
    id: string;
    name: string;
    sku: string;
  }>;
}

export interface GlobalSearchResults {
  accounts: GlobalSearchResult[];
  contacts: GlobalSearchResult[];
  products: GlobalSearchResult[];
  isLoading: boolean;
  isError: boolean;
}

export function useGlobalSearch(query: string): GlobalSearchResults {
  const debouncedQuery = useDebounce(query, 300);
  const enabled = debouncedQuery.length >= 2;

  const accountsQuery = useQuery<GlobalSearchResult[]>({
    queryKey: ['search', 'accounts', debouncedQuery],
    queryFn: async () => {
      const response = await apiClient<AccountSearchResponse>(
        `/api/accounts?search=${encodeURIComponent(debouncedQuery)}&limit=5`,
      );
      return response.data.map((account) => ({
        type: 'account' as const,
        id: account.id,
        name: account.name,
        secondaryText: account.territory?.name ?? '',
        url: `/accounts/${account.id}`,
      }));
    },
    enabled,
  });

  const contactsQuery = useQuery<GlobalSearchResult[]>({
    queryKey: ['search', 'contacts', debouncedQuery],
    queryFn: async () => {
      const response = await apiClient<ContactSearchResponse>(
        `/api/contacts/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`,
      );
      return response.data.map((contact) => ({
        type: 'contact' as const,
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        secondaryText: contact.email ?? contact.phone ?? '',
        url: `/accounts/${contact.accountId}?tab=contacts`,
        parentId: contact.accountId,
      }));
    },
    enabled,
  });

  const productsQuery = useQuery<GlobalSearchResult[]>({
    queryKey: ['search', 'products', debouncedQuery],
    queryFn: async () => {
      const response = await apiClient<ProductSearchResponse>(
        `/api/products/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`,
      );
      return response.data.map((product) => ({
        type: 'product' as const,
        id: product.id,
        name: product.name,
        secondaryText: product.sku,
        url: `/products/${product.id}`,
      }));
    },
    enabled,
  });

  return {
    accounts: accountsQuery.data ?? [],
    contacts: contactsQuery.data ?? [],
    products: productsQuery.data ?? [],
    isLoading: accountsQuery.isLoading || contactsQuery.isLoading || productsQuery.isLoading,
    isError: accountsQuery.isError && contactsQuery.isError && productsQuery.isError,
  };
}
