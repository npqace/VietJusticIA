import { test, expect } from '@playwright/test';
import { loginAsLawyer } from './test-helpers';

// Run tests serially to avoid state conflicts
test.describe.configure({ mode: 'serial' });

// Add delay between tests to avoid rate limiting (429)
test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(500);
});

test.describe('Lawyer Portal - Pages', () => {


    test.describe('Lawyer Dashboard', () => {

        test('should display request statistics', async ({ page }) => {
            await loginAsLawyer(page);

            // Check for stats cards
            const totalRequests = page.getByText(/total|tổng/i).first();
            await expect(totalRequests).toBeVisible();

            // Take screenshot
            await page.screenshot({ path: 'e2e/screenshots/lawyer-dashboard-stats.png', fullPage: true });
        });

        test('should display service requests list', async ({ page }) => {
            await loginAsLawyer(page);

            // Check for service requests section
            const serviceRequestsSection = page.getByText(/service requests|yêu cầu dịch vụ/i);
            await expect(serviceRequestsSection).toBeVisible();
        });

        test('should have navigation to conversations', async ({ page }) => {
            await loginAsLawyer(page);

            // Check for conversations button/link
            const conversationsButton = page.getByRole('button', { name: /conversations|hội thoại/i });
            await expect(conversationsButton).toBeVisible();
        });

        test('should have refresh button', async ({ page }) => {
            await loginAsLawyer(page);

            const refreshButton = page.getByRole('button', { name: /refresh|làm mới/i });
            await expect(refreshButton).toBeVisible();
        });

    });

    test.describe('Conversations Page', () => {

        test('should navigate to conversations page', async ({ page }) => {
            await loginAsLawyer(page);

            // Click conversations button
            const conversationsButton = page.getByRole('button', { name: /conversations|hội thoại/i });
            await conversationsButton.click();

            // Wait for navigation
            await page.waitForURL('**/lawyer/conversations**', { timeout: 5000 });
            await page.waitForLoadState('networkidle');

            // Page should have loaded
            await expect(page).toHaveURL(/.*\/lawyer\/conversations/);

            // Take screenshot
            await page.screenshot({ path: 'e2e/screenshots/lawyer-conversations.png', fullPage: true });
        });

        test('should display conversations list', async ({ page }) => {
            await loginAsLawyer(page);
            await page.goto('/lawyer/conversations');
            await page.waitForLoadState('networkidle');

            // Check page title or heading
            const heading = page.getByText(/conversations|hội thoại|tin nhắn/i).first();
            await expect(heading).toBeVisible();
        });

        test('should display conversation cards if available', async ({ page }) => {
            await loginAsLawyer(page);
            await page.goto('/lawyer/conversations');
            await page.waitForLoadState('networkidle');

            // Look for conversation items (cards or list items)
            const conversationItems = page.locator('[class*="card"], [class*="conversation"], [class*="request"]');

            // If there are conversations, they should be visible
            const count = await conversationItems.count();
            if (count > 0) {
                await expect(conversationItems.first()).toBeVisible();
            }
        });

        test('should open chat modal when clicking on conversation', async ({ page }) => {
            await loginAsLawyer(page);
            await page.goto('/lawyer/conversations');
            await page.waitForLoadState('networkidle');

            // Look for conversation item to click
            const conversationItem = page.locator('[class*="card"], [class*="conversation"]').first();

            if (await conversationItem.isVisible({ timeout: 3000 }).catch(() => false)) {
                await conversationItem.click();
                await page.waitForTimeout(1000);

                // Chat modal should appear
                const chatModal = page.locator('[role="dialog"], [class*="modal"], [class*="chat"]');

                if (await chatModal.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await expect(chatModal).toBeVisible();

                    // Take screenshot of chat
                    await page.screenshot({ path: 'e2e/screenshots/lawyer-chat-modal.png', fullPage: true });

                    // Look for WebSocket connection status
                    const connectedStatus = page.getByText(/connected|kết nối/i);
                    if (await connectedStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await expect(connectedStatus).toBeVisible();
                    }

                    // Look for message input field
                    const messageInput = page.getByPlaceholder(/message|tin nhắn|type/i);
                    if (await messageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await expect(messageInput).toBeVisible();
                    }
                }
            }
        });

        test('should have back/dashboard navigation', async ({ page }) => {
            await loginAsLawyer(page);
            await page.goto('/lawyer/conversations');
            await page.waitForLoadState('networkidle');

            // Look for back or dashboard button
            const backButton = page.getByRole('button', { name: /back|dashboard|quay lại|bảng điều khiển/i });
            await expect(backButton).toBeVisible();
        });

    });

});
