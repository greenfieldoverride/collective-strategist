# API Reference

## Overview

The Collective Strategist API provides comprehensive business intelligence, strategic consulting, and content generation capabilities through RESTful endpoints.

**Base URL**: `https://api.collective-strategist.com/api/v1`  
**Authentication**: Bearer Token (JWT)  
**Content-Type**: `application/json`

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```bash
# Register a new user
curl -X POST https://api.collective-strategist.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "tier": "individual_pro"
  }'

# Response includes token
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **AI Requests**: 100 AI generation requests per hour
- **Social Media**: Limited by platform API quotas

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": [] // Optional validation details
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Missing or invalid token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `AI_SERVICE_ERROR`: AI service unavailable
- `SOCIAL_MEDIA_ERROR`: Social platform API error

## Endpoint Categories

### 🔐 [Authentication](./authentication.md)
User registration, login, token management

### 🧠 [Contextual Core](./contextual-core.md)
Business context and brand voice storage

### 🤖 [AI Consultant](./ai-consultant.md)
Strategic business advice and market analysis

### ✍️ [Content Drafter](./content-drafter.md)
AI-powered content generation and management

### 📱 [Social Media](./social-media.md)
Platform integration, publishing, and analytics

### 📊 [Market Monitor](./market-monitor.md)
Real-time trend and competitor analysis

## Common Request Patterns

### Pagination

Many list endpoints support pagination:

```bash
GET /api/v1/resource?limit=20&offset=40
```

**Parameters:**
- `limit`: Number of items (max 100, default 20)
- `offset`: Number of items to skip (default 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "hasMore": true
  }
}
```

### Filtering

List endpoints often support filtering:

```bash
GET /api/v1/content-drafter/drafts/123?contentType=social_post&published=false
```

### Sorting

Some endpoints support sorting:

```bash
GET /api/v1/ai-consultant/sessions/123?sort=createdAt&order=desc
```

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "processingTime": 150,
    "version": "1.0.0"
  }
}
```

## Webhook Events

The API can send webhook notifications for important events:

### Event Types
- `user.registered`: New user registration
- `content.generated`: AI content creation
- `social.published`: Content published to social media
- `consultation.completed`: AI consultation session finished

### Webhook Payload
```json
{
  "event": "content.generated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "userId": "user-123",
    "contentId": "content-456",
    "contentType": "social_post"
  }
}
```

## SDK Support

### JavaScript/TypeScript

```bash
npm install @collective-strategist/sdk
```

```typescript
import { CollectiveStrategist } from '@collective-strategist/sdk';

const client = new CollectiveStrategist({
  apiKey: 'your-api-key',
  baseURL: 'https://api.collective-strategist.com'
});

// Generate strategic advice
const advice = await client.aiConsultant.ask({
  contextualCoreId: 'core-123',
  sessionType: 'strategic_advice',
  query: 'How can I improve my pricing strategy?'
});
```

### Python

```bash
pip install collective-strategist
```

```python
from collective_strategist import Client

client = Client(api_key='your-api-key')

# Generate content
content = client.content_drafter.generate(
    contextual_core_id='core-123',
    content_type='social_post',
    prompt='Create a post about AI trends'
)
```

## API Versioning

- **Current Version**: v1
- **Version Header**: `API-Version: v1` (optional)
- **Deprecation**: 90-day notice for breaking changes
- **Backward Compatibility**: Maintained within major versions

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:
- **Interactive**: `https://api.collective-strategist.com/docs`
- **JSON**: `https://api.collective-strategist.com/docs/json`
- **YAML**: `https://api.collective-strategist.com/docs/yaml`

## Status Monitoring

- **Status Page**: `https://status.collective-strategist.com`
- **Health Check**: `https://api.collective-strategist.com/health`
- **Metrics**: `https://api.collective-strategist.com/metrics`

## Support

- **Documentation Issues**: [GitHub Issues](https://github.com/collective-strategist/docs/issues)
- **API Questions**: api-support@collective-strategist.com
- **Bug Reports**: bugs@collective-strategist.com
- **Feature Requests**: features@collective-strategist.com