import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form-field';

describe('FR-031: FormField composite pattern', () => {
  test('US3: renders label and children', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" type="email" />
      </FormField>,
    );
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  test('US3: shows required indicator when required', () => {
    render(
      <FormField label="Name" htmlFor="name" required>
        <input id="name" />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeDefined();
  });

  test('US3: shows description when provided and no error', () => {
    render(
      <FormField label="Email" htmlFor="email" description="Enter your work email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText('Enter your work email')).toBeDefined();
  });

  test('US3: shows error message and hides description', () => {
    render(
      <FormField label="Email" htmlFor="email" description="Enter your email" error="Invalid email format">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText('Invalid email format')).toBeDefined();
    expect(screen.queryByText('Enter your email')).toBeNull();
  });

  test('US3: error message has alert role for accessibility', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Required">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByRole('alert').textContent).toContain('Required');
  });
});
