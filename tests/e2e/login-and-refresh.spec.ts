import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL || 'ktphinhin9999@hotmail.com';
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD || '0vn5p5';

test.describe('Login and Refresh', () => {
  test('user can login and persist session after page refresh', async ({ page }) => {
    // 1. Go to login page
    await page.goto('/login');
    await expect(page.locator('text=08 Reels')).toBeVisible();

    // 2. Fill login form
    await page.getByPlaceholder('name@example.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);

    // 3. Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 4. Wait for redirect to dashboard — look for the dashboard header "專案影片"
    await expect(page.locator('text=專案影片')).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);

    // 5. Record current URL before refresh
    const urlBeforeRefresh = page.url();

    // 6. Refresh the page
    await page.reload();

    // 7. After refresh, should still see the dashboard (not redirected to login)
    await expect(page.locator('text=專案影片')).toBeVisible({ timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);

    // 8. Verify URL is the same as before refresh
    expect(page.url()).toBe(urlBeforeRefresh);

    // 9. Verify sidebar is present (user is still authenticated)
    await expect(page.locator('text=Reels 08')).toBeVisible();
  });
});
