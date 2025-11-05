# Architectural Decisions Record (ADR)

## The Collective Strategist - Final Architecture Decisions

### ADR-001: Microservice Architecture with Technology Optimization
**Decision**: Use the best language for each service's specific use case
**Rationale**: Optimize for performance and ecosystem strengths rather than consistency
**Implementation**:
- **Core API**: Node.js/TypeScript (business logic, 7 years experience)
- **AI Integration**: Node.js/TypeScript (consistency with AI SDKs)
- **Contextual Core**: Python/FastAPI (superior ML ecosystem, embeddings)
- **Market Monitor**: Go (excellent for concurrent API calls)
- **The Signal**: Go (high-performance notifications, WebSockets)
- **The Guardian**: Go (systems programming, observability)

### ADR-002: Event-Driven Architecture from Start
**Decision**: Build with Redis Streams event architecture from the beginning
**Rationale**: Natural scaling, service independence, async processing, built-in resilience
**Implementation**: Redis Streams for event bus + queue, guaranteed message delivery
**Trade-off**: Increased initial complexity vs. long-term scalability benefits

### ADR-003: Privacy-First Embedding Strategy
**Decision**: Default to local sentence-transformers with optional API models
**Rationale**: Privacy paramount, cost savings, anti-pharaoh philosophy alignment
**Implementation**:
- Default: `all-mpnet-base-v2` (768 dimensions, local processing)
- Option: OpenAI/API embeddings via BYOK for users who want higher quality
- Complete user control over data processing location

### ADR-004: Comprehensive Embedding Architecture
**Decision**: Build multi-model embedding system with complete flexibility
**Rationale**: Long-term stability requires supporting any future embedding model
**Implementation**:
- Separate embeddings table supporting up to 4096 dimensions
- Model registry for local and API models
- Performance tracking and automatic optimization
- Quality feedback loops and A/B testing framework

### ADR-005: Complete User Data Sovereignty
**Decision**: Implement maximum user control over their data
**Rationale**: Privacy-first philosophy requires granular user control
**Implementation**:
- Complete data export capabilities
- Granular deletion (specific assets, conversations, market data)
- User-configurable retention periods
- Audit trails for all data operations

### ADR-006: Anti-Pharaoh Market Monitoring
**Decision**: Use only free/open data sources, no corporate API payments
**Rationale**: Anti-pharaoh philosophy - avoid funding surveillance capitalism
**Implementation**:
- Reddit API (free tier)
- Google Trends (free)
- RSS feeds and open news APIs
- Government data sources
- Respectful scraping with rate limits

### ADR-007: Variable Cost Management
**Decision**: Flexible cost structure that adapts to business growth
**Rationale**: Start conservative, scale generously as revenue grows
**Implementation**:
- Conservative default limits (50k tokens/day, 10 req/min)
- Revenue-based scaling triggers
- Cost-per-user optimization targets

### ADR-008: Frontend Technology Alignment
**Decision**: Next.js + Tailwind CSS
**Rationale**: Alignment with Greenfield Override tech stack for component sharing
**Implementation**: Shared component libraries and theming across projects

### ADR-009: File Processing Strategy
**Decision**: Background queue for all file processing with smart browser compatibility
**Rationale**: Better user experience and system performance
**Implementation**:
- All files processed via task queue
- Browser-displayable files open in new window
- Others available as downloads
- Complete version control and deletion capabilities

### ADR-010: Database Evolution Strategy
**Decision**: Comprehensive schema designed for 5+ year stability
**Rationale**: Proper abstraction layers prevent costly refactoring
**Implementation**:
- Multi-dimensional embedding support
- Model performance tracking
- Quality feedback systems
- Embedding deduplication and caching
- Complete audit trails

---

## Technology Stack Summary

### Core Services
```yaml
core-api:
  language: TypeScript/Node.js
  framework: Fastify
  purpose: Business logic, user management, orchestration

ai-integration:
  language: TypeScript/Node.js  
  framework: Fastify
  purpose: Provider-agnostic AI operations

contextual-core:
  language: Python
  framework: FastAPI
  purpose: Vector database, ML operations, file processing

market-monitor:
  language: Go
  framework: Gin/Echo
  purpose: Concurrent data collection, API integrations

the-signal:
  language: Go
  framework: Native/Gorilla
  purpose: High-performance notifications
  status: Liberation-Sourced

the-guardian:
  language: Go
  framework: Native
  purpose: AI-powered observability
  status: Liberation-Sourced
```

### Data Layer
```yaml
primary-database:
  technology: PostgreSQL 15+
  extensions: pgvector
  purpose: All business data, embeddings

event-bus:
  technology: Redis Streams
  purpose: Event-driven communication, task queue

caching:
  technology: Redis
  purpose: Session storage, rate limiting, similarity cache

file-storage:
  technology: S3-compatible
  purpose: User uploaded assets
```

### Infrastructure
```yaml
containerization: Docker + Docker Compose
orchestration: Kubernetes (future)
monitoring: Prometheus + Grafana
error-tracking: Sentry -> The Guardian
logging: Structured JSON via Pino/Zap
```

---

## Privacy & Security Decisions

### Data Processing
- **Default**: All AI processing happens locally (sentence-transformers)
- **Option**: User can opt-in to API models with their own keys
- **Principle**: No user data sent to third parties without explicit consent

### Data Storage
- **Encryption**: All sensitive data encrypted at rest
- **Access**: Users can export or delete any/all data
- **Retention**: User-configurable, default 7 years
- **Audit**: Complete logs of all data operations

### API Keys (BYOK)
- **Storage**: Encrypted with strong keys
- **Access**: Never logged or transmitted in plaintext
- **Control**: Users can add/remove/rotate at any time
- **Fallback**: Always available local processing option

---

## Performance & Scaling Decisions

### Embedding Strategy
- **Deduplication**: SHA-256 content hashing prevents duplicate embeddings
- **Caching**: Intelligent similarity search caching
- **Optimization**: Automatic model selection based on quality/cost/speed
- **Memory**: Efficient local model loading and unloading

### Event Processing
- **Async**: All heavy operations happen in background queues
- **Reliability**: Redis Streams guarantee message delivery
- **Scaling**: Services can scale independently
- **Monitoring**: Comprehensive performance metrics

### Database Scaling
- **Indexing**: Optimized for vector similarity search
- **Partitioning**: Ready for user-based partitioning
- **Archiving**: Automatic old data archiving strategies
- **Backup**: Point-in-time recovery capabilities

---

## Business Model Alignment

### Free Tier (Sovereign Circles)
- Full feature access for verified Greenfield Override users
- Local processing only (zero API costs)
- Rate limited but generous for small collectives

### Paid Tier (Individual Pro)
- Full feature access + BYOK options
- Higher rate limits
- Priority processing
- Advanced analytics

### Revenue Model
- Individual Pro subscriptions fund platform development
- Liberation-Sourced components benefit broader community
- No surveillance capitalism or data monetization

---

*These decisions prioritize long-term stability, user sovereignty, and alignment with liberation movement principles while building a commercially viable platform.*