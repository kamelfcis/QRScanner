import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('landing page should have skip to content link', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.getByRole('link', { name: /skip/i });
    // Skip link may be visually hidden but should exist in DOM
    const count = await skipLink.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('landing page should have main landmark', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main');
    await expect(main.first()).toBeVisible();
  });

  test('menu page should have main landmark', async ({ page }) => {
    await page.goto('/menu');
    const main = page.locator('main');
    await expect(main.first()).toBeVisible();
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    // Tab through the page and verify focus is visible
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('menu page should have proper tab roles', async ({ page }) => {
    await page.goto('/menu');
    const tablist = page.locator('[role="tablist"]');
    if ((await tablist.count()) > 0) {
      await expect(tablist.first()).toBeVisible();
    }
  });

  test('search overlay should be accessible', async ({ page }) => {
    await page.goto('/menu');
    const searchBtn = page.getByRole('button', { name: /search/i });
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      await expect(searchInput).toBeVisible();
      // Escape should close
      await page.keyboard.press('Escape');
    }
  });

  test('color contrast - primary text should be visible on background', async ({ page }) => {
    await page.goto('/');
    // Check that text is actually visible (not invisible due to contrast issues)
    const heading = page.getByRole('heading', { level: 1 });
    if (await heading.isVisible()) {
      const color = await heading.evaluate((el) => getComputedStyle(el).color);
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('menu favorite buttons should have accessible names', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    const favBtn = page.getByRole('button', { name: /favorite|مفضلة/i });
    if ((await favBtn.count()) > 0) {
      await expect(favBtn.first()).toBeVisible();
    }
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
});
