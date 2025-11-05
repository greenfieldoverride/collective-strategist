import { test, expect, Page } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:3333';

// Test data
const testUser = {
  email: 'test@liberation.com',
  password: 'password123'
};

const mockVentures = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Liberation Collective',
    description: 'A cooperative focused on building liberation technologies and supporting community sovereignty',
    ventureType: 'cooperative'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Creative Commons Studio',
    description: 'Independent creative studio producing liberation-themed art, music, and media',
    ventureType: 'professional'
  }
];

// Helper functions
async function mockAuthAPI(page: Page) {
  // Create a properly formatted mock JWT token for testing
  const mockJWTPayload = {
    id: 'test-user-id',
    email: testUser.email,
    name: 'Test User',
    tier: 'pro',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(mockJWTPayload));
  const signature = 'mock-signature-for-testing';
  const mockJWTToken = `${header}.${payload}.${signature}`;

  // Mock the login endpoint
  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            email: testUser.email,
            tier: 'pro'
          },
          token: mockJWTToken
        }
      })
    });
  });

  // Mock user profile/verification endpoint
  await page.route('**/api/v1/auth/verify', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            email: testUser.email,
            tier: 'pro'
          }
        }
      })
    });
  });
}

async function loginUser(page: Page) {
  // Set up auth mocks first
  await mockAuthAPI(page);
  
  // Navigate to login page (app redirects here by default)
  await page.goto(FRONTEND_URL);
  
  // Wait for login form to be visible
  await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
  
  // Fill in login credentials
  await page.locator('[data-testid="login-email"]').fill(testUser.email);
  await page.locator('[data-testid="login-password"]').fill(testUser.password);
  
  // Submit login form
  await page.locator('[data-testid="login-submit"]').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard');
  
  // Wait for dashboard to load
  await expect(page.locator('[data-testid="user-profile"]')).toBeVisible({ timeout: 10000 });
}

async function mockVenturesAPI(page: Page) {
  await page.route('**/api/v1/ventures', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ventures: mockVentures,
          totalCount: mockVentures.length,
          hasMore: false
        }
      })
    });
  });
}

async function mockImpactDashboardAPI(page: Page, ventureId: string) {
  await page.route(`**/api/v1/impact/${ventureId}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          modules: [
            {
              id: 'community',
              name: 'Community Resilience',
              icon: '🌿',
              description: 'Building strong, interdependent communities',
              widgets: [
                {
                  id: 'patreon-widget',
                  integrationId: `patreon-${ventureId}`,
                  platform: 'patreon',
                  title: 'Creator Community Support',
                  metrics: [
                    {
                      id: 'patreon_patrons',
                      name: 'Active Patrons',
                      value: 156,
                      displayValue: '156',
                      trend: 'up',
                      changePercent: 18.5,
                      context: 'Community members directly funding your liberation work',
                      icon: '🤝'
                    }
                  ],
                  lastSync: new Date().toISOString(),
                  isConnected: true,
                  connectionStatus: 'connected'
                }
              ]
            },
            {
              id: 'knowledge',
              name: 'Knowledge Liberation',
              icon: '🧠',
              description: 'Sharing knowledge freely',
              widgets: [
                {
                  id: 'github-widget',
                  integrationId: `github-${ventureId}`,
                  platform: 'github',
                  title: 'Open Source Impact',
                  metrics: [
                    {
                      id: 'github_stars',
                      name: 'Total Stars',
                      value: 1247,
                      displayValue: '1,247',
                      trend: 'up',
                      changePercent: 12.5,
                      context: 'Community appreciation for your liberation tools',
                      icon: '⭐'
                    }
                  ],
                  lastSync: new Date().toISOString(),
                  isConnected: true,
                  connectionStatus: 'connected'
                }
              ]
            }
          ],
          connectedIntegrations: 3,
          totalMetrics: 15
        }
      })
    });
  });
}

async function mockAIConsultantAPI(page: Page) {
  await page.route('**/api/v1/ai-consultant/ask', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          response: 'Based on your Liberation Collective venture context, I recommend focusing on community-driven growth strategies that align with your cooperative values. Consider implementing transparent decision-making processes and building strong local partnerships.',
          confidenceScore: 0.85,
          marketDataUsed: [
            {
              source: 'trends',
              data: 'Growing interest in cooperative business models'
            }
          ],
          recommendations: [
            'Focus on community-driven growth strategies',
            'Implement transparent decision-making processes',
            'Build strong local partnerships'
          ],
          nextSteps: [
            'Review community feedback on current initiatives',
            'Explore partnership opportunities with local organizations',
            'Document decision-making processes for transparency'
          ],
          processingTimeMs: 1500
        }
      })
    });
  });
}

async function mockFinancialIntegrationsAPI(page: Page) {
  await page.route('**/api/v1/integrations/available', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            platform: 'stripe',
            name: 'Stripe',
            description: 'Connect your Stripe account to automatically sync payments',
            features: ['Payments', 'Refunds', 'Payouts'],
            authType: 'API Key',
            status: 'available'
          },
          {
            platform: 'patreon',
            name: 'Patreon',
            description: 'Track creator support and community funding',
            features: ['Creator metrics', 'Patron tracking'],
            authType: 'OAuth',
            status: 'available'
          }
        ]
      })
    });
  });

  await page.route('**/api/v1/integrations/venture/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: []
      })
    });
  });
}

async function mockDisconnectAPI(page: Page) {
  await page.route('**/api/v1/impact/integrations/*/details', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'github-test-venture',
          platform: 'github',
          accountName: 'liberation-collective',
          connectedSince: '2024-01-15T00:00:00.000Z',
          lastSync: '2024-12-01T00:00:00.000Z',
          metricsCount: 4,
          dataStored: [
            'Public repository metrics (stars, forks, contributions)',
            'Community engagement data',
            'Growth trends and historical data'
          ],
          permissions: [
            'Read public profile information',
            'Access public repository data',
            'View community metrics'
          ],
          disconnectNote: 'Disconnecting will immediately remove all stored data and revoke platform access.'
        }
      })
    });
  });

  await page.route('**/api/v1/impact/integrations/disconnect', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Integration disconnected successfully',
          details: {
            dataRemoved: 'All cached metrics and connection data have been permanently deleted',
            tokenRevoked: 'Your authorization token has been revoked with the platform',
            privacy: 'We do not retain any of your platform data after disconnection',
            reconnect: 'You can reconnect at any time without penalty or data loss'
          }
        }
      })
    });
  });
}

async function mockDashboardAPI(page: Page) {
  // Mock impact dashboard endpoint
  await page.route('**/api/v1/impact/*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modules: [
          {
            id: 'community',
            name: 'Community Resilience',
            icon: '🌿',
            widgets: [
              {
                id: 'liberation_score',
                name: 'Liberation Score',
                type: 'metric',
                value: 78,
                trend: 'up',
                description: 'Overall liberation progress index'
              }
            ]
          }
        ],
        connectedPlatforms: [],
        lastUpdated: new Date().toISOString()
      })
    });
  });

  // Mock AI consultant endpoints
  await page.route('**/api/v1/ai-consultant/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          response: 'This is a mock AI response for testing purposes.',
          sessionId: 'mock-session-id'
        }
      })
    });
  });
}

// Test suite begins
test.describe('MVP Complete E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for features that need them
    await mockFinancialIntegrationsAPI(page);
    await mockDisconnectAPI(page);
    await mockVenturesAPI(page);
    await mockDashboardAPI(page);
    
    // Login user and navigate to dashboard
    await loginUser(page);
  });

  test('User authentication and profile display', async ({ page }) => {
    // Check that user is logged in and profile is displayed
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    
    // Open user dropdown to access email
    await page.locator('[data-testid="user-dropdown"]').click();
    await expect(page.locator('[data-testid="user-email"]')).toContainText(testUser.email);
    
    // Test logout functionality
    await page.locator('[data-testid="logout-button"]').click();
    
    // Should redirect to login page
    await page.waitForURL('**/login');
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
  });

  test('Multi-venture management and switching', async ({ page }) => {
    // Wait for ventures to load
    await expect(page.locator('[data-testid="venture-selector"]')).toBeVisible();
    
    // Verify current venture is displayed
    await expect(page.locator('[data-testid="current-venture"]')).toContainText('Liberation Tech Collective');
    
    // Open venture selector dropdown to see available ventures
    await page.locator('[data-testid="venture-selector"]').click();
    
    // Check that venture dropdown is open and contains ventures
    await expect(page.locator('.dropdown-menu')).toBeVisible();
    await expect(page.locator('.dropdown-menu >> text=Creative Independence Hub')).toBeVisible();
    await expect(page.locator('.dropdown-menu >> text=Solo Consultant Practice')).toBeVisible();
    
    // Verify that ventures can be interacted with (this validates the dropdown functionality)
    await expect(page.locator('.venture-option:has-text("Creative Independence Hub")')).toBeVisible();
    
    // Close dropdown by clicking outside (test functionality without full switching)
    await page.locator('.dropdown-overlay').click();
    await expect(page.locator('.dropdown-menu')).not.toBeVisible();
  });

  test('Impact Dashboard with liberation metrics', async ({ page }) => {
    // Mock the Impact Dashboard API for the selected venture
    await mockImpactDashboardAPI(page, mockVentures[0].id);
    
    // Navigate to Impact Dashboard tab
    await page.locator('[data-testid="nav-impact"]').click();
    
    // Check that Impact Dashboard loads
    await expect(page.locator('h2:has-text("Impact Dashboard")')).toBeVisible();
    await expect(page.locator('text=Measure what truly matters for liberation')).toBeVisible();
    
    // Check module navigation
    await expect(page.locator('text=Community Resilience')).toBeVisible();
    await expect(page.locator('text=Knowledge Liberation')).toBeVisible();
    
    // Test module switching
    await page.locator('button:has-text("Knowledge Liberation")').click();
    await expect(page.locator('text=Open Source Impact')).toBeVisible();
    
    // Check liberation-focused metrics
    await expect(page.locator('text=1,247')).toBeVisible(); // GitHub stars
    await expect(page.locator('text=Community appreciation for your liberation tools')).toBeVisible();
    
    // Test back to Community module
    await page.locator('button:has-text("Community Resilience")').click();
    await expect(page.locator('text=Creator Community Support')).toBeVisible();
    await expect(page.locator('text=156')).toBeVisible(); // Patreon supporters
  });

  test('AI Consultant integration with venture context', async ({ page }) => {
    await mockAIConsultantAPI(page);
    
    // Navigate to AI Consultant
    await page.locator('[data-testid="nav-ai-consultant"]').click();
    
    // Check that AI Consultant loads
    await expect(page.locator('h2:has-text("AI Consultant")')).toBeVisible();
    
    // Test sending a query
    const queryInput = page.locator('[data-testid="ai-query-input"]');
    await queryInput.fill('What are some strategic recommendations for growing our Liberation Collective venture?');
    
    await page.locator('[data-testid="send-query-button"]').click();
    
    // Check response - verify AI responded with venture-specific advice
    await expect(page.locator('.message-text:has-text("Based on your Liberation")')).toBeVisible();
    
    // Verify the AI provided a response (successful interaction)
    const responseCount = await page.locator('.message.ai').count();
    expect(responseCount).toBeGreaterThan(1); // Initial message + response
  });

  test('Financial integrations and platform management', async ({ page }) => {
    // Navigate to Integration Hub
    await page.locator('[data-testid="nav-integrations"]').click();
    
    // Check that integrations load
    await expect(page.locator('text=Integration Hub')).toBeVisible();
    
    // Check available platforms
    await expect(page.locator('text=Stripe')).toBeVisible();
    await expect(page.locator('text=Patreon')).toBeVisible();
    
    // Test platform connection flow (mocked)
    await page.locator('button:has-text("Connect Stripe")').click();
    
    // Should show connection modal
    await expect(page.locator('text=Connect Stripe')).toBeVisible();
    await expect(page.locator('text=Your credentials are encrypted')).toBeVisible();
  });

  test('Liberation-focused disconnect UX', async ({ page }) => {
    // Mock Impact Dashboard with connected integrations
    await mockImpactDashboardAPI(page, mockVentures[0].id);
    
    // Navigate to Impact Dashboard
    await page.locator('[data-testid="nav-impact-dashboard"]').click();
    
    // Click settings on a connected widget
    await page.locator('[data-testid="widget-settings-btn"]').first().click();
    
    // Check integration settings modal
    await expect(page.locator('text=Integration Settings')).toBeVisible();
    await expect(page.locator('text=github')).toBeVisible();
    await expect(page.locator('text=liberation-collective')).toBeVisible();
    
    // Check transparency sections
    await expect(page.locator('text=Data We Store')).toBeVisible();
    await expect(page.locator('text=Platform Permissions')).toBeVisible();
    
    // Test disconnect flow
    await page.locator('button:has-text("Disconnect")').click();
    
    // Check liberation-focused confirmation dialog
    await expect(page.locator('text=Confirm Disconnection')).toBeVisible();
    await expect(page.locator('text=honest disconnection')).toBeVisible();
    await expect(page.locator('text=Data Removal')).toBeVisible();
    await expect(page.locator('text=Token Revocation')).toBeVisible();
    await expect(page.locator('text=Privacy')).toBeVisible();
    await expect(page.locator('text=Reconnection')).toBeVisible();
    
    // Check no guilt trips
    await expect(page.locator('text=No guilt trips')).toBeVisible();
    await expect(page.locator('text=no retention tricks')).toBeVisible();
    
    // Test actual disconnection
    await page.locator('button:has-text("Yes, Disconnect")').click();
    
    // Should show success message and close modal
    await expect(page.locator('text=Successfully disconnected')).toBeVisible();
  });

  test('Complete user journey flow', async ({ page }) => {
    // Mock all APIs for complete flow
    await mockImpactDashboardAPI(page, mockVentures[0].id);
    await mockAIConsultantAPI(page);
    
    // 1. Start at dashboard (logged in via beforeEach)
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    
    // 2. Check venture selection
    await expect(page.locator('text=Liberation Collective')).toBeVisible();
    
    // 3. Navigate to Impact Dashboard
    await page.locator('[data-testid="nav-impact-dashboard"]').click();
    await expect(page.locator('text=Community Resilience')).toBeVisible();
    
    // 4. View liberation metrics
    await expect(page.locator('text=Community appreciation for your liberation tools')).toBeVisible();
    
    // 5. Navigate to AI Consultant
    await page.locator('[data-testid="nav-ai-consultant"]').click();
    
    // 6. Get strategic advice
    await page.locator('[data-testid="ai-query-input"]').fill('Brief strategic advice?');
    await page.locator('[data-testid="send-query-button"]').click();
    await expect(page.locator('text=Liberation Collective venture context')).toBeVisible();
    
    // 7. Navigate to Integration Hub
    await page.locator('[data-testid="nav-integrations"]').click();
    await expect(page.locator('text=Integration Hub')).toBeVisible();
    
    // 8. Check available platforms
    await expect(page.locator('text=Stripe')).toBeVisible();
    await expect(page.locator('text=Patreon')).toBeVisible();
    
    // Complete flow demonstrates all major MVP features working together
  });

  test('Responsive design and mobile compatibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that navigation adapts
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test navigation in mobile
    await page.locator('[data-testid="mobile-menu-button"]').click();
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Test Impact Dashboard in mobile
    await page.locator('[data-testid="nav-impact-dashboard"]').click();
    await expect(page.locator('text=Impact Dashboard')).toBeVisible();
    
    // Modules should stack vertically
    const modules = page.locator('[data-testid="module-nav-item"]');
    await expect(modules).toHaveCount(5);
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test API error handling
    await page.route('**/api/v1/ventures', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Server error'
        })
      });
    });
    
    // Should show error state
    await page.reload();
    await expect(page.locator('text=Error loading ventures')).toBeVisible();
    
    // Test network failure
    await page.route('**/api/v1/auth/me', async route => {
      await route.abort();
    });
    
    await page.reload();
    // Should handle gracefully with fallback
  });
});

test.describe('Performance and Accessibility', () => {
  test('Page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Basic accessibility compliance', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check for proper form labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate(el => {
        return !!el.getAttribute('aria-label') || 
               !!el.getAttribute('aria-labelledby') ||
               !!document.querySelector(`label[for="${el.id}"]`);
      });
      expect(hasLabel).toBeTruthy();
    }
  });
});