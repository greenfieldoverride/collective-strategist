import { test, expect, Page } from '@playwright/test';

const mockAvailableIntegrations = [
  {
    platform: 'stripe',
    name: 'Stripe',
    description: 'Connect your Stripe account to automatically sync payments, refunds, and payouts',
    features: ['Payments', 'Refunds', 'Payouts', 'Fees tracking', 'Webhooks'],
    authType: 'API Key',
    status: 'available'
  },
  {
    platform: 'paypal',
    name: 'PayPal',
    description: 'Sync PayPal payments, payouts, and account transactions',
    features: ['Payments', 'Payouts', 'Refunds', 'Fees tracking'],
    authType: 'OAuth / API Credentials',
    status: 'available'
  }
];

const mockConnectedIntegrations = [
  {
    ventureId: 'test-venture',
    platform: 'stripe',
    credentials: {},
    syncEnabled: true,
    webhooksEnabled: false,
    lastSyncAt: new Date().toISOString(),
    settings: {}
  }
];

async function setupMockAPI(page: Page) {
  // Mock auth check
  await page.route('**/api/v1/auth/validate', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          valid: true,
          user: {
            id: 'test-user',
            email: 'test@liberation.com',
            name: 'Test User'
          }
        }
      })
    });
  });

  // Mock ventures - note the correct API structure
  await page.route('**/api/v1/ventures**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ventures: [{
            id: 'test-venture',
            name: 'Test Venture',
            description: 'A test venture',
            ventureType: 'professional',
            primaryGoals: ['liberation', 'sovereignty'],
            members: [],
            maxMembers: 10
          }],
          totalCount: 1,
          hasMore: false
        }
      })
    });
  });

  // Mock billing API calls for subscription status
  await page.route('**/api/billing/info', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        customer: null,
        subscription: null,
        status: 'none'
      })
    });
  });

  await page.route('**/api/integrations/available', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockAvailableIntegrations
      })
    });
  });

  await page.route('**/api/integrations/venture/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockConnectedIntegrations
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }
  });

  await page.route('**/api/integrations/venture/**/connect', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Integration connected successfully'
      })
    });
  });
}

test.describe('Integration Hub - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAPI(page);
    // Set auth token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-test-token');
    });
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('should display the Integration Hub', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we have the correct integration page content
    await expect(page.locator('h1:has-text("Payment Integration Hub")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h3:has-text("Financial Liberation Tools")')).toBeVisible({ timeout: 10000 });
  });

  test('should show available platforms', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Wait for integrations content to load
    await expect(page.locator('h1:has-text("Payment Integration Hub")')).toBeVisible({ timeout: 10000 });
    
    // Now look for the PayPal button
    await expect(page.locator('button:has-text("Connect PayPal")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Integration Hub - Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAPI(page);
    // Set auth token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-test-token');
    });
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('should open PayPal connection modal', async ({ page }) => {
    await page.locator('button:has-text("Connect PayPal")').click();
    await expect(page.locator('h2:has-text("Connect PayPal")')).toBeVisible();
    await expect(page.locator('label:has-text("Client ID")')).toBeVisible();
    await expect(page.locator('label:has-text("Client Secret")')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.locator('button:has-text("Connect PayPal")').click();
    
    const connectButton = page.locator('button:has-text("Connect Securely")');
    await expect(connectButton).toBeDisabled();
    
    await page.locator('input[placeholder*="PayPal Client ID"]').fill('test-client-id');
    await page.locator('input[placeholder*="PayPal Client Secret"]').fill('test-client-secret');
    await expect(connectButton).toBeEnabled();
  });

  test('should successfully connect integration', async ({ page }) => {
    await page.locator('button:has-text("Connect PayPal")').click();
    
    await page.locator('input[placeholder*="PayPal Client ID"]').fill('test-client-id');
    await page.locator('input[placeholder*="PayPal Client Secret"]').fill('test-client-secret');
    
    const connectButton = page.locator('button:has-text("Connect Securely")');
    await connectButton.click();
    
    await expect(page.locator('button:has-text("Connecting...")')).toBeVisible();
  });
});

test.describe('Integration Hub - Error Handling', () => {
  test('should handle connection errors', async ({ page }) => {
    await setupMockAPI(page);
    
    await page.route('**/api/v1/integrations/venture/**/connect', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Invalid credentials' }
        })
      });
    });
    
    // Set auth token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-test-token');
    });
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button:has-text("Connect PayPal")').click();
    await page.locator('input[placeholder*="PayPal Client ID"]').fill('invalid-id');
    await page.locator('input[placeholder*="PayPal Client Secret"]').fill('invalid-secret');
    
    const connectButton = page.locator('button:has-text("Connect Securely")');
    await connectButton.click();
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});