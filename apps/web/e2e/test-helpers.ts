import { Page } from '@playwright/test';

export const mockApiResponses = {
  availableIntegrations: [
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
    },
    {
      platform: 'venmo',
      name: 'Venmo',
      description: 'Track Venmo payments and transfers (personal account only)',
      features: ['Personal payments', 'Transaction history'],
      authType: 'OAuth Access Token',
      status: 'available'
    },
    {
      platform: 'wise',
      name: 'Wise',
      description: 'Connect Wise for international transfers and multi-currency transactions',
      features: ['International transfers', 'Currency exchange', 'Multi-currency balances', 'Fees tracking'],
      authType: 'API Token',
      status: 'available'
    },
    {
      platform: 'square',
      name: 'Square',
      description: 'Sync Square point-of-sale transactions and payments',
      features: ['Point-of-sale transactions', 'Card payments', 'Cash transactions', 'Refunds'],
      authType: 'OAuth / Access Token',
      status: 'available'
    }
  ],

  connectedIntegrations: [
    {
      ventureId: 'test-venture',
      platform: 'stripe',
      credentials: {},
      syncEnabled: true,
      webhooksEnabled: false,
      lastSyncAt: new Date().toISOString(),
      settings: {}
    }
  ],

  syncResult: {
    platform: 'stripe',
    transactionsAdded: 5,
    transactionsUpdated: 2,
    errors: [],
    lastSyncAt: new Date().toISOString()
  },

  syncAllResult: {
    totalSynced: 2,
    totalTransactions: 15,
    transactionsAdded: 10,
    transactionsUpdated: 5,
    errors: [],
    platforms: [
      {
        platform: 'stripe',
        transactionsAdded: 8,
        transactionsUpdated: 3,
        errors: []
      },
      {
        platform: 'paypal',
        transactionsAdded: 2,
        transactionsUpdated: 2,
        errors: ['Minor warning']
      }
    ]
  }
};

export async function setupIntegrationMocks(page: Page) {
  // Mock available integrations
  await page.route('**/api/v1/integrations/available', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockApiResponses.availableIntegrations
      })
    });
  });

  // Mock venture integrations
  await page.route('**/api/v1/integrations/venture/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockApiResponses.connectedIntegrations
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

  // Mock connection endpoint
  await page.route('**/api/v1/integrations/venture/**/connect', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Integration connected successfully'
      })
    });
  });

  // Mock sync endpoints
  await page.route('**/api/v1/integrations/venture/**/sync', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockApiResponses.syncResult,
        message: 'Sync completed'
      })
    });
  });

  await page.route('**/api/v1/integrations/venture/**/sync-all', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockApiResponses.syncAllResult
      })
    });
  });

  // Mock disconnect endpoint
  await page.route('**/api/v1/integrations/venture/**/**', async route => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Integration disconnected successfully'
        })
      });
    }
  });
}

export async function setupErrorMocks(page: Page, errorType: 'connection' | 'api' | 'sync') {
  switch (errorType) {
    case 'connection':
      await page.route('**/api/v1/integrations/venture/**/connect', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid credentials provided'
          })
        });
      });
      break;

    case 'api':
      await page.route('**/api/v1/integrations/available', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      break;

    case 'sync':
      await page.route('**/api/v1/integrations/venture/**/sync', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Sync failed - API rate limit exceeded'
          })
        });
      });
      break;
  }
}

export const platformCredentials = {
  stripe: {
    validFields: [
      { field: 'secretKey', value: 'sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890' }
    ],
    invalidFields: [
      { field: 'secretKey', value: 'invalid-key' }
    ]
  },
  paypal: {
    validFields: [
      { field: 'apiKey', value: 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890' },
      { field: 'secretKey', value: 'EE1234567890AbCdEfGhIjKlMnOpQrStUvWxYz-1234567890AbCdEfGhIjKlMnOp' }
    ],
    invalidFields: [
      { field: 'apiKey', value: '' },
      { field: 'secretKey', value: '' }
    ]
  },
  venmo: {
    validFields: [
      { field: 'accessToken', value: 'venmo_access_token_1234567890abcdefghijklmnopqrstuvwxyz' }
    ],
    invalidFields: [
      { field: 'accessToken', value: '' }
    ]
  },
  wise: {
    validFields: [
      { field: 'apiKey', value: 'wise_api_token_1234567890abcdefghijklmnopqrstuvwxyz' }
    ],
    invalidFields: [
      { field: 'apiKey', value: '' }
    ]
  },
  square: {
    validFields: [
      { field: 'accessToken', value: 'EAAAEOe3-1234567890abcdefghijklmnopqrstuvwxyz' }
    ],
    invalidFields: [
      { field: 'accessToken', value: '' }
    ]
  }
};

export async function fillPlatformCredentials(page: Page, platform: keyof typeof platformCredentials, valid: boolean = true) {
  const credentials = valid 
    ? platformCredentials[platform].validFields 
    : platformCredentials[platform].invalidFields;

  for (const { field, value } of credentials) {
    const selector = getPlatformFieldSelector(platform, field);
    await page.locator(selector).fill(value);
  }
}

function getPlatformFieldSelector(platform: string, field: string): string {
  const fieldMappings: Record<string, Record<string, string>> = {
    stripe: {
      secretKey: 'input[placeholder*="sk_test"]'
    },
    paypal: {
      apiKey: 'input[placeholder*="PayPal Client ID"]',
      secretKey: 'input[placeholder*="PayPal Client Secret"]'
    },
    venmo: {
      accessToken: 'input[placeholder*="Venmo Access Token"]'
    },
    wise: {
      apiKey: 'input[placeholder*="Wise API Token"]'
    },
    square: {
      accessToken: 'input[placeholder*="Square Access Token"]'
    }
  };

  return fieldMappings[platform]?.[field] || `input[placeholder*="${field}"]`;
}

export async function waitForIntegrationHubLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1:has-text("Payment Integration Hub")', { timeout: 10000 });
}

export async function openPlatformModal(page: Page, platform: string) {
  const platformInfo = mockApiResponses.availableIntegrations.find(p => p.platform === platform);
  if (!platformInfo) {
    throw new Error(`Platform ${platform} not found in mock data`);
  }
  
  await page.locator(`button:has-text("Connect ${platformInfo.name}")`).click();
  await page.waitForSelector(`h2:has-text("Connect ${platformInfo.name}")`, { timeout: 5000 });
}

export async function assertModalOpen(page: Page, platform: string) {
  const platformInfo = mockApiResponses.availableIntegrations.find(p => p.platform === platform);
  if (!platformInfo) {
    throw new Error(`Platform ${platform} not found in mock data`);
  }
  
  await page.waitForSelector(`h2:has-text("Connect ${platformInfo.name}")`, { timeout: 5000 });
  await page.waitForSelector('text=Your credentials are encrypted and stored securely', { timeout: 5000 });
}

export async function assertModalClosed(page: Page) {
  await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 5000 });
}