# LemonSqueezy Webhook Setup Guide

This guide covers setting up webhooks for LemonSqueezy integration with The Collective Strategist platform.

## Overview

Webhooks allow LemonSqueezy to notify your application when important events occur, such as:
- New subscriptions created
- Payments succeeded/failed  
- Subscriptions cancelled or updated
- Customer information changes

## Webhook Endpoint

**Production URL**: `https://your-domain.com/api/billing/webhook`
**Development URL**: `https://your-ngrok-url.ngrok.io/api/billing/webhook` (for local testing)

## Required Events

Configure your LemonSqueezy store to send these webhook events:

### Essential Events
- `subscription_created` - New subscription started
- `subscription_updated` - Subscription details changed (status, plan, etc.)
- `subscription_cancelled` - Subscription cancelled by user or admin
- `subscription_payment_success` - Successful subscription payment
- `subscription_payment_failed` - Failed subscription payment
- `subscription_payment_recovered` - Failed payment recovered

### Optional Events (for enhanced functionality)
- `order_created` - One-time purchase completed
- `order_refunded` - Order refunded
- `customer_created` - New customer created
- `customer_updated` - Customer details updated

## LemonSqueezy Dashboard Setup

1. **Log into LemonSqueezy Dashboard**
   - Go to Settings → Webhooks
   - Click "Add Endpoint"

2. **Configure Webhook Endpoint**
   ```
   URL: https://your-domain.com/api/billing/webhook
   Events: Select the events listed above
   Signing Secret: Generate a strong secret (save this!)
   ```

3. **Test the Webhook**
   - Use the "Send Test" feature in LemonSqueezy
   - Check your application logs for successful processing

## Environment Variables

Add these to your production environment:

```bash
# LemonSqueezy API Configuration
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_signing_secret_here

# Set to 'production' when using real LemonSqueezy API
NODE_ENV=production
```

## Local Development Setup

For testing webhooks locally, you'll need to expose your local server:

### Using ngrok (Recommended)

1. **Install ngrok**: https://ngrok.com/download

2. **Start your local server**:
   ```bash
   cd services/core-api
   npm run dev
   ```

3. **Expose your local server**:
   ```bash
   ngrok http 3000
   ```

4. **Use the ngrok URL in LemonSqueezy**:
   ```
   https://abc123.ngrok.io/api/billing/webhook
   ```

### Environment Variables for Local Development

```bash
# For local development (uses mocks)
NODE_ENV=development
LEMONSQUEEZY_API_KEY=test_key_development
LEMONSQUEEZY_STORE_ID=test_store_development  
LEMONSQUEEZY_WEBHOOK_SECRET=test_webhook_secret_development
```

## Webhook Security

### Signature Verification

Our webhook handler verifies LemonSqueezy signatures using HMAC SHA256:

```typescript
// This is automatically handled in billing.ts
const signature = request.headers['x-signature'] as string
const isValid = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex') === signature
```

### Security Best Practices

1. **Always verify webhook signatures** in production
2. **Use HTTPS endpoints only**
3. **Keep webhook secrets secure** and rotate them periodically
4. **Implement idempotency** - handle duplicate events gracefully
5. **Log webhook events** for debugging and audit trails

## Webhook Event Handling

Our `BillingService.processWebhook()` method handles these events:

### Subscription Events
```json
{
  "meta": {
    "event_name": "subscription_created",
    "test_mode": false
  },
  "data": {
    "id": "sub_12345",
    "attributes": {
      "customer_id": "cust_67890",
      "status": "active",
      "product_id": "prod_abc123"
    }
  }
}
```

### Payment Events
```json
{
  "meta": {
    "event_name": "subscription_payment_success",
    "test_mode": false
  },
  "data": {
    "id": "inv_12345",
    "attributes": {
      "subscription_id": "sub_67890",
      "subtotal": 2900,
      "currency": "USD"
    }
  }
}
```

## Testing Webhooks

### Mock Development Endpoints

For testing in development mode:

```bash
# Get mock account info
GET /api/billing/mock/info

# Reset mock data
POST /api/billing/mock/reset
```

### Test Event Processing

You can test webhook processing by sending POST requests to your webhook endpoint:

```bash
curl -X POST http://localhost:3000/api/billing/webhook \
  -H "Content-Type: application/json" \
  -H "X-Signature: your_test_signature" \
  -d '{
    "meta": {
      "event_name": "subscription_created",
      "test_mode": true
    },
    "data": {
      "id": "sub_test_123",
      "attributes": {
        "customer_id": "cust_test_456", 
        "status": "active"
      }
    }
  }'
```

## Database Integration

Webhook events automatically update these database tables:

- `billing_subscriptions` - Subscription status changes
- `billing_events` - Complete webhook event log
- `billing_invoices` - Payment records
- `users` - Cached subscription status for quick access

## Monitoring and Debugging

### Webhook Event Logs

All webhook events are logged in the `billing_events` table:

```sql
-- View recent webhook events
SELECT event_type, processed, created_at, processing_error 
FROM billing_events 
ORDER BY created_at DESC 
LIMIT 20;

-- Check for failed webhook processing
SELECT * FROM billing_events 
WHERE processed = false OR processing_error IS NOT NULL;
```

### Application Logs

Check application logs for webhook processing:

```bash
# Production logs
pm2 logs core-api

# Development logs  
npm run dev
```

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Check that `LEMONSQUEEZY_WEBHOOK_SECRET` matches LemonSqueezy dashboard
   - Ensure payload is not modified before verification

2. **Webhooks not received**
   - Verify webhook URL is publicly accessible
   - Check LemonSqueezy webhook logs for delivery failures
   - Ensure your endpoint returns 200 status codes

3. **Database errors**
   - Run the billing schema migration: `psql -f database/billing-schema.sql`
   - Check database connectivity and permissions

4. **Duplicate event processing**
   - Webhooks may be sent multiple times
   - Implement idempotency checks using `billing_events` table

### Test Webhook Delivery

```bash
# Test if your webhook endpoint is accessible
curl -X POST https://your-domain.com/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return: {"success": true}
```

## Production Checklist

- [ ] Database schema deployed (`billing-schema.sql`)
- [ ] Environment variables configured
- [ ] Webhook endpoint configured in LemonSqueezy dashboard
- [ ] Webhook signature verification enabled
- [ ] Test events successfully processed
- [ ] Monitoring and logging configured
- [ ] Error alerting set up for failed webhook processing

## Support

For webhook-related issues:
1. Check the `billing_events` table for error details
2. Review application logs for processing errors
3. Verify LemonSqueezy webhook delivery logs
4. Test webhook endpoint accessibility

For LemonSqueezy-specific issues, refer to their [webhook documentation](https://docs.lemonsqueezy.com/api/webhooks).