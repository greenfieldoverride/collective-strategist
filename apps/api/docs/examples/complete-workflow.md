# Complete Workflow Example

This example demonstrates a complete end-to-end workflow using The Collective Strategist API, from user registration to AI-powered business advice and content creation.

## Scenario

Sarah is launching a new SaaS product for small business inventory management. She wants to:

1. Set up her business context
2. Get strategic advice on go-to-market strategy
3. Generate content for her product launch
4. Publish content to social media
5. Monitor market response

## Step 1: User Registration

First, Sarah registers for The Collective Strategist platform:

```bash
curl -X POST https://api.collective-strategist.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@inventorymax.com",
    "password": "SecurePassword123!",
    "tier": "individual_pro"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-sarah-123",
      "email": "sarah@inventorymax.com",
      "tier": "individual_pro",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

Sarah saves her JWT token for subsequent API calls.

## Step 2: Create Contextual Core

Sarah uploads her business context to create a personalized AI experience:

```bash
curl -X POST https://api.collective-strategist.com/api/v1/contextual-core \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "InventoryMax - SaaS Launch",
    "businessType": "B2B SaaS",
    "industry": "Small Business Software",
    "targetAudience": "Small business owners with 5-50 employees who struggle with manual inventory tracking",
    "valueProposition": "Automated inventory management that saves 10+ hours per week and prevents stockouts",
    "brandVoice": "Professional yet approachable, focused on practical solutions and ROI",
    "businessModel": "Subscription SaaS with freemium tier",
    "stage": "Pre-launch (MVP ready)",
    "goals": [
      "Acquire 100 paying customers in first 6 months",
      "Achieve $10k MRR by end of year 1",
      "Build thought leadership in inventory management space"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "core-inventorymax-456",
    "name": "InventoryMax - SaaS Launch",
    "status": "active",
    "embeddingGenerated": true,
    "createdAt": "2024-01-15T10:05:00Z"
  }
}
```

## Step 3: Strategic Consultation

Sarah asks the AI consultant for go-to-market strategy advice:

```bash
curl -X POST https://api.collective-strategist.com/api/v1/ai-consultant/ask \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-inventorymax-456",
    "sessionType": "strategic_advice",
    "query": "What is the best go-to-market strategy for my inventory management SaaS targeting small businesses? Should I focus on freemium or direct sales?",
    "includeMarketData": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Based on your inventory management SaaS for small businesses and current market conditions, I recommend a hybrid go-to-market approach:\n\n**Primary Strategy: Content-Led Growth with Freemium**\n\n1. **Freemium Foundation**: Start with a generous freemium tier (up to 100 SKUs) to reduce friction and let users experience value before paying.\n\n2. **Content Marketing**: Small business owners research solutions extensively. Create practical guides, inventory management templates, and ROI calculators.\n\n3. **Strategic Partnerships**: Partner with small business tools (POS systems, accounting software) for integration-driven growth.\n\n**Why This Works for Your Market:**\n- Small businesses are price-sensitive and need to see clear ROI\n- Your target segment (5-50 employees) values practical, proven solutions\n- Market data shows 67% increase in searches for 'small business inventory software'\n\n**Recommended Timeline:**\n- Months 1-2: Launch freemium + content strategy\n- Months 3-4: Add direct outreach to freemium users showing ROI\n- Months 5-6: Implement partner channel strategy",
    "confidenceScore": 0.89,
    "marketDataUsed": [
      {
        "source": "google_trends",
        "data": "67% increase in 'small business inventory software' searches",
        "relevance": 0.94
      },
      {
        "source": "linkedin",
        "data": "Small business owners actively engaging with ROI-focused content",
        "relevance": 0.87
      }
    ],
    "recommendations": [
      "Launch with freemium tier (up to 100 SKUs free)",
      "Create weekly content targeting inventory pain points",
      "Build integrations with popular small business tools",
      "Implement usage-based upgrade prompts in freemium tier"
    ],
    "nextSteps": [
      "Set up freemium tier limits and upgrade triggers",
      "Create content calendar for inventory management topics",
      "Research partnership opportunities with POS/accounting tools",
      "Design in-app ROI calculator for upgrade conversion"
    ],
    "processingTimeMs": 2150
  }
}
```

## Step 4: Market Analysis

Sarah wants to understand current market trends:

```bash
curl -X POST https://api.collective-strategist.com/api/v1/ai-consultant/market-analysis \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-inventorymax-456",
    "analysisType": "trends",
    "timeRange": "month",
    "platforms": ["twitter", "linkedin", "google_trends"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "opportunity",
        "title": "Supply Chain Digitization Acceleration",
        "description": "Small businesses increasingly adopting digital inventory solutions due to supply chain disruptions. 45% growth in related discussions.",
        "confidence": 0.93,
        "impact": "high",
        "timeframe": "short_term",
        "actionable": true,
        "dataSource": "linkedin"
      },
      {
        "type": "trend",
        "title": "Integration-First Tool Selection",
        "description": "Small businesses prioritizing tools that integrate with existing software stack rather than standalone solutions.",
        "confidence": 0.87,
        "impact": "medium",
        "timeframe": "ongoing",
        "actionable": true,
        "dataSource": "twitter"
      }
    ],
    "trends": [
      {
        "keyword": "inventory management software",
        "platform": "google_trends",
        "engagementRate": 0.12,
        "growthRate": 0.67,
        "relevanceScore": 0.95,
        "peakDate": "2024-01-10T00:00:00Z"
      },
      {
        "keyword": "small business automation",
        "platform": "linkedin",
        "engagementRate": 0.08,
        "growthRate": 0.34,
        "relevanceScore": 0.82,
        "peakDate": "2024-01-12T00:00:00Z"
      }
    ],
    "recommendations": [
      "Emphasize integration capabilities in marketing messaging",
      "Create content around supply chain resilience",
      "Target businesses affected by recent supply chain issues",
      "Highlight automation benefits in cost-savings terms"
    ],
    "dataPoints": 2847,
    "lastUpdated": "2024-01-15T10:15:00Z"
  }
}
```

## Step 5: Content Generation

Based on the strategic advice, Sarah generates launch content:

### Blog Article

```bash
curl -X POST https://api.collective-strategist.com/api/v1/content-drafter/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-inventorymax-456",
    "contentType": "blog_article",
    "prompt": "Write about how small businesses can build supply chain resilience through better inventory management",
    "tone": "professional",
    "length": "long"
  }'
```

### Social Media Posts

```bash
curl -X POST https://api.collective-strategist.com/api/v1/content-drafter/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-inventorymax-456",
    "contentType": "social_post",
    "platform": "linkedin",
    "prompt": "Announce the launch of InventoryMax freemium tier",
    "tone": "professional",
    "length": "medium"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "🚀 Excited to launch InventoryMax's freemium tier! \n\nAfter talking to 200+ small business owners, one thing was clear: manual inventory tracking is costing you 10+ hours per week and leading to costly stockouts.\n\nThat's why we built InventoryMax - automated inventory management that actually works for businesses with 5-50 employees.\n\n✅ Track up to 100 SKUs free forever\n✅ Real-time stock alerts\n✅ Integrates with your existing POS\n✅ ROI calculator shows your time savings\n\nNo credit card required. See why early users are saving 12 hours per week on average.\n\nTry it free: [link]\n\n#SmallBusiness #InventoryManagement #Automation #Efficiency",
    "suggestions": [
      "Add a compelling statistic about inventory management ROI",
      "Include a customer testimonial or case study",
      "Tag relevant small business influencers",
      "Add a video demo of the product in action"
    ],
    "processingTimeMs": 1800
  }
}
```

### Email Campaign

```bash
curl -X POST https://api.collective-strategist.com/api/v1/content-drafter/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-inventorymax-456",
    "contentType": "email",
    "prompt": "Welcome email for new freemium users with onboarding steps",
    "tone": "professional",
    "length": "medium"
  }'
```

## Step 6: Social Media Integration

Sarah connects her LinkedIn account and publishes the launch post:

### Connect LinkedIn Account

```bash
curl -X POST https://api.collective-strategist.com/api/v1/social-media/connect \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "linkedin",
    "authCode": "linkedin-oauth-code-from-callback",
    "redirectUri": "https://app.inventorymax.com/social-callback"
  }'
```

### Publish Content

```bash
curl -X POST https://api.collective-strategist.com/api/v1/social-media/publish \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "linkedin-account-789",
    "content": "🚀 Excited to launch InventoryMax'\''s freemium tier! \n\nAfter talking to 200+ small business owners, one thing was clear: manual inventory tracking is costing you 10+ hours per week and leading to costly stockouts...",
    "hashtags": ["#SmallBusiness", "#InventoryManagement", "#Automation"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postId": "linkedin-post-12345",
    "url": "https://linkedin.com/posts/sarah-inventorymax_12345",
    "published": true
  }
}
```

## Step 7: Monitor Market Response

After launching, Sarah monitors social media engagement and market sentiment:

### Get Social Media Analytics

```bash
curl -X GET https://api.collective-strategist.com/api/v1/social-media/analytics/linkedin-account-789?timeRange=week \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Track Keyword Performance

```bash
curl -X POST https://api.collective-strategist.com/api/v1/social-media/market-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "linkedin",
    "keywords": ["InventoryMax", "inventory management", "small business automation"],
    "timeRange": "week",
    "metrics": ["mentions", "sentiment", "engagement"]
  }'
```

## Step 8: Iterate Based on Results

After a week, Sarah asks for advice on optimizing her strategy:

```bash
curl -X POST https://api.collective-strategist.com/api/v1/ai-consultant/ask \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-inventorymax-456",
    "sessionType": "strategic_advice",
    "query": "My freemium launch got good engagement (50 signups in first week), but only 2 conversions to paid. How should I optimize my conversion strategy?",
    "includeMarketData": true
  }'
```

## Complete Workflow Results

After following this workflow, Sarah achieved:

### Immediate Results (Week 1)
- **Strategic Clarity**: Clear go-to-market strategy with specific tactics
- **Content Created**: 1 blog article, 5 social posts, 3 email templates
- **Social Presence**: Professional launch announcement with good engagement
- **Early Traction**: 50 freemium signups, 2 paid conversions

### Optimization Actions (Week 2+)
- **Enhanced Onboarding**: Added in-app ROI calculator based on AI advice
- **Content Strategy**: Weekly content calendar focused on inventory pain points
- **Partnership Outreach**: Contacted 10 POS/accounting software providers
- **Conversion Optimization**: Implemented usage-based upgrade prompts

### Key Success Factors

1. **Contextual AI**: Business-specific advice instead of generic recommendations
2. **Integrated Workflow**: Seamless flow from strategy → content → distribution → analysis
3. **Data-Driven Decisions**: Market insights informing strategic choices
4. **Rapid Iteration**: Quick feedback loops for strategy optimization

## Code Examples

### JavaScript SDK Usage

```javascript
import { CollectiveStrategist } from '@collective-strategist/sdk';

const client = new CollectiveStrategist({ apiKey: process.env.API_KEY });

// Complete workflow in code
async function launchStrategy() {
  // 1. Create contextual core
  const core = await client.contextualCore.create({
    name: "InventoryMax - SaaS Launch",
    businessType: "B2B SaaS",
    // ... other context
  });

  // 2. Get strategic advice
  const advice = await client.aiConsultant.ask({
    contextualCoreId: core.id,
    sessionType: 'strategic_advice',
    query: 'What is the best go-to-market strategy?'
  });

  // 3. Generate content
  const content = await client.contentDrafter.generate({
    contextualCoreId: core.id,
    contentType: 'social_post',
    platform: 'linkedin'
  });

  // 4. Publish to social media
  const post = await client.socialMedia.publish({
    accountId: 'linkedin-account-789',
    content: content.content
  });

  return { advice, content, post };
}
```

This complete workflow demonstrates how The Collective Strategist API can power an entire business launch strategy, from initial planning through execution and optimization.