import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmDialog } from './use-confirm-dialog';

describe('FR-031: useConfirmDialog hook', () => {
  test('US4-AC4: starts with dialog closed', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.options).toBeNull();
  });

  test('US4-AC4: opens dialog with options', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.open({
        title: 'Delete item?',
        description: 'This action cannot be undone.',
        variant: 'destructive',
      });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.options?.title).toBe('Delete item?');
    expect(result.current.options?.variant).toBe('destructive');
  });

  test('US4-AC4: onConfirm closes the dialog', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.open({
        title: 'Confirm',
        description: 'Are you sure?',
      });
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.onConfirm();
    });
    expect(result.current.isOpen).toBe(false);
  });

  test('US4-AC4: onCancel closes the dialog', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => {
      result.current.open({
        title: 'Confirm',
        description: 'Are you sure?',
      });
    });

    act(() => {
      result.current.onCancel();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
