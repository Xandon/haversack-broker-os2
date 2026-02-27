import { test, expect } from '../fixtures/auth.fixture';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('rep@haversack.test', 'TestPass123!');
  });

  test('FR-023: dashboard page renders with KPI cards', async ({ page }) => {
    await expect(page.getByText('Dashboard')).toBeVisible();

    // KPI cards should be visible (or their skeleton loaders)
    await expect(page.getByText('Current Month Revenue')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Trailing 12-Month Revenue')).toBeVisible();
    await expect(page.getByText('Activities This Period')).toBeVisible();
    await expect(page.getByText('Open Opportunities')).toBeVisible();
  });

  test('FR-023: dashboard shows commission section', async ({ page }) => {
    await expect(page.getByText('Commission This Month')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Commission YTD')).toBeVisible();
  });

  test('FR-023: dashboard shows account health section', async ({ page }) => {
    await expect(page.getByText('Account Health')).toBeVisible({ timeout: 10000 });
  });

  test('FR-023: period selector is available', async ({ page }) => {
    const selector = page.locator('select');
    await expect(selector).toBeVisible();

    // Should have the expected options
    await expect(selector.locator('option')).toHaveCount(5);
  });

  test('FR-023: changing period selector refreshes data', async ({ page }) => {
    const selector = page.locator('select');
    await selector.selectOption('last_month');

    // Data should refresh — KPI cards should still be visible
    await expect(page.getByText('Current Month Revenue')).toBeVisible({ timeout: 10000 });
  });

  test('FR-023: critical accounts section renders', async ({ page }) => {
    await expect(page.getByText('Critical Accounts')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - Manager View', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('manager@haversack.test', 'TestPass123!');
  });

  test('FR-024: managers see team dashboard', async ({ page }) => {
    await expect(page.getByText('Team Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('FR-024: team dashboard shows aggregate KPIs', async ({ page }) => {
    await expect(page.getByText('Total Revenue')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Orders')).toBeVisible();
    await expect(page.getByText('Active Reps')).toBeVisible();
  });

  test('FR-024: team dashboard shows rep rankings table', async ({ page }) => {
    // Rep rankings header should appear once data loads
    await expect(page.getByText('Rep Rankings')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Revenue')).toBeVisible();
  });
});
