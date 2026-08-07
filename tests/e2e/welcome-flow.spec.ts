import { test, expect } from '@playwright/test';

test.describe('QR Welcome Flow', () => {
  test('QR welcome URL shows mode picker (not menu)', async ({ page }) => {
    await page.goto('/welcome?table=12');
    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByTestId('welcome-dine-in')).toBeVisible();
    await expect(page.getByTestId('welcome-takeaway')).toBeVisible();
    await expect(page.getByText(/12/)).toBeVisible();
  });

  test('Dine In navigates with mode=dine_in and preserves table', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/welcome?table=12');
    await Promise.all([
      page.waitForURL(/\/menu\?.*mode=dine_in/, { timeout: 60_000 }),
      page.getByTestId('welcome-dine-in').click(),
    ]);
    await expect(page).toHaveURL(/table=12/);
  });

  test('Takeaway navigates with mode=takeaway and preserves table', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/welcome?table=7');
    await Promise.all([
      page.waitForURL(/\/menu\?.*mode=takeaway/, { timeout: 60_000 }),
      page.getByTestId('welcome-takeaway').click(),
    ]);
    await expect(page).toHaveURL(/table=7/);
  });

  test('refresh keeps selected mode from localStorage', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/welcome?table=3');
    await Promise.all([
      page.waitForURL(/\/menu/, { timeout: 60_000 }),
      page.getByTestId('welcome-takeaway').click(),
    ]);

    await page.reload();
    await page.waitForLoadState('networkidle');

    const takeawayBtn = page.getByRole('button', { name: /takeaway/i });
    await expect(takeawayBtn.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('user can change mode from menu header', async ({ page }) => {
    await page.goto('/menu?mode=dine_in&table=2');
    await page.waitForLoadState('networkidle');

    const diningBtn = page.getByRole('button', { name: /dining/i }).first();
    await expect(diningBtn).toHaveAttribute('aria-pressed', 'true');

    const takeawayBtn = page.getByRole('button', { name: /takeaway/i }).first();
    await takeawayBtn.click();
    await expect(takeawayBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(diningBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('legacy mode=dining deep link still works', async ({ page }) => {
    await page.goto('/menu?table=3&mode=dining');
    await page.waitForLoadState('networkidle');
    const diningBtn = page.getByRole('button', { name: /dining/i }).first();
    await expect(diningBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('mobile layout shows welcome cards stacked', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/welcome');
    await expect(page.getByTestId('welcome-dine-in')).toBeVisible();
    await expect(page.getByTestId('welcome-takeaway')).toBeVisible();
  });

  test('desktop layout shows welcome cards side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/welcome');
    const dineIn = page.getByTestId('welcome-dine-in');
    const takeaway = page.getByTestId('welcome-takeaway');
    await expect(dineIn).toBeVisible();
    await expect(takeaway).toBeVisible();

    const dineBox = await dineIn.boundingBox();
    const takeBox = await takeaway.boundingBox();
    expect(dineBox).toBeTruthy();
    expect(takeBox).toBeTruthy();
    // Side-by-side: cards share similar Y, different X
    expect(Math.abs(dineBox!.y - takeBox!.y)).toBeLessThan(40);
    expect(Math.abs(dineBox!.x - takeBox!.x)).toBeGreaterThan(50);
  });
});
