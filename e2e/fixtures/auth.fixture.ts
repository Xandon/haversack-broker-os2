import { test as base } from '@playwright/test';

export interface AuthFixtures {
  loginAs: (email: string, password: string) => Promise<void>;
}

export const test = base.extend<AuthFixtures>({
  loginAs: async ({ page }, use) => {
    const loginFn = async (email: string, password: string): Promise<void> => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    };
    await use(loginFn);
  },
});

export { expect } from '@playwright/test';
