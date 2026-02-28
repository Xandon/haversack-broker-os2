import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchTrigger } from './search-trigger';

describe('FR-032: SearchTrigger component', () => {
  it('FR-032: renders search icon and button', () => {
    render(<SearchTrigger onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /open search/i })).toBeDefined();
  });

  it('FR-032: fires onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<SearchTrigger onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: /open search/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('FR-032: displays keyboard shortcut hint', () => {
    render(<SearchTrigger onClick={vi.fn()} />);
    const kbd = screen.getByText(/K/);
    expect(kbd).toBeDefined();
  });

  it('FR-032: has accessible label', () => {
    render(<SearchTrigger onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Open search');
  });
});
