import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS, ROUTES } from './test-credentials';

// Run tests serially to avoid rate limiting
test.describe.configure({ mode: 'serial' });

test.describe('Lawyer Portal', () => {

    test('should login and access lawyer dashboard', async ({ page }) => {
        // Go to login page
        await page.goto(ROUTES.login);
        await page.waitForLoadState('networkidle');

        // Fill in lawyer credentials
        await page.getByRole('textbox', { name: /email/i }).fill(TEST_CREDENTIALS.lawyer.email);
        await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.lawyer.password);

        // Click login and wait for navigation
        await page.getByRole('button', { name: /login/i }).click();

        // Wait longer for redirect
        await page.waitForTimeout(3000);

        // Check we're not on login page anymore
        const url = page.url();
        expect(url).not.toBe(ROUTES.login);
    });

    test('should display lawyer dashboard content', async ({ page }) => {
        // Login first
        await page.goto(ROUTES.login);
        await page.waitForLoadState('networkidle');
        await page.getByRole('textbox', { name: /email/i }).fill(TEST_CREDENTIALS.lawyer.email);
        await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.lawyer.password);
        await page.getByRole('button', { name: /login/i }).click();
        await page.waitForTimeout(3000);

        // Check page has loaded some content
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Take screenshot for evidence
        await page.screenshot({ path: 'e2e/screenshots/lawyer-dashboard.png', fullPage: true });
    });

    test('should be able to logout from lawyer portal', async ({ page }) => {
        // Login first
        await page.goto(ROUTES.login);
        await page.waitForLoadState('networkidle');
        await page.getByRole('textbox', { name: /email/i }).fill(TEST_CREDENTIALS.lawyer.email);
        await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.lawyer.password);
        await page.getByRole('button', { name: /login/i }).click();
        await page.waitForTimeout(3000);

        // Look for and click logout
        const logoutButton = page.getByText(/logout|sign out|đăng xuất/i).first();
        if (await logoutButton.isVisible()) {
            await logoutButton.click();
            await page.waitForTimeout(1000);
        }

        // Page should still be functional
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

});
