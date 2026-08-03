import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics');
  });

  test('should load analytics page', async ({ page }) => {
    await expect(page).toHaveURL(/.*analytics/);
  });

  test('should display overview tab by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
  });

  test('should have date range picker', async ({ page }) => {
    await expect(page.getByRole('button', { name: /7 days|30 days|1 year/i }).first()).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    const productsTab = page.getByRole('tab', { name: /products/i });
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('should change date range', async ({ page }) => {
    const thirtyDays = page.getByRole('button', { name: /30 days/i });
    if (await thirtyDays.isVisible()) {
      await thirtyDays.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Heatmaps Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics/heatmaps');
  });

  test('should load heatmaps page', async ({ page }) => {
    await expect(page).toHaveURL(/.*heatmaps/);
  });

  test('should display peak hours section', async ({ page }) => {
    await expect(page.getByText(/peak hours/i)).toBeVisible();
  });

  test('should display peak days section', async ({ page }) => {
    await expect(page.getByText(/peak days/i)).toBeVisible();
  });
});

test.describe('Insights Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/analytics/insights');
  });

  test('should load insights page', async ({ page }) => {
    await expect(page).toHaveURL(/.*insights/);
  });

  test('should display trending dishes section', async ({ page }) => {
    await expect(page.getByText(/trending dishes/i)).toBeVisible();
  });
});

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/reports');
  });

  test('should load reports page', async ({ page }) => {
    await expect(page).toHaveURL(/.*reports/);
  });

  test('should display report summary', async ({ page }) => {
    await expect(page.getByText(/report summary/i)).toBeVisible();
  });

  test('should have export buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /csv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /excel/i })).toBeVisible();
  });
});
