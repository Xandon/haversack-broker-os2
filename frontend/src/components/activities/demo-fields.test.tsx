import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { DemoFields, type DemoEntry } from './demo-fields';

describe('FR-036: DemoFields', () => {
  test('FR-036: renders empty state when no demos', () => {
    const onChange = vi.fn();
    render(createElement(DemoFields, { demos: [], onChange }));

    expect(screen.getByText('Add at least one product for this demo activity.')).toBeDefined();
  });

  test('FR-036: renders Add Product button', () => {
    const onChange = vi.fn();
    render(createElement(DemoFields, { demos: [], onChange }));

    expect(screen.getByText('Add Product')).toBeDefined();
  });

  test('FR-036: adds a demo entry when Add Product is clicked', () => {
    const onChange = vi.fn();
    render(createElement(DemoFields, { demos: [], onChange }));

    fireEvent.click(screen.getByText('Add Product'));

    expect(onChange).toHaveBeenCalledWith([
      { productId: '', quantitySampled: undefined, buyerFeedback: '', outcome: undefined },
    ]);
  });

  test('FR-036: renders demo fields for each entry', () => {
    const demos: DemoEntry[] = [
      { productId: 'p1', quantitySampled: 5, buyerFeedback: 'Great taste', outcome: 'positive' },
    ];
    const onChange = vi.fn();
    render(createElement(DemoFields, { demos, onChange }));

    expect(screen.getByText('Product 1')).toBeDefined();
    expect(screen.getByText('Remove')).toBeDefined();
    expect(screen.getByLabelText('Quantity Sampled')).toBeDefined();
    expect(screen.getByLabelText('Outcome')).toBeDefined();
    expect(screen.getByLabelText('Buyer Feedback')).toBeDefined();
  });

  test('FR-036: removes a demo entry when Remove is clicked', () => {
    const demos: DemoEntry[] = [
      { productId: 'p1', quantitySampled: 5, buyerFeedback: 'Good', outcome: 'positive' },
    ];
    const onChange = vi.fn();
    render(createElement(DemoFields, { demos, onChange }));

    fireEvent.click(screen.getByText('Remove'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  test('FR-036: has outcome options (Positive, Neutral, Negative)', () => {
    const demos: DemoEntry[] = [{ productId: 'p1' }];
    const onChange = vi.fn();
    render(createElement(DemoFields, { demos, onChange }));

    expect(screen.getByText('Positive')).toBeDefined();
    expect(screen.getByText('Neutral')).toBeDefined();
    expect(screen.getByText('Negative')).toBeDefined();
  });
});
