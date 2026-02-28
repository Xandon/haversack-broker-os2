import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationDialog } from './confirmation-dialog';

describe('FR-031: ConfirmationDialog composite pattern', () => {
  const defaultProps = {
    title: 'Delete Account',
    description: 'Are you sure you want to delete this account?',
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  test('US3-AC6: renders title and description when open', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByText('Delete Account')).toBeDefined();
    expect(screen.getByText('Are you sure you want to delete this account?')).toBeDefined();
  });

  test('US3-AC6: does not render content when closed', () => {
    render(<ConfirmationDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Delete Account')).toBeNull();
  });

  test('US3-AC6: calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  test('US3-AC6: calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmationDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test('US3-AC6: renders custom button labels', () => {
    render(
      <ConfirmationDialog {...defaultProps} confirmLabel="Yes, delete" cancelLabel="No, keep it" />,
    );
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'No, keep it' })).toBeDefined();
  });
});
