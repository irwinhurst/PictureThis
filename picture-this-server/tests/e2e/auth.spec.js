const { test, expect } = require('@playwright/test');

test.describe('Google OAuth Authentication', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test('should have Google OAuth login endpoint', async ({ request }) => {
    // This will redirect, so we check for 302 status
    const response = await request.get('/auth/google', {
      maxRedirects: 0,
      failOnStatusCode: false
    });
    
    // Should redirect to Google OAuth
    expect([302, 401]).toContain(response.status());
  });

  test('should return authentication status for unauthenticated user', async ({ request }) => {
    const response = await request.get('/api/auth/status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('authenticated');
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });

  test('should reject unauthenticated access to profile', async ({ request }) => {
    const response = await request.get('/api/auth/profile');
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('ERR_AUTH_REQUIRED');
  });

  test('should reject unauthenticated game creation', async ({ request }) => {
    const response = await request.post('/api/game/create', {
      data: {
        maxRounds: 5,
        maxPlayers: 8
      }
    });
    
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('ERR_AUTH_REQUIRED');
  });

  test('should handle logout when not logged in', async ({ request }) => {
    const response = await request.post('/auth/logout');
    // Should succeed but indicate no user was logged in
    expect([200, 302]).toContain(response.status());
  });
});

test.describe('Authentication Middleware', () => {
  test('should protect create game endpoint', async ({ request }) => {
    const response = await request.post('/api/game/create', {
      data: {
        maxRounds: 5,
        maxPlayers: 8
      }
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  test('should allow access to public endpoints without auth', async ({ request }) => {
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.status()).toBe(200);
    
    const statusResponse = await request.get('/api/auth/status');
    expect(statusResponse.status()).toBe(200);
  });
});

test.describe('OAuth Error Handling', () => {
  test('should handle OAuth callback failure gracefully', async ({ page }) => {
    // Try to access callback without proper OAuth state
    const response = await page.goto('/auth/google/callback', {
      waitUntil: 'domcontentloaded',
      failOnStatusCode: false
    });
    
    // Should handle error appropriately (redirect to failure page)
    // Status could be 302 (redirect) or 400 (bad request)
    expect([302, 400, 401, 404]).toContain(response?.status());
  });
});
