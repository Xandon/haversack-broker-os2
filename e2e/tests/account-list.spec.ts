import { test, expect } from '../fixtures/auth.fixture';

async function navigateToAccounts(page: import('@playwright/test').Page): Promise<void> {
  // On mobile, open the nav first via hamburger menu
  const mobileMenuButton = page.getByLabel('Open navigation');
  if (await mobileMenuButton.isVisible().catch(() => false)) {
    await mobileMenuButton.click();
    await page.waitForTimeout(300);
  }

  // Click the Accounts link in the sidebar/nav
  const accountsLink = page.getByRole('link', { name: /accounts/i });
  await accountsLink.click();
  await page.waitForURL('**/accounts', { timeout: 10000 });
}

test.describe('Account List — Rep View', () => {
  test.beforeEach(async ({ loginAs, page }) => {
    await loginAs('rep1@haversack.test', 'RepPass123!');
    await navigateToAccounts(page);
  });

  test('FR-033a: /accounts page renders with header and create button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('FR-033b: page renders data table, empty state, or error state', async ({ page }) => {
    // Wait for either a table, empty state, or error state to appear
    const table = page.locator('table');
    const emptyState = page.getByText('No accounts');
    const errorState = page.getByText('Failed to load accounts');

    // One of these should be visible within 10 seconds
    await expect(table.or(emptyState).or(errorState).first()).toBeVisible({ timeout: 10000 });
  });

  test('FR-033c: filter controls are rendered', async ({ page }) => {
    // Search input
    await expect(page.getByPlaceholder('Search accounts...')).toBeVisible({ timeout: 10000 });

    // Territory filter
    await expect(page.getByLabel('Territory')).toBeVisible();

    // Account type filter
    await expect(page.getByLabel('Type')).toBeVisible();

    // Health score presets — use exact match to avoid matching "Clear All"
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Healthy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'At Risk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Needs Attention' })).toBeVisible();

    // Clear all button
    await expect(page.getByRole('button', { name: 'Clear All' })).toBeVisible();
  });

  test('FR-033c: clicking health score preset updates URL', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'At Risk' })).toBeVisible({ timeout: 10000 });

    // Click "At Risk" preset
    await page.getByRole('button', { name: 'At Risk' }).click();

    // URL should update with health score params
    await expect(page).toHaveURL(/healthScoreMin=0/, { timeout: 5000 });
    await expect(page).toHaveURL(/healthScoreMax=39/);
  });

  test('FR-033i: search input updates URL after debounce', async ({ page }) => {
    await expect(page.getByPlaceholder('Search accounts...')).toBeVisible({ timeout: 10000 });

    // Type a search query (must be >= 3 chars)
    await page.getByPlaceholder('Search accounts...').fill('Portland');

    // Wait for debounced search to update URL
    await expect(page).toHaveURL(/search=Portland/, { timeout: 5000 });
  });

  test('FR-033j: clear all resets filters and URL', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'At Risk' })).toBeVisible({ timeout: 10000 });

    // Apply a filter first
    await page.getByRole('button', { name: 'At Risk' }).click();
    await expect(page).toHaveURL(/healthScoreMin/, { timeout: 5000 });

    // Click "Clear All"
    await page.getByRole('button', { name: 'Clear All' }).click();

    // URL should be clean (no filter params)
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).not.toContain('healthScoreMin');
    expect(url).not.toContain('healthScoreMax');
  });
});

test.describe('Account List — Manager View', () => {
  test.beforeEach(async ({ loginAs, page }) => {
    await loginAs('manager@haversack.test', 'ManagerPass123!');
    await navigateToAccounts(page);
  });

  test('FR-033a: manager can view accounts page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible({ timeout: 10000 });
  });

  test('FR-033c: manager sees territory filter with all territories', async ({ page }) => {
    const territorySelect = page.getByLabel('Territory');
    await expect(territorySelect).toBeVisible({ timeout: 10000 });

    // Territory select should have "All Territories" option
    await expect(territorySelect.locator('option').first()).toHaveText('All Territories');
  });
});

test.describe('Account List — Error Handling', () => {
  test('FR-033h: unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/accounts');

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
