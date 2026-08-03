import { test, expect } from '@playwright/test';

test.describe('QR Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@wardashamya.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should load QR management page', async ({ page }) => {
    await page.goto('/dashboard/qr');
    await expect(page.getByRole('heading', { name: /QR Codes/i })).toBeVisible();
  });

  test('should show empty state when no QR codes', async ({ page }) => {
    await page.goto('/dashboard/qr');
    await expect(page.getByText(/No QR codes yet/i)).toBeVisible();
  });

  test('should open create QR dialog', async ({ page }) => {
    await page.goto('/dashboard/qr');
    await page.click('button:has-text("Create QR Code")');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Create QR Code', { exact: true }).last()).toBeVisible();
  });

  test('should have QR form fields', async ({ page }) => {
    await page.goto('/dashboard/qr');
    await page.click('button:has-text("Create QR Code")');
    await expect(page.getByLabel('QR Code Name')).toBeVisible();
    await expect(page.getByLabel('Menu URL')).toBeVisible();
  });

  test('should show template options', async ({ page }) => {
    await page.goto('/dashboard/qr');
    await page.click('button:has-text("Create QR Code")');
    await expect(page.getByText('Classic', { exact: true })).toBeVisible();
    await expect(page.getByText('Luxury', { exact: true })).toBeVisible();
    await expect(page.getByText('Minimal', { exact: true })).toBeVisible();
    await expect(page.getByText('Golden', { exact: true })).toBeVisible();
    await expect(page.getByText('Dark', { exact: true })).toBeVisible();
  });
});
