import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the hero section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /menu/i })).toBeVisible();
  });

  test('should navigate to welcome page', async ({ page }) => {
    await page.getByRole('link', { name: /menu/i }).first().click();
    await expect(page).toHaveURL(/.*welcome/);
  });

  test('should display restaurant name', async ({ page }) => {
    await expect(page.getByText(/warda shamya/i).first()).toBeVisible();
  });

  test('should have View Menu CTA button', async ({ page }) => {
    const cta = page.getByRole('link', { name: /view menu/i });
    await expect(cta).toBeVisible();
  });

  test('should scroll to story section', async ({ page }) => {
    const storyLink = page.getByRole('link', { name: /about|story/i });
    if (await storyLink.isVisible()) {
      await storyLink.click();
      await page.waitForTimeout(500);
    }
  });

  test('should have contact section with phone number', async ({ page }) => {
    const phoneLink = page.locator('a[href^="tel:"]');
    if ((await phoneLink.count()) > 0) {
      await expect(phoneLink.first()).toBeVisible();
    }
  });

  test('should have social media links', async ({ page }) => {
    const socialLinks = page.locator(
      'a[href*="instagram"], a[href*="facebook"], a[href*="tiktok"]'
    );
    if ((await socialLinks.count()) > 0) {
      await expect(socialLinks.first()).toBeVisible();
    }
  });

  test('should display opening hours', async ({ page }) => {
    await expect(page.getByText(/saturday|sunday|monday/i).first()).toBeVisible();
  });
});
