'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface OrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  revenue_model: 'broker' | 'wholesale';
  commission_rate: number | null;
  promo_applied: boolean;
  lot_number: string | null;
  batch_id: string | null;
  notes: string | null;
}

export interface VendorSubOrder {
  id: string;
  order_number: string;
  vendor_brand: { id: string; name: string } | null;
  subtotal: number;
  item_count: number;
}

export interface Order {
  id: string;
  order_number: string;
  account_id: string;
  account?: { id: string; name: string };
  rep_id: string;
  rep?: { id: string; first_name: string; last_name: string };
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  approval_required: boolean;
  approved_by_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  confirmed_at: string | null;
  exported_at: string | null;
  notes: string | null;
  items?: OrderItem[];
  vendor_sub_orders?: VendorSubOrder[];
  created_at: string;
  updated_at: string;
}

export interface OrderListFilters {
  page?: number;
  per_page?: number;
  account_id?: string;
  rep_id?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateOrderPayload {
  account_id: string;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price?: number;
    revenue_model?: 'broker' | 'wholesale';
    lot_number?: string;
    batch_id?: string;
    notes?: string;
  }[];
}

interface OrderListResponse {
  data: Order[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface OrderResponse {
  data: Order;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  brand: { id: string; name: string } | null;
  category: string;
  unit_price: number;
  wholesale_price: number | null;
  case_size: string | null;
  availability_status: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  certifications: string[];
  revenue_model: 'broker' | 'wholesale';
  promo_price: number | null;
  promo_active: boolean;
  promo_end_date: string | null;
  image_url: string | null;
}

interface ProductSearchResponse {
  data: ProductSearchResult[];
  total_count: number;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const ORDER_KEYS = {
  all: ['orders'] as const,
  lists: () => [...ORDER_KEYS.all, 'list'] as const,
  list: (filters: OrderListFilters) => [...ORDER_KEYS.lists(), filters] as const,
  details: () => [...ORDER_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORDER_KEYS.details(), id] as const,
  pendingApproval: () => [...ORDER_KEYS.all, 'pending-approval'] as const,
} as const;

const PRODUCT_KEYS = {
  all: ['products'] as const,
  search: (query: string) => [...PRODUCT_KEYS.all, 'search', query] as const,
} as const;

// -------------------------------------------------------------------
// useOrders — paginated order list
// -------------------------------------------------------------------

interface UseOrdersResult {
  orders: Order[];
  pagination: OrderListResponse['pagination'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useOrders(filters: OrderListFilters = {}): UseOrdersResult {
  const query = useQuery<OrderListResponse, Error>({
    queryKey: ORDER_KEYS.list(filters),
    queryFn: async (): Promise<OrderListResponse> => {
      const params = new URLSearchParams();
      if (filters.page != null) params.set('page', String(filters.page));
      if (filters.per_page != null) params.set('per_page', String(filters.per_page));
      if (filters.account_id) params.set('account_id', filters.account_id);
      if (filters.rep_id) params.set('rep_id', filters.rep_id);
      if (filters.status) params.set('status', filters.status);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);

      const queryString = params.toString();
      const path = queryString ? `/api/orders?${queryString}` : '/api/orders';
      return apiClient.get<OrderListResponse>(path);
    },
  });

  return {
    orders: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useOrder — single order detail
// -------------------------------------------------------------------

interface UseOrderResult {
  order: Order | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useOrder(id: string): UseOrderResult {
  const query = useQuery<OrderResponse, Error>({
    queryKey: ORDER_KEYS.detail(id),
    queryFn: async (): Promise<OrderResponse> => {
      return apiClient.get<OrderResponse>(`/api/orders/${id}`);
    },
    enabled: id.length > 0,
  });

  return {
    order: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// usePendingApproval — orders awaiting approval
// -------------------------------------------------------------------

interface UsePendingApprovalResult {
  orders: Order[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function usePendingApproval(): UsePendingApprovalResult {
  const query = useQuery<OrderListResponse, Error>({
    queryKey: ORDER_KEYS.pendingApproval(),
    queryFn: async (): Promise<OrderListResponse> => {
      return apiClient.get<OrderListResponse>('/api/orders/pending-approval');
    },
  });

  return {
    orders: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useCreateOrder — mutation for creating an order
// -------------------------------------------------------------------

interface UseCreateOrderResult {
  createOrder: (payload: CreateOrderPayload) => void;
  createOrderAsync: (payload: CreateOrderPayload) => Promise<OrderResponse>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: OrderResponse | undefined;
}

export function useCreateOrder(): UseCreateOrderResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<OrderResponse, Error, CreateOrderPayload>({
    mutationFn: async (payload: CreateOrderPayload): Promise<OrderResponse> => {
      return apiClient.post<OrderResponse>('/api/orders', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
    },
  });

  return {
    createOrder: mutation.mutate,
    createOrderAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}

// -------------------------------------------------------------------
// useApproveOrder — mutation for approving an order
// -------------------------------------------------------------------

interface UseApproveOrderResult {
  approveOrder: (id: string, notes?: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useApproveOrder(): UseApproveOrderResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<OrderResponse, Error, { id: string; notes?: string }>({
    mutationFn: async ({ id, notes }): Promise<OrderResponse> => {
      return apiClient.post<OrderResponse>(`/api/orders/${id}/approve`, { notes });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.pendingApproval() });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
  });

  return {
    approveOrder: (id: string, notes?: string) => mutation.mutate({ id, notes }),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useRejectOrder — mutation for rejecting an order
// -------------------------------------------------------------------

interface UseRejectOrderResult {
  rejectOrder: (id: string, reason: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useRejectOrder(): UseRejectOrderResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<OrderResponse, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }): Promise<OrderResponse> => {
      return apiClient.post<OrderResponse>(`/api/orders/${id}/reject`, { reason });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.pendingApproval() });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
  });

  return {
    rejectOrder: (id: string, reason: string) => mutation.mutate({ id, reason }),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useConfirmOrder — mutation for confirming an order
// -------------------------------------------------------------------

interface UseConfirmOrderResult {
  confirmOrder: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useConfirmOrder(): UseConfirmOrderResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<OrderResponse, Error, string>({
    mutationFn: async (id: string): Promise<OrderResponse> => {
      return apiClient.post<OrderResponse>(`/api/orders/${id}/confirm`);
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(id) });
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
    },
  });

  return {
    confirmOrder: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useProductSearch — search products for order entry
// -------------------------------------------------------------------

interface UseProductSearchResult {
  products: ProductSearchResult[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProductSearch(query: string, enabled = true): UseProductSearchResult {
  const result = useQuery<ProductSearchResponse, Error>({
    queryKey: PRODUCT_KEYS.search(query),
    queryFn: async (): Promise<ProductSearchResponse> => {
      const params = new URLSearchParams({ q: query });
      return apiClient.get<ProductSearchResponse>(`/api/products/search?${params}`);
    },
    enabled: enabled && query.length >= 1,
  });

  return {
    products: result.data?.data ?? [],
    totalCount: result.data?.total_count ?? 0,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
}
