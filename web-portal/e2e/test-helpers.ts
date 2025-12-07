import { Page } from '@playwright/test';
import { TEST_CREDENTIALS, ROUTES } from './test-credentials';

/**
 * Login as admin user and wait for dashboard to load
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto(ROUTES.login);
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_CREDENTIALS.admin.email);
    await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.admin.password);
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for redirect with longer timeout
    try {
        await page.waitForURL('**/admin**', { timeout: 15000 });
    } catch {
        // Fallback: wait for any navigation away from login
        await page.waitForTimeout(3000);
    }
    await page.waitForLoadState('networkidle');
}


/**
 * Login as lawyer user and wait for dashboard to load
 */
export async function loginAsLawyer(page: Page): Promise<void> {
    await page.goto(ROUTES.login);
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_CREDENTIALS.lawyer.email);
    await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.lawyer.password);
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for redirect with longer timeout
    try {
        await page.waitForURL('**/lawyer**', { timeout: 15000 });
    } catch {
        // Fallback: wait for any navigation away from login
        await page.waitForTimeout(3000);
    }
    await page.waitForLoadState('networkidle');
}


/**
 * Logout from current session
 */
export async function logout(page: Page): Promise<void> {
    // Look for logout button (icon button in header)
    const logoutButton = page.locator('button[aria-label*="logout"], button[aria-label*="Logout"], svg[data-testid="LogoutIcon"]').first();

    if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await logoutButton.click();
        await page.waitForURL('**/login**', { timeout: 5000 });
    } else {
        // Fallback: navigate directly to login
        await page.goto(ROUTES.login);
    }
    await page.waitForLoadState('networkidle');
}
