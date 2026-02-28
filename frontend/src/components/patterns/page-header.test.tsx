import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

describe('FR-031: PageHeader composite pattern', () => {
  test('US3: renders title', () => {
    render(<PageHeader title="Accounts" />);
    expect(screen.getByRole('heading', { name: 'Accounts' })).toBeDefined();
  });

  test('US3: renders description', () => {
    render(<PageHeader title="Accounts" description="Manage your customer accounts." />);
    expect(screen.getByText('Manage your customer accounts.')).toBeDefined();
  });

  test('US3: renders breadcrumbs', () => {
    render(
      <PageHeader
        title="Account Detail"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Accounts', href: '/accounts' },
          { label: 'Acme Corp' },
        ]}
      />,
    );
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
  });

  test('US3: renders breadcrumb links as anchors', () => {
    render(
      <PageHeader
        title="Detail"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Current' }]}
      />,
    );
    const homeLink = screen.getByText('Home');
    expect(homeLink.tagName).toBe('A');
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  test('US3: renders actions slot', () => {
    render(
      <PageHeader
        title="Accounts"
        actions={<button type="button">Add Account</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Account' })).toBeDefined();
  });
});
