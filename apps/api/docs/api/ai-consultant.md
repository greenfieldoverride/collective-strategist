# AI Consultant API

The AI Consultant provides strategic business advice, market analysis, and data-driven insights tailored to your specific business context.

## Endpoints

### Get Strategic Advice

Ask the AI consultant for strategic business advice based on your contextual core.

```http
POST /api/v1/ai-consultant/ask
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "contextualCoreId": "123e4567-e89b-12d3-a456-426614174000",
  "sessionType": "strategic_advice",
  "query": "How can I improve my customer acquisition strategy?",
  "includeMarketData": true,
  "aiProvider": "claude"
}
```

**Parameters:**
- `contextualCoreId` (string, required): UUID of your business context
- `sessionType` (string, required): Type of consultation
  - `strategic_advice`: General business strategy guidance
  - `trend_analysis`: Market and industry trend analysis  
  - `goal_planning`: Strategic goal setting and roadmapping
  - `market_analysis`: Competitive and market positioning
- `query` (string, required): Your strategic question (10-2000 chars)
- `includeMarketData` (boolean, optional): Include current market data (default: true)
- `aiProvider` (string, optional): Preferred AI model

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Based on your SaaS business context and current market conditions...",
    "confidenceScore": 0.85,
    "marketDataUsed": [
      {
        "source": "twitter",
        "data": "Growing interest in AI automation tools",
        "relevance": 0.92
      }
    ],
    "recommendations": [
      "Focus on content marketing to build thought leadership",
      "Implement referral program for existing customers",
      "Optimize onboarding flow to reduce churn"
    ],
    "nextSteps": [
      "Create content calendar for next 30 days",
      "Design referral incentive structure",
      "Analyze current onboarding completion rates"
    ],
    "processingTimeMs": 1250
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "processingTime": 1250,
    "aiProvider": "claude"
  }
}
```

### Market Analysis

Get comprehensive market analysis including trends, opportunities, and competitive intelligence.

```http
POST /api/v1/ai-consultant/market-analysis
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "contextualCoreId": "123e4567-e89b-12d3-a456-426614174000",
  "analysisType": "trends",
  "timeRange": "week",
  "platforms": ["twitter", "linkedin", "google_trends"]
}
```

**Parameters:**
- `contextualCoreId` (string, required): UUID of your business context
- `analysisType` (string, required): Type of analysis
  - `trends`: Market trends and emerging patterns
  - `competitors`: Competitive landscape analysis
  - `opportunities`: Market gaps and opportunities
  - `keywords`: Keyword and topic analysis
- `timeRange` (string, optional): Analysis time window (default: "week")
  - `day`: Last 24 hours
  - `week`: Last 7 days  
  - `month`: Last 30 days
  - `quarter`: Last 90 days
- `platforms` (array, optional): Data sources to include
  - `twitter`, `linkedin`, `instagram`, `tiktok`, `google_trends`, `reddit`

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "opportunity",
        "title": "Growing Interest in AI Automation",
        "description": "34% increase in AI automation discussions in your target market",
        "confidence": 0.92,
        "impact": "high",
        "timeframe": "short_term",
        "actionable": true,
        "dataSource": "twitter"
      }
    ],
    "trends": [
      {
        "keyword": "AI automation",
        "platform": "twitter",
        "engagementRate": 0.045,
        "growthRate": 0.34,
        "relevanceScore": 0.89,
        "peakDate": "2024-01-14T15:30:00Z"
      }
    ],
    "recommendations": [
      "Create content around AI automation trends",
      "Position your product as automation solution",
      "Monitor competitor responses to trend"
    ],
    "dataPoints": 1247,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### Get Consultation History

Retrieve your consultation session history for a specific contextual core.

```http
GET /api/v1/ai-consultant/sessions/{contextualCoreId}
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (integer, optional): Number of sessions to return (max 100, default 20)
- `offset` (integer, optional): Number of sessions to skip (default 0)
- `sessionType` (string, optional): Filter by session type

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-456",
        "userId": "user-123",
        "contextualCoreId": "core-789",
        "sessionType": "strategic_advice",
        "query": "How can I improve customer retention?",
        "response": "Based on your business context...",
        "aiProviderUsed": "claude",
        "marketDataReferenced": [],
        "confidenceScore": 0.87,
        "sessionMetadata": {
          "includeMarketData": true,
          "processingTimeMs": 1100
        },
        "createdAt": "2024-01-15T09:15:00Z"
      }
    ],
    "total": 45,
    "hasMore": true
  }
}
```

### Get Specific Session

Retrieve details of a specific consultation session.

```http
GET /api/v1/ai-consultant/sessions/{contextualCoreId}/{sessionId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-456",
    "userId": "user-123", 
    "contextualCoreId": "core-789",
    "sessionType": "strategic_advice",
    "query": "How can I improve customer retention?",
    "response": "Based on your SaaS business model and current metrics...",
    "aiProviderUsed": "claude",
    "marketDataReferenced": [
      {
        "source": "industry_report",
        "data": "SaaS average churn rate: 5-7% monthly",
        "relevance": 0.95
      }
    ],
    "confidenceScore": 0.87,
    "sessionMetadata": {
      "includeMarketData": true,
      "processingTimeMs": 1100,
      "modelVersion": "claude-3-haiku-20240307"
    },
    "createdAt": "2024-01-15T09:15:00Z"
  }
}
```

## Session Types Deep Dive

### Strategic Advice
General business strategy, growth planning, positioning, and high-level decision making.

**Best For:**
- Business model optimization
- Growth strategy planning
- Competitive positioning
- Resource allocation decisions

**Example Queries:**
- "Should I pivot my pricing model to freemium?"
- "How can I differentiate from competitors?"
- "What's the best go-to-market strategy for my product?"

### Trend Analysis  
Market trends, industry shifts, and emerging opportunities analysis.

**Best For:**
- Staying ahead of market changes
- Identifying new opportunities
- Understanding industry evolution
- Timing strategic moves

**Example Queries:**
- "What trends will impact my industry in the next 6 months?"
- "Are there emerging technologies I should adopt?"
- "How is customer behavior changing in my market?"

### Goal Planning
Strategic goal setting, roadmap creation, and milestone planning.

**Best For:**
- Setting strategic objectives
- Creating execution roadmaps
- Resource planning
- Timeline development

**Example Queries:**
- "Help me set realistic growth goals for next year"
- "What milestones should I target for product launch?"
- "How should I prioritize my strategic initiatives?"

### Market Analysis
Competitive landscape, market positioning, and opportunity assessment.

**Best For:**
- Competitive intelligence
- Market sizing and positioning
- Opportunity identification
- Entry strategy planning

**Example Queries:**
- "Who are my main competitors and how do I compare?"
- "What's the size of my addressable market?"
- "Where are the gaps in the current market?"

## Integration Examples

### JavaScript/TypeScript

```typescript
import { CollectiveStrategist } from '@collective-strategist/sdk';

const client = new CollectiveStrategist({ apiKey: 'your-api-key' });

// Get strategic advice
const advice = await client.aiConsultant.ask({
  contextualCoreId: 'core-123',
  sessionType: 'strategic_advice',
  query: 'How can I improve my pricing strategy?',
  includeMarketData: true
});

console.log(advice.recommendations);

// Get market analysis
const analysis = await client.aiConsultant.analyzeMarket({
  contextualCoreId: 'core-123',
  analysisType: 'trends',
  timeRange: 'month',
  platforms: ['twitter', 'linkedin']
});

console.log(analysis.insights);
```

### Python

```python
from collective_strategist import Client

client = Client(api_key='your-api-key')

# Get strategic advice
advice = client.ai_consultant.ask(
    contextual_core_id='core-123',
    session_type='strategic_advice',
    query='How can I improve my pricing strategy?',
    include_market_data=True
)

print(advice.recommendations)

# Get consultation history
history = client.ai_consultant.get_sessions(
    contextual_core_id='core-123',
    limit=10
)

for session in history.sessions:
    print(f"{session.created_at}: {session.query}")
```

### cURL Examples

```bash
# Get strategic advice
curl -X POST https://api.collective-strategist.com/api/v1/ai-consultant/ask \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-123",
    "sessionType": "strategic_advice", 
    "query": "How can I scale my business to $1M ARR?",
    "includeMarketData": true
  }'

# Get market analysis
curl -X POST https://api.collective-strategist.com/api/v1/ai-consultant/market-analysis \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "contextualCoreId": "core-123",
    "analysisType": "opportunities",
    "timeRange": "month"
  }'

# Get session history
curl -X GET "https://api.collective-strategist.com/api/v1/ai-consultant/sessions/core-123?limit=5" \
  -H "Authorization: Bearer your-token"
```

## Best Practices

### Query Optimization
- **Be Specific**: Include specific context, metrics, or constraints
- **Focus**: Ask one clear question per session
- **Context**: Reference your business model, stage, or industry when relevant

### Session Management
- **Track Sessions**: Use session history to build on previous advice
- **Follow Up**: Reference previous sessions for continuity
- **Document**: Save important recommendations for implementation tracking

### Market Data Usage
- **Enable Market Data**: Include current market context for better advice
- **Regular Analysis**: Run market analysis regularly to stay current
- **Cross-Reference**: Compare market insights with business performance

## Rate Limits

- **Strategic Advice**: 50 requests per hour
- **Market Analysis**: 20 requests per hour  
- **Session Retrieval**: 200 requests per hour

## Error Handling

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_UNAVAILABLE",
    "message": "AI service is temporarily unavailable",
    "retryAfter": 30
  }
}
```

**Common Errors:**
- `CONTEXTUAL_CORE_NOT_FOUND`: Invalid or inaccessible contextual core
- `QUERY_TOO_SHORT`: Query must be at least 10 characters
- `QUERY_TOO_LONG`: Query exceeds 2000 character limit
- `AI_SERVICE_ERROR`: AI service error or timeout
- `RATE_LIMIT_EXCEEDED`: Too many requests