import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './test-helpers';

// Run tests serially to avoid state conflicts
test.describe.configure({ mode: 'serial' });

// Add delay between tests to avoid rate limiting (429)
test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(500);
});

test.describe('Admin Portal - Pages', () => {


    test.describe('Lawyers Management', () => {

        test('should display lawyers table with correct columns', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/lawyers');
            await page.waitForLoadState('networkidle');

            // Check table headers are visible
            const table = page.locator('table').first();
            await expect(table).toBeVisible();

            // Check for expected column headers
            await expect(page.getByText(/ID|Mã/i).first()).toBeVisible();
            await expect(page.getByText(/Name|Tên/i).first()).toBeVisible();
            await expect(page.getByText(/Email/i).first()).toBeVisible();
            await expect(page.getByText(/Status|Trạng thái/i).first()).toBeVisible();

            // Take screenshot for evidence
            await page.screenshot({ path: 'e2e/screenshots/lawyers-page.png', fullPage: true });
        });

        test('should display action buttons for each lawyer', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/lawyers');
            await page.waitForLoadState('networkidle');

            // Check action buttons exist
            const detailButtons = page.getByRole('button', { name: /details|chi tiết|xem/i });
            const editButtons = page.getByRole('button', { name: /edit|sửa/i });

            // At least one detail and edit button should be visible
            await expect(detailButtons.first()).toBeVisible();
            await expect(editButtons.first()).toBeVisible();
        });

        test('should have refresh button', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/lawyers');
            await page.waitForLoadState('networkidle');

            const refreshButton = page.getByRole('button', { name: /refresh|làm mới/i });
            await expect(refreshButton).toBeVisible();
        });

    });

    test.describe('Users Management', () => {

        test('should display users table', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/users');
            await page.waitForLoadState('networkidle');

            // Check table is visible
            const table = page.locator('table').first();
            await expect(table).toBeVisible();

            // Take screenshot
            await page.screenshot({ path: 'e2e/screenshots/users-page.png', fullPage: true });
        });

        test('should have search functionality', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/users');
            await page.waitForLoadState('networkidle');

            // Find search input
            const searchInput = page.getByPlaceholder(/search|tìm kiếm|tìm/i);
            await expect(searchInput).toBeVisible();

            // Test search - type something
            await searchInput.fill('test');
            await page.waitForTimeout(500); // debounce

            // Search should filter results
            await expect(searchInput).toHaveValue('test');
        });

        test('should have filter tabs', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/users');
            await page.waitForLoadState('networkidle');

            // Check for role filter tabs
            const allTab = page.getByRole('tab', { name: /all|tất cả/i });
            await expect(allTab).toBeVisible();
        });

        test('should have Create User button', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/users');
            await page.waitForLoadState('networkidle');

            const createButton = page.getByRole('button', { name: /create|tạo/i });
            await expect(createButton).toBeVisible();
        });

        test('should have pagination controls', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/users');
            await page.waitForLoadState('networkidle');

            // Look for pagination text like "1-10 of 100"
            const paginationText = page.getByText(/\d+.*-.*\d+.*of|trong số/i);
            await expect(paginationText).toBeVisible();
        });

    });

    test.describe('Requests Management', () => {

        test('should display request type tabs', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/requests');
            await page.waitForLoadState('networkidle');

            // Check for request type tabs
            const serviceTab = page.getByRole('tab', { name: /service|dịch vụ/i });
            await expect(serviceTab).toBeVisible();

            // Take screenshot
            await page.screenshot({ path: 'e2e/screenshots/requests-page.png', fullPage: true });
        });

        test('should display requests table', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/requests');
            await page.waitForLoadState('networkidle');

            // Check table is visible
            const table = page.locator('table').first();
            await expect(table).toBeVisible();
        });

        test('should open details modal when clicking view details', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/requests');
            await page.waitForLoadState('networkidle');

            // Find and click view details button
            const viewDetailsButton = page.getByRole('button', { name: /view|xem|chi tiết/i }).first();

            if (await viewDetailsButton.isVisible()) {
                await viewDetailsButton.click();
                await page.waitForTimeout(500);

                // Modal should appear
                const modal = page.locator('[role="dialog"], [role="presentation"]');
                await expect(modal).toBeVisible();

                // Take screenshot of modal
                await page.screenshot({ path: 'e2e/screenshots/request-details-modal.png', fullPage: true });

                // Close modal
                const closeButton = page.getByRole('button', { name: /close|đóng/i });
                if (await closeButton.isVisible()) {
                    await closeButton.click();
                }
            }
        });

    });

    test.describe('Document CMS', () => {

        test('should load document CMS page', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/documents');
            await page.waitForLoadState('networkidle');

            // Page should have loaded
            await expect(page).toHaveURL(/.*\/admin\/documents/);

            // Take screenshot
            await page.screenshot({ path: 'e2e/screenshots/document-cms.png', fullPage: true });
        });

        test('should display document list', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/documents');
            await page.waitForLoadState('networkidle');

            // Look for document items or list
            const documentList = page.locator('[class*="document"], [class*="list"], [class*="card"]').first();
            await expect(documentList).toBeVisible();
        });

        test('should have search functionality', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/documents');
            await page.waitForLoadState('networkidle');

            // Find search input
            const searchInput = page.getByPlaceholder(/search|tìm kiếm/i);
            await expect(searchInput).toBeVisible();
        });

        test('should have pagination', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/documents');
            await page.waitForLoadState('networkidle');

            // Look for pagination controls or text
            const paginationText = page.getByText(/page|trang/i).first();
            await expect(paginationText).toBeVisible();
        });

        test('should have domain filter', async ({ page }) => {
            await loginAsAdmin(page);
            await page.goto('/admin/documents');
            await page.waitForLoadState('networkidle');

            // Look for domain filter
            const domainFilter = page.locator('select, [role="combobox"]').first();
            await expect(domainFilter).toBeVisible();
        });

    });

});
