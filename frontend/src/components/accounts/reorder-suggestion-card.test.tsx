/**
 * Tests for ReorderSuggestionCard component.
 * Verifies FR-018, FR-035, FR-036 at the UI layer.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReorderSuggestionCard } from './reorder-suggestion-card';

// -------------------------------------------------------------------
// Mock hooks
// -------------------------------------------------------------------

const mockUseReorderSuggestion = vi.fn();
const mockUseSubmitReorder = vi.fn();

vi.mock('@/hooks/use-ai', () => ({
  useReorderSuggestion: (...args: unknown[]) => mockUseReorderSuggestion(...args),
  useSubmitReorder: () => mockUseSubmitReorder(),
}));

// -------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------

const SUGGESTION_WITH_ITEMS = {
  account_id: 'acc-1',
  account_name: 'Pacific Bistro',
  ai_generated: true,
  ai_label: 'AI-Generated',
  suggestion: {
    items: [
      {
        product_id: 'prod-1',
        product_name: 'Organic Wildflower Honey 12oz',
        sku: 'BEE-HON-12',
        brand_name: "Bee's Best Honey",
        suggested_quantity: 24,
        unit_price: 8.5,
        line_total: 204.0,
        reasoning: 'Ordered 24 units monthly',
      },
      {
        product_id: 'prod-2',
        product_name: 'Artisan Hot Sauce 5oz',
        sku: 'NWS-HTS-05',
        brand_name: 'NW Spice Co',
        suggested_quantity: 12,
        unit_price: 6.75,
        line_total: 81.0,
        reasoning: 'Trending up',
      },
    ],
    estimated_total: 285.0,
    based_on_orders: 8,
    analysis_period_months: 12,
  },
  generated_at: '2026-02-24T14:30:00Z',
};

const NOT_ENOUGH_HISTORY = {
  account_id: 'acc-1',
  account_name: 'New Restaurant',
  ai_generated: false,
  suggestion: null,
  message:
    'Not enough order history for suggestions — reorder suggestions appear after 6 orders',
  current_order_count: 3,
};

const DEFAULT_SUBMIT = {
  submitReorder: vi.fn(),
  submitReorderAsync: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined,
};

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T113: ReorderSuggestionCard', () => {
  it('FR-018: renders suggestion items when account has 6+ orders', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    expect(screen.getByText('Suggested Reorder')).toBeDefined();
    expect(screen.getByText('Organic Wildflower Honey 12oz')).toBeDefined();
    expect(screen.getByText('Artisan Hot Sauce 5oz')).toBeDefined();
    expect(screen.getByText('Based on 8 orders')).toBeDefined();
  });

  it('FR-035: displays AI-Generated label', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    expect(screen.getByText('AI-Generated')).toBeDefined();
  });

  it('FR-018: shows "not enough history" message for < 6 orders', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: NOT_ENOUGH_HISTORY,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    expect(
      screen.getByText(/Not enough order history for suggestions/),
    ).toBeDefined();
  });

  it('FR-036: shows unavailable message on AI error', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: undefined,
      isLoading: false,
      isError: true,
      error: new Error('503 Service Unavailable'),
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    expect(
      screen.getByText(/AI service temporarily unavailable/),
    ).toBeDefined();
  });

  it('FR-018: renders loading skeleton while fetching', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    const { container } = render(<ReorderSuggestionCard accountId="acc-1" />);

    // Should have skeleton loaders
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-018: allows modifying quantity', async () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    const quantityInputs = screen.getAllByRole('spinbutton');
    expect(quantityInputs.length).toBe(2);

    // First input should show 24 (honey)
    expect((quantityInputs[0] as HTMLInputElement).value).toBe('24');
  });

  it('FR-018: allows removing items', async () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    expect(removeButtons.length).toBe(2);

    const user = userEvent.setup();
    await user.click(removeButtons[0]!);

    // After removal, only 1 product row should remain
    expect(screen.queryByText('Organic Wildflower Honey 12oz')).toBeNull();
    expect(screen.getByText('Artisan Hot Sauce 5oz')).toBeDefined();
  });

  it('FR-018: calls submitReorder on submit button click', async () => {
    const mockSubmit = vi.fn();
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue({
      ...DEFAULT_SUBMIT,
      submitReorder: mockSubmit,
    });

    render(<ReorderSuggestionCard accountId="acc-1" />);

    const submitButton = screen.getByRole('button', { name: /Submit as Order/i });
    const user = userEvent.setup();
    await user.click(submitButton);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'acc-1',
        items: expect.arrayContaining([
          expect.objectContaining({ product_id: 'prod-1' }),
          expect.objectContaining({ product_id: 'prod-2' }),
        ]),
      }),
    );
  });

  it('FR-018: shows success state after order submission', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue({
      ...DEFAULT_SUBMIT,
      isSuccess: true,
    });

    render(<ReorderSuggestionCard accountId="acc-1" />);

    expect(
      screen.getByText(/Order created successfully/),
    ).toBeDefined();
  });

  it('FR-018: displays estimated total', () => {
    mockUseReorderSuggestion.mockReturnValue({
      suggestion: SUGGESTION_WITH_ITEMS,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseSubmitReorder.mockReturnValue(DEFAULT_SUBMIT);

    render(<ReorderSuggestionCard accountId="acc-1" />);

    // $285.00 = (24 * 8.50) + (12 * 6.75)
    expect(screen.getByText('$285.00')).toBeDefined();
  });
});
