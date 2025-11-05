// Test fixtures and mock data for integration tests

export const mockCredentials = {
  stripe: {
    secretKey: 'sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890',
    publishableKey: 'pk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890',
    environment: 'sandbox' as const,
    webhookSecret: 'whsec_1234567890abcdefghijklmnopqrstuvwxyz'
  },
  paypal: {
    apiKey: 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890',
    secretKey: 'EE1234567890AbCdEfGhIjKlMnOpQrStUvWxYz-1234567890AbCdEfGhIjKlMnOp',
    environment: 'sandbox' as const
  },
  venmo: {
    accessToken: 'venmo_access_token_1234567890abcdefghijklmnopqrstuvwxyz',
    environment: 'sandbox' as const
  },
  wise: {
    apiKey: 'wise_api_token_1234567890abcdefghijklmnopqrstuvwxyz',
    environment: 'sandbox' as const
  },
  square: {
    accessToken: 'EAAAEOe3-1234567890abcdefghijklmnopqrstuvwxyz',
    environment: 'sandbox' as const
  }
}

export const mockTransactionData = {
  stripe: [
    {
      externalId: 'ch_3N123456789012345678',
      amount: 100.00,
      currency: 'USD',
      description: 'Payment for consultation services',
      date: new Date('2023-10-15T14:30:00Z'),
      status: 'completed' as const,
      fees: 3.20,
      netAmount: 96.80,
      counterparty: 'customer@example.com',
      category: 'stripe_payment',
      metadata: {
        stripeChargeId: 'ch_3N123456789012345678',
        paymentMethod: 'card',
        receiptUrl: 'https://pay.stripe.com/receipts/test_receipt_123',
        refunded: false,
        captured: true
      }
    },
    {
      externalId: 're_3N987654321098765432',
      amount: -25.00,
      currency: 'USD',
      description: 'Refund for ch_3N123456789012345678',
      date: new Date('2023-10-16T09:15:00Z'),
      status: 'refunded' as const,
      fees: 0,
      netAmount: -25.00,
      category: 'stripe_refund',
      metadata: {
        stripeRefundId: 're_3N987654321098765432',
        stripeChargeId: 'ch_3N123456789012345678',
        reason: 'requested_by_customer'
      }
    },
    {
      externalId: 'po_3N555666777888999000',
      amount: -71.80,
      currency: 'USD',
      description: 'Payout to ba_1234567890',
      date: new Date('2023-10-17T16:45:00Z'),
      status: 'completed' as const,
      fees: 0,
      netAmount: -71.80,
      category: 'stripe_payout',
      metadata: {
        stripePayoutId: 'po_3N555666777888999000',
        destination: 'ba_1234567890',
        method: 'standard',
        type: 'bank_account'
      }
    }
  ],
  paypal: [
    {
      externalId: 'PAYID-MK4ABCD-12345678901234567',
      amount: 75.50,
      currency: 'USD',
      description: 'PayPal payment for digital services',
      date: new Date('2023-10-15T11:20:00Z'),
      status: 'completed' as const,
      fees: 2.49,
      netAmount: 73.01,
      counterparty: 'buyer@example.com',
      category: 'paypal_payment',
      metadata: {
        paypalPaymentId: 'PAYID-MK4ABCD-12345678901234567',
        paymentMethod: 'paypal',
        payerName: 'John Doe'
      }
    },
    {
      externalId: 'PAYOUT-BATCH-123456789',
      amount: -73.01,
      currency: 'USD', 
      description: 'PayPal payout batch PAYOUT-BATCH-123456789',
      date: new Date('2023-10-18T10:30:00Z'),
      status: 'completed' as const,
      fees: 1.50,
      netAmount: -74.51,
      category: 'paypal_payout',
      metadata: {
        paypalPayoutId: 'PAYOUT-BATCH-123456789',
        senderBatchId: 'batch_20231018_001',
        itemCount: 1
      }
    }
  ],
  venmo: [
    {
      externalId: 'venmo_payment_12345678-abcd-1234-efgh-123456789012',
      amount: 50.00,
      currency: 'USD',
      description: 'Dinner split',
      date: new Date('2023-10-14T19:45:00Z'),
      status: 'completed' as const,
      fees: 0,
      netAmount: 50.00,
      counterparty: 'friend_username',
      category: 'venmo_pay',
      metadata: {
        venmoPaymentId: 'venmo_payment_12345678-abcd-1234-efgh-123456789012',
        venmoTransactionId: 'tx_12345678-abcd-1234-efgh-123456789012',
        action: 'pay',
        audience: 'friends',
        story: 'friend_username paid you for dinner'
      }
    }
  ],
  wise: [
    {
      externalId: 'wise_transfer_12345678',
      amount: 500.00,
      currency: 'USD',
      description: 'International transfer to EUR account',
      date: new Date('2023-10-16T08:30:00Z'),
      status: 'completed' as const,
      fees: 8.50,
      netAmount: 491.50,
      category: 'wise_transfer',
      metadata: {
        wiseReferenceNumber: 'wise_transfer_12345678',
        wiseTransactionType: 'TRANSFER',
        exchangeDetails: {
          fromAmount: { value: 500.00, currency: 'USD' },
          toAmount: { value: 425.30, currency: 'EUR' },
          rate: 0.8506
        }
      }
    }
  ],
  square: [
    {
      externalId: 'square_payment_AbCdEfGhIjKlMnOp1234',
      amount: 45.75,
      currency: 'USD',
      description: 'Square payment square_payment_AbCdEfGhIjKlMnOp1234',
      date: new Date('2023-10-15T15:22:00Z'),
      status: 'completed' as const,
      fees: 1.68,
      netAmount: 44.07,
      category: 'square_card_payment',
      metadata: {
        squarePaymentId: 'square_payment_AbCdEfGhIjKlMnOp1234',
        locationId: 'location_123456789',
        sourceType: 'CARD',
        receiptNumber: 'A001'
      }
    }
  ]
}

export const mockIntegrationConfigs = {
  stripe: {
    ventureId: 'venture-test-123',
    platform: 'stripe',
    credentials: mockCredentials.stripe,
    syncEnabled: true,
    webhooksEnabled: false,
    lastSyncAt: new Date('2023-10-15T10:00:00Z'),
    settings: { webhooksEnabled: false }
  },
  paypal: {
    ventureId: 'venture-test-123',
    platform: 'paypal',
    credentials: mockCredentials.paypal,
    syncEnabled: true,
    webhooksEnabled: false,
    lastSyncAt: new Date('2023-10-15T10:05:00Z'),
    settings: { webhooksEnabled: false }
  },
  venmo: {
    ventureId: 'venture-test-123',
    platform: 'venmo',
    credentials: mockCredentials.venmo,
    syncEnabled: true,
    webhooksEnabled: false,
    lastSyncAt: new Date('2023-10-15T10:10:00Z'),
    settings: { webhooksEnabled: false }
  }
}

export const mockSyncResults = {
  successful: {
    platform: 'stripe',
    transactionsAdded: 3,
    transactionsUpdated: 0,
    errors: [],
    lastSyncAt: new Date('2023-10-15T16:30:00Z')
  },
  withWarnings: {
    platform: 'paypal',
    transactionsAdded: 2,
    transactionsUpdated: 1,
    errors: ['Warning: Duplicate transaction detected and skipped'],
    lastSyncAt: new Date('2023-10-15T16:31:00Z')
  },
  failed: {
    platform: 'venmo',
    transactionsAdded: 0,
    transactionsUpdated: 0,
    errors: ['Error: API rate limit exceeded'],
    lastSyncAt: new Date('2023-10-15T16:32:00Z')
  }
}

export const mockWebhookPayloads = {
  stripe: {
    payment_intent_succeeded: {
      id: 'evt_1234567890',
      object: 'event',
      api_version: '2023-10-16',
      created: 1697558400,
      data: {
        object: {
          id: 'pi_1234567890',
          object: 'payment_intent',
          amount: 10000,
          currency: 'usd',
          status: 'succeeded'
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: 'req_1234567890' },
      type: 'payment_intent.succeeded'
    },
    charge_dispute_created: {
      id: 'evt_dispute_123',
      object: 'event',
      api_version: '2023-10-16',
      created: 1697558500,
      data: {
        object: {
          id: 'dp_1234567890',
          object: 'dispute',
          amount: 5000,
          currency: 'usd',
          reason: 'fraudulent',
          status: 'warning_needs_response'
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: 'req_dispute_123' },
      type: 'charge.dispute.created'
    }
  },
  paypal: {
    payment_sale_completed: {
      id: 'WH-12345678901234567-12345678901234567',
      event_version: '1.0',
      create_time: '2023-10-15T16:45:00Z',
      resource_type: 'sale',
      event_type: 'PAYMENT.SALE.COMPLETED',
      summary: 'Payment completed for $ 75.50 USD',
      resource: {
        id: 'SALE-123456789',
        amount: {
          total: '75.50',
          currency: 'USD'
        },
        payment_mode: 'INSTANT_TRANSFER',
        state: 'completed',
        parent_payment: 'PAYID-MK4ABCD-12345678901234567',
        create_time: '2023-10-15T16:45:00Z',
        update_time: '2023-10-15T16:45:30Z'
      }
    }
  }
}

export const mockAccountInfo = {
  stripe: {
    id: 'acct_1234567890',
    businessProfile: {
      name: 'Test Liberation Venture',
      url: 'https://testventure.com'
    },
    country: 'US',
    defaultCurrency: 'usd',
    email: 'test@testventure.com',
    payoutsEnabled: true,
    chargesEnabled: true,
    balance: {
      available: [
        { amount: 150.75, currency: 'USD' },
        { amount: 89.20, currency: 'EUR' }
      ],
      pending: [
        { amount: 45.30, currency: 'USD' }
      ]
    }
  },
  paypal: {
    userId: 'paypal_user_123456789',
    name: 'Test Liberation Venture',
    email: 'test@testventure.com',
    verifiedAccount: true,
    accountType: 'BUSINESS',
    country: 'US',
    currency: 'en'
  },
  venmo: {
    id: 'venmo_user_123456789',
    username: 'test_liberation_venture',
    displayName: 'Test Liberation Venture',
    email: 'test@testventure.com',
    isVerified: true,
    balance: 125.50
  },
  wise: {
    profileId: 12345678,
    profileType: 'business',
    name: 'Test Liberation Venture',
    balances: [
      {
        accountId: 87654321,
        currency: 'USD',
        name: 'USD Balance',
        type: 'STANDARD',
        isPrimary: true,
        balance: 1250.75,
        reservedBalance: 0
      },
      {
        accountId: 87654322,
        currency: 'EUR',
        name: 'EUR Balance',
        type: 'STANDARD',
        isPrimary: false,
        balance: 890.45,
        reservedBalance: 50.00
      }
    ]
  },
  square: {
    applicationId: 'sandbox-sq0idb-123456789',
    locations: [
      {
        id: 'location_123456789',
        name: 'Test Liberation Venture',
        address: {
          address_line_1: '123 Liberation St',
          locality: 'San Francisco',
          administrative_district_level_1: 'CA',
          postal_code: '94102',
          country: 'US'
        },
        timezone: 'America/Los_Angeles',
        capabilities: ['CREDIT_CARD_PROCESSING'],
        status: 'ACTIVE',
        country: 'US',
        languageCode: 'en-US',
        currency: 'USD',
        businessName: 'Test Liberation Venture',
        type: 'PHYSICAL'
      }
    ]
  }
}

// Utility functions for test setup
export function createMockDatabase() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] })
  }
}

export function createMockIntegrationService(overrides: any = {}) {
  return {
    getAvailableIntegrations: jest.fn().mockResolvedValue(['stripe', 'paypal', 'venmo', 'wise', 'square']),
    getVentureIntegrations: jest.fn().mockResolvedValue([]),
    addIntegration: jest.fn().mockResolvedValue(undefined),
    removeIntegration: jest.fn().mockResolvedValue(undefined),
    syncIntegration: jest.fn().mockResolvedValue(mockSyncResults.successful),
    syncAllIntegrations: jest.fn().mockResolvedValue([mockSyncResults.successful]),
    handleWebhook: jest.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

export function createMockPlatformIntegration(platform: string, overrides: any = {}) {
  return {
    platform,
    authenticate: jest.fn().mockResolvedValue(true),
    getTransactions: jest.fn().mockResolvedValue(mockTransactionData[platform as keyof typeof mockTransactionData] || []),
    getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo[platform as keyof typeof mockAccountInfo]),
    validateWebhook: jest.fn().mockReturnValue(true),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

// Common test scenarios
export const testScenarios = {
  fullIntegrationWorkflow: {
    description: 'Complete integration lifecycle from connection to disconnection',
    steps: [
      'Get available integrations',
      'Connect integration with valid credentials',
      'Verify integration appears in venture integrations',
      'Sync integration and verify transactions',
      'Handle webhook events',
      'Disconnect integration'
    ]
  },
  multiPlatformSync: {
    description: 'Sync multiple platforms simultaneously',
    platforms: ['stripe', 'paypal', 'venmo'],
    expectedTransactions: 6 // 3 stripe + 2 paypal + 1 venmo
  },
  errorHandling: {
    description: 'Various error scenarios and recovery',
    scenarios: [
      'Invalid credentials',
      'Network timeouts',
      'API rate limiting',
      'Webhook signature validation failures',
      'Database connection issues',
      'Encryption/decryption errors'
    ]
  },
  dataIntegrity: {
    description: 'Ensure data consistency and proper handling',
    tests: [
      'Duplicate transaction detection',
      'Currency normalization',
      'Amount precision handling',
      'Date/timezone consistency',
      'Metadata preservation'
    ]
  }
}

export default {
  mockCredentials,
  mockTransactionData,
  mockIntegrationConfigs,
  mockSyncResults,
  mockWebhookPayloads,
  mockAccountInfo,
  createMockDatabase,
  createMockIntegrationService,
  createMockPlatformIntegration,
  testScenarios
}