import { test, expect } from '../fixtures/auth.fixture';

test.describe('Authentication', () => {
  test('FR-026: login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('Haversack')).toBeVisible();
  });

  test('FR-026: shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@test.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('FR-026: shows validation error for empty email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email')).toBeVisible();
  });

  test('FR-026: successful login redirects to dashboard', async ({ loginAs }) => {
    // This test requires a running backend with seeded data
    // Skip if no backend available
    await loginAs('rep@haversack.test', 'TestPass123!');
  });

  test('FR-026: unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login when not authenticated
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('FR-026: logout clears session', async ({ page, loginAs }) => {
    await loginAs('rep@haversack.test', 'TestPass123!');

    // Click logout button
    await page.getByTitle('Sign out').click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
