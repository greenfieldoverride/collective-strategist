# Payment Architecture & Billing Strategy

## Overview
The Collective Strategist uses a **venture-based billing model** with liberation-focused pricing that supports sovereign circles while enabling sustainable growth for professional ventures.

## Payment Provider: UPDATED STRATEGY (LemonSqueezy → Stripe Acquisition)

### Major Development: Stripe Acquired LemonSqueezy
**Status**: LemonSqueezy has been acquired by Stripe, fundamentally changing our payment provider landscape.

### Strategic Reassessment Required

#### Option 1: Embrace Stripe Integration
**Pros:**
- **Unified ecosystem**: Direct Stripe integration with LemonSqueezy's merchant-of-record benefits
- **Stability**: Backed by the largest payment processor
- **Resources**: Enhanced development and global expansion
- **API continuity**: Likely to maintain LemonSqueezy's developer-friendly approach

**Cons:**
- **Corporate consolidation**: Stripe's dominance reduces payment provider diversity
- **Liberation concerns**: Large corporate control over payment infrastructure
- **Pricing uncertainty**: May adopt Stripe's pricing model over time

#### Option 2: Migrate to Alternative MoR Provider
**Candidates:**
- **Paddle**: Strong merchant-of-record service, developer-friendly
- **FastSpring**: Global e-commerce platform with MoR services
- **Ghost Commerce**: Independent, creator-focused (if available)

#### Option 3: Hybrid Approach
- **Primary**: Continue with LemonSqueezy/Stripe for stability
- **Secondary**: Implement Paddle as backup/alternative
- **Liberation Option**: Direct payment links for sovereign circles

## Billing Tiers & Pricing

### Liberation Tier (FREE)
- **Who**: Sovereign circles, Greenfield affiliates, liberation-focused collectives
- **Features**: Full platform access, up to 50 members
- **Philosophy**: Liberation work should be free from corporate extraction
- **Payment**: No payment processing needed - direct platform access

### Collective Basic ($19/month)
- **Who**: Small professional ventures
- **Features**: Up to 5 members, core AI consultant, basic integrations
- **Trial**: 14-day free trial
- **Payment Options**: LemonSqueezy/Stripe, Paddle (backup), direct payment for sovereign circles

### Collective Pro ($39/month)
- **Who**: Growing professional ventures
- **Features**: Up to 15 members, advanced analytics, all integrations
- **Trial**: 14-day free trial
- **Payment Options**: LemonSqueezy/Stripe, Paddle (backup), direct payment for sovereign circles

### Collective Scale ($79/month)
- **Who**: Large cooperatives and professional teams
- **Features**: Up to 50 members, enterprise features, priority support
- **Trial**: 14-day free trial
- **Payment Options**: LemonSqueezy/Stripe, Paddle (backup), direct payment for sovereign circles

## Liberation-Focused Payment Philosophy

### Post-Acquisition Strategy
Given Stripe's acquisition of LemonSqueezy, we maintain our commitment to liberation technology principles:

1. **Provider Diversity**: Implement multiple payment options to avoid single-point dependence
2. **Sovereign Circle Support**: Direct payment methods bypassing corporate payment processors
3. **Transparent Pricing**: Clear, predictable costs with no hidden fees
4. **Data Sovereignty**: Users control their financial data and can export/migrate easily

## Payment Flow Architecture

### Trial Implementation
```typescript
const createVentureWithTrial = async (ventureData: CreateVentureRequest) => {
  if (ventureData.ventureType === 'sovereign_circle' || ventureData.isGreenfieldAffiliate) {
    // Liberation tier - permanently free
    return createVenture({ ...ventureData, billingTier: 'liberation' })
  } else {
    // Professional ventures - 14-day trial
    return createVenture({ 
      ...ventureData, 
      billingTier: 'collective_basic',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    })
  }
}
```

### Billing Enforcement
- **Member limits**: Enforced at venture level
- **Feature access**: Tier-based permissions
- **Usage tracking**: AI queries, integrations, data export
- **Grace period**: 7 days past due before feature restrictions

## Database Schema

### Subscription Tracking
```sql
CREATE TABLE venture_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
    lemonsqueezy_subscription_id VARCHAR(255) UNIQUE,
    lemonsqueezy_customer_id VARCHAR(255),
    billing_tier VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Webhook Events
```sql
CREATE TABLE lemonsqueezy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    subscription_id VARCHAR(255),
    customer_id VARCHAR(255),
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Liberation-Focused UX

### Values-Driven Messaging
- **Trial start**: "Start your 14-day journey toward collective financial liberation"
- **Upgrade prompt**: "Expand your collective's capacity to create change"
- **Cancellation**: "No guilt trips - disconnect anytime with full data export"

### Solidarity Features
- **Liberation Fund**: 10% of revenue supports free-tier users
- **Community Billing**: Option for solidarity networks to share costs
- **Transparent Pricing**: Show exactly where money goes
- **Data Sovereignty**: Full export on cancellation, no vendor lock-in

## Success Metrics

### Business Health
- Trial-to-paid conversion rate (target: >20%)
- Monthly churn rate (target: <5%)
- Average revenue per venture
- Customer satisfaction scores

### Liberation Impact
- Sovereign circles supported (free tier usage)
- Creator income tracked (platform facilitated revenue)
- Community connections (venture collaborations)
- Values alignment score (user satisfaction with ethics)

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] LemonSqueezy API integration
- [ ] Webhook handling
- [ ] Trial period logic
- [ ] Basic billing UI

### Phase 2: Enhancement (Weeks 3-4)
- [ ] Advanced subscription management
- [ ] Usage enforcement
- [ ] Liberation fund allocation
- [ ] Community billing features

### Phase 3: Optimization (Month 2)
- [ ] A/B testing on conversion flows
- [ ] Advanced analytics
- [ ] Solidarity network billing
- [ ] Enterprise features