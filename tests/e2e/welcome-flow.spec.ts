import { test, expect } from '@playwright/test';

test.describe('QR Welcome Flow', () => {
  test('QR welcome URL shows delivery only (not dine-in or takeaway)', async ({ page }) => {
    await page.goto('/welcome?table=12');
    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByTestId('welcome-delivery')).toBeVisible();
    await expect(page.getByTestId('welcome-dine-in')).toHaveCount(0);
    await expect(page.getByTestId('welcome-takeaway')).toHaveCount(0);
    await expect(page.getByText(/12/)).toBeVisible();
  });

  test('Delivery navigates with mode=takeaway and preserves reference', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/welcome?table=12');
    await Promise.all([
      page.waitForURL(/\/menu\?.*mode=takeaway/, { timeout: 60_000 }),
      page.getByTestId('welcome-delivery').click(),
    ]);
    await expect(page).toHaveURL(/table=12/);
  });

  test('mobile layout shows a single delivery card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/welcome');
    await expect(page.getByTestId('welcome-delivery')).toBeVisible();
    await expect(page.getByTestId('welcome-dine-in')).toHaveCount(0);
  });

  test('desktop layout still shows only delivery', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/welcome');
    await expect(page.getByTestId('welcome-delivery')).toBeVisible();
    await expect(page.getByTestId('welcome-takeaway')).toHaveCount(0);
  });
});
