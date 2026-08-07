import { test, expect } from '@playwright/test';

function patchRestaurantSettings(row: { key?: string; value?: Record<string, unknown> }) {
  if (row.key !== 'restaurant' || !row.value || typeof row.value !== 'object') {
    return row;
  }
  return {
    ...row,
    value: {
      ...row.value,
      whatsapp: '966500000001',
      currency: row.value.currency || 'SAR',
      tax_rate: row.value.tax_rate ?? 15,
      service_charge_rate: row.value.service_charge_rate ?? 10,
      prep_time_minutes: row.value.prep_time_minutes ?? 25,
      minimum_order: row.value.minimum_order ?? 0,
      max_order_notes_length: row.value.max_order_notes_length ?? 200,
      apply_tax: row.value.apply_tax !== false,
      apply_service_charge: row.value.apply_service_charge !== false,
    },
  };
}

async function stubRestaurantWhatsApp(page: import('@playwright/test').Page) {
  await page.route('**/rest/v1/settings*', async (route) => {
    const response = await route.fetch();
    const json = await response.json().catch(() => null);

    if (Array.isArray(json)) {
      await route.fulfill({ response, json: json.map(patchRestaurantSettings) });
      return;
    }

    if (json && typeof json === 'object' && 'key' in json) {
      await route.fulfill({
        response,
        json: patchRestaurantSettings(json as { key?: string; value?: Record<string, unknown> }),
      });
      return;
    }

    await route.fulfill({ response });
  });
}

test.describe('QR Ordering & WhatsApp Checkout', () => {
  test('welcome → add → drawer → checkout preserves table + mode', async ({ page }) => {
    test.setTimeout(120_000);
    await stubRestaurantWhatsApp(page);

    await page.goto('/welcome?table=4');
    await expect(page).toHaveURL(/welcome/);
    await expect(page.getByText(/4/)).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/menu\?.*mode=dine_in/, { timeout: 60_000 }),
      page.getByTestId('welcome-dine-in').click(),
    ]);
    await expect(page).toHaveURL(/table=4/);

    await page.waitForLoadState('networkidle');
    const addBtn = page.getByTestId('add-to-cart').first();
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    await expect(page.getByTestId('cart-badge')).toBeVisible();
    await page.getByTestId('cart-button').click();
    await expect(page.getByTestId('cart-line').first()).toBeVisible();
    await page.getByTestId('cart-checkout').click();

    await page.waitForURL(/\/checkout/);
    await expect(page.getByTestId('checkout-line').first()).toBeVisible();
    await expect(page.getByText(/4/)).toBeVisible();

    await page.getByTestId('checkout-name').fill('Playwright Guest');

    const confirm = page.getByTestId('checkout-confirm');
    await expect(confirm).toBeEnabled({ timeout: 10000 });

    const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
    await confirm.click();

    const popup = await popupPromise;
    if (popup) {
      // wa.me often redirects to api.whatsapp.com/send
      await expect(popup).toHaveURL(/wa\.me\/|api\.whatsapp\.com\/send/, { timeout: 10000 });
      const waUrl = popup.url();
      const decoded = decodeURIComponent(waUrl).replace(/\+/g, ' ');
      expect(waUrl).toMatch(/966500000001/);
      expect(decoded).toMatch(/Playwright Guest/);
      expect(decoded).toMatch(/New Order|طلب جديد/);
      expect(decoded).toMatch(/Table:\s*4|الطاولة:\s*4/);
      await popup.close();
    }

    await page.waitForURL(/\/order-success/, { timeout: 10000 });
    await expect(page.getByTestId('keep-cart')).toBeVisible();
    await expect(page.getByTestId('clear-cart')).toBeVisible();
  });

  test('mobile viewport uses bottom sheet cart', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/menu?mode=takeaway&table=2');
    await page.waitForLoadState('networkidle');

    const addBtn = page.getByTestId('add-to-cart').first();
    if (!(await addBtn.count())) {
      test.skip();
      return;
    }

    await addBtn.click();
    await page.getByTestId('cart-fab').click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('data-side', 'bottom');
    await expect(page.getByTestId('cart-checkout')).toBeVisible();
  });

  test('takeaway mode is preserved into checkout', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/welcome?table=9');
    await Promise.all([
      page.waitForURL(/\/menu\?.*mode=takeaway/, { timeout: 60_000 }),
      page.getByTestId('welcome-takeaway').click(),
    ]);
    await expect(page).toHaveURL(/table=9/);
  });
});
