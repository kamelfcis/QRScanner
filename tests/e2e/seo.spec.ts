import { test, expect } from '@playwright/test';

test.describe('SEO & Metadata', () => {
  test('should have proper title on landing page', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('Warda Shamya');
  });

  test('should have proper title on menu page', async ({ page }) => {
    await page.goto('/menu');
    const title = await page.title();
    expect(title).toContain('Menu');
  });

  test('should have meta description on landing page', async ({ page }) => {
    await page.goto('/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
  });

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });

  test('should have Twitter card tags', async ({ page }) => {
    await page.goto('/');
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(twitterCard).toBeTruthy();
  });

  test('should have canonical URL', async ({ page }) => {
    await page.goto('/');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
  });

  test('should have viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
  });

  test('should have lang attribute on html', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('should have Schema.org structured data on landing page', async ({ page }) => {
    await page.goto('/');
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    // Only one h1 should exist
    expect(await h1.count()).toBe(1);
  });
});
