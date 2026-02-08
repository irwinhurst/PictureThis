import { test, expect } from '@playwright/test';

test.describe('Game Server', () => {
  test('health check endpoint should return ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
  });

  test('should serve the main page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // Check page title
    const title = await page.title();
    expect(title).toBe('PictureThis Game Server');
  });

  test('should have Socket.io library loaded on main page', async ({ page }) => {
    await page.goto('/');
    
    // Check if Socket.io client library is available
    const socketIoLoaded = await page.evaluate(() => {
      return typeof (window as any).io !== 'undefined';
    });
    
    expect(socketIoLoaded).toBe(true);
  });

  test('should display connection status info', async ({ page }) => {
    await page.goto('/');
    
    // Check for status elements
    const connectionStatus = page.locator('#connection-status');
    await expect(connectionStatus).toBeVisible();
  });

  test('should have test action buttons', async ({ page }) => {
    await page.goto('/');
    
    // Check for test buttons
    const testJoinBtn = page.locator('#test-join');
    const testDisconnectBtn = page.locator('#test-disconnect');
    
    await expect(testJoinBtn).toBeVisible();
    await expect(testDisconnectBtn).toBeVisible();
  });

  test('WebSocket connection should work', async ({ page, context }) => {
    // Create a new page for WebSocket testing
    const wsPage = await context.newPage();
    
    try {
      await wsPage.goto('/');
      
      // Wait for connection to establish
      await wsPage.waitForFunction(() => {
        const status = document.getElementById('connection-status')?.textContent;
        return status === 'Connected';
      }, { timeout: 5000 });
      
      const isConnected = await wsPage.evaluate(() => {
        return document.getElementById('connection-status')?.textContent === 'Connected';
      });
      
      expect(isConnected).toBe(true);
    } finally {
      await wsPage.close();
    }
  });
});
