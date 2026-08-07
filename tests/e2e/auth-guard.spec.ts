import { test, expect } from '@playwright/test';

test.describe('Dashboard auth guard', () => {
  test('unauthenticated /dashboard should redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toMatch(/redirect=/);
  });

  test('unauthenticated /dashboard/analytics should redirect to login', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
