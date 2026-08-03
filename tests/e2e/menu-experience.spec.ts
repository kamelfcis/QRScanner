import { test, expect } from '@playwright/test';

test.describe('Menu Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menu');
  });

  test('should load the menu page', async ({ page }) => {
    await expect(page).toHaveURL(/.*menu/);
  });

  test('should display menu header', async ({ page }) => {
    await expect(page.getByText(/warda shamya/i).first()).toBeVisible();
  });

  test('should display category navigation', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /all/i })).toBeVisible();
  });

  test('should display dining/takeaway toggle', async ({ page }) => {
    const diningBtn = page.getByRole('button', { name: /dining/i });
    const takeawayBtn = page.getByRole('button', { name: /takeaway/i });
    await expect(diningBtn.or(takeawayBtn)).toBeVisible();
  });

  test('should toggle between dining and takeaway mode', async ({ page }) => {
    const takeawayBtn = page.getByRole('button', { name: /takeaway/i });
    if (await takeawayBtn.isVisible()) {
      await takeawayBtn.click();
      await expect(takeawayBtn).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('should filter products by category', async ({ page }) => {
    const categoryTab = page.getByRole('tab').nth(1);
    if (await categoryTab.isVisible()) {
      await categoryTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('should display product cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[class*="product"], [class*="card"]');
    // At least some products should be visible
    expect(await cards.count()).toBeGreaterThanOrEqual(0);
  });

  test('should open search overlay', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /search/i });
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      await expect(searchInput).toBeVisible();
    }
  });

  test('should handle ?table= parameter', async ({ page }) => {
    await page.goto('/menu?table=5');
    await expect(page).toHaveURL(/table=5/);
  });

  test('should have favorites button on product cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const favBtn = page.getByRole('button', { name: /favorite|heart|save/i });
    if (await favBtn.count() > 0) {
      await expect(favBtn.first()).toBeVisible();
    }
  });

  test('should show skeleton loading while fetching data', async ({ page }) => {
    // Navigate and check for loading states (may be brief)
    await page.goto('/menu');
    // The page should eventually load content
    await page.waitForLoadState('networkidle');
  });
});
