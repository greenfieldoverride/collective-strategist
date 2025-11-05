# The Collective Strategist API

> AI Business Consultant SaaS platform for sovereign professionals and small collectives

The Collective Strategist provides enterprise-level business intelligence, strategic consulting, and content generation capabilities through AI-powered services designed specifically for independent professionals and small teams who need professional-grade tools without enterprise costs.

## 🎯 Core Value Proposition

Replace expensive consultants, content agencies, and social media managers with an integrated AI-powered business team that learns your unique context and maintains your brand voice across all interactions.

**Traditional Cost:** $10k+/month (Consultants + Content Agency + Social Media Management)  
**Our Solution:** Professional AI capabilities at startup-friendly pricing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- AI Integration Service running

### Installation

```bash
# Clone and install dependencies
git clone <repository>
cd services/core-api
npm install

# Set up environment
cp .env.example .env
# Configure your environment variables

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Database Configuration
POSTGRES_URL=postgresql://user:password@localhost:5432/collective_strategist
REDIS_URL=redis://localhost:6379

# AI Service Configuration
AI_SERVICE_URL=http://localhost:3001

# Social Media API Keys
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI Spec**: `http://localhost:3000/docs/json`
- **Health Check**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics` (Prometheus format)

### Base URL
```
Production: https://api.collective-strategist.com
Development: http://localhost:3000
```

All API endpoints are prefixed with `/api/v1`

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Core API      │    │  AI Integration │
│   (React/Next)  │◄──►│   (Fastify)     │◄──►│   (Claude/GPT)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Data Store)  │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Cache/Queue) │
                       └─────────────────┘
```

### Service Integration

```
┌────────────────────────────────────────────────────────────────┐
│                    The Collective Strategist                    │
├────────────────────────────────────────────────────────────────┤
│                         Core API                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │    Auth     │ │ Contextual  │ │ AI Consult  │ │  Content  │ │
│  │   Routes    │ │    Core     │ │   Routes    │ │  Drafter  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Social    │ │ AI Service  │ │   Market    │ │  Events   │ │
│  │   Media     │ │   Client    │ │   Monitor   │ │  System   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Social    │      │     AI      │      │   Market    │
│  Platforms  │      │  Services   │      │    Data     │
│(Twitter,etc)│      │(Claude,GPT) │      │  Sources    │
└─────────────┘      └─────────────┘      └─────────────┘
```

## 🔧 Development

### Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:integration # Run integration tests only
```

### Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Individual route and service testing
- **Integration Tests**: End-to-end workflow testing
- **Service Tests**: AI client and external service integration
- **Mock Setup**: Complete mocking of external dependencies

```bash
# Run specific test suites
npm test -- auth.test.ts                    # Authentication tests
npm test -- ai-consultant.test.ts           # AI consultant tests
npm test -- content-drafter.test.ts         # Content generation tests
npm test -- social-media.test.ts            # Social media tests
npm test -- ai-client.test.ts               # AI service client tests
npm test -- api.integration.test.ts         # Integration tests
```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Swagger**: API documentation

## 🔐 Security

### Authentication
- JWT-based authentication
- Bearer token authorization
- Token expiration and refresh
- Secure password hashing (bcrypt)

### Authorization
- Route-level authentication middleware
- User-specific resource access
- API key management for external services

### Data Protection
- Input validation (Zod schemas)
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting (recommended)

## 📈 Monitoring & Observability

### Metrics
- Prometheus metrics endpoint (`/metrics`)
- Request/response tracking
- AI service usage monitoring
- Social media API rate limiting

### Logging
- Structured logging (Pino)
- Request/response logging
- Error tracking
- Performance monitoring

### Health Checks
- Service health endpoint (`/health`)
- Database connectivity
- External service availability
- Redis connection status

## 🚀 Deployment

### Docker Support

```dockerfile
# Dockerfile included for containerized deployment
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

```bash
# Production environment
NODE_ENV=production
LOG_LEVEL=info

# Database (Production)
POSTGRES_URL=postgresql://user:password@db.example.com:5432/collective_strategist
REDIS_URL=redis://cache.example.com:6379

# AI Service
AI_SERVICE_URL=https://ai.collective-strategist.com

# Security
JWT_SECRET=super-secure-production-secret
ALLOWED_ORIGINS=https://app.collective-strategist.com
```

## 📊 Performance

### Optimization Features
- Connection pooling (PostgreSQL)
- Redis caching
- Gzip compression
- Static asset optimization
- Database query optimization

### Recommended Setup
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: SSD recommended
- **Network**: Low latency to AI services

## 🔗 Related Services

### AI Integration Service
- Text generation and embeddings
- Model management (Claude, GPT, etc.)
- Cost tracking and optimization
- Health monitoring

### Social Media APIs
- Twitter API v2
- LinkedIn API
- Instagram Basic Display API
- TikTok API
- Facebook Graph API

### Market Data Sources
- Google Trends API
- Social media platform APIs
- News APIs
- Industry-specific data sources

## 📝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Implement features with full type safety
5. Run test suite and ensure coverage
6. Submit pull request with detailed description

### Code Standards
- TypeScript strict mode
- Comprehensive test coverage
- Clear API documentation
- Consistent error handling
- Security best practices

## 📞 Support

### Documentation
- API Reference: `/docs`
- Integration Guides: `docs/integration/`
- Examples: `docs/examples/`

### Contact
- Technical Issues: [GitHub Issues](https://github.com/org/collective-strategist/issues)
- Business Inquiries: support@collective-strategist.com
- Security Concerns: security@collective-strategist.com

---

## 📄 License

Copyright © 2024 The Collective Strategist. All rights reserved.

This software is proprietary and confidential. Unauthorized reproduction or distribution is prohibited.