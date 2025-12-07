import { test, expect } from '@playwright/test';

test.describe('VietJusticIA Web Portal', () => {

    test('should load the login page with correct heading', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check the page heading
        const heading = page.locator('h1');
        await expect(heading).toContainText('VietJusticIA');
    });

    test('should display login form elements', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check login form elements exist
        const emailInput = page.getByRole('textbox', { name: /email/i });
        const loginButton = page.getByRole('button', { name: /login/i });

        await expect(emailInput).toBeVisible();
        await expect(loginButton).toBeVisible();
    });

    test('should show validation when clicking login without credentials', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click login without entering credentials
        const loginButton = page.getByRole('button', { name: /login/i });
        await loginButton.click();

        // Wait for validation
        await page.waitForTimeout(500);

        // Login button should still be visible (not navigated away)
        await expect(loginButton).toBeVisible();
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
        // Start with mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Heading should still be visible on mobile
        const heading = page.locator('h1');
        await expect(heading).toBeVisible();
    });

    test('should have visible input fields', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check form has input fields
        const emailInput = page.getByRole('textbox', { name: /email/i });
        const passwordInput = page.locator('input[type="password"]');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
    });

    test('should allow typing in form fields', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Type in email field
        const emailInput = page.getByRole('textbox', { name: /email/i });
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');

        // Type in password field
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('TestPassword123');
        await expect(passwordInput).toHaveValue('TestPassword123');
    });

});
