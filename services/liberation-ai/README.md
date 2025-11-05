# 🤖 Liberation AI

**Enterprise-grade AI orchestration that costs $25/month instead of $2500/month**

[![License: Liberation](https://img.shields.io/badge/License-Liberation-orange.svg)](https://github.com/liberationlicense/license/blob/v1.0.0/LICENSE.md)
[![Go Version](https://img.shields.io/badge/Go-1.21+-blue.svg)](https://golang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com)
[![Vectors](https://img.shields.io/badge/Vectors-pgvector%20%2B%20Qdrant-purple.svg)](https://pgvector.com)

Liberation AI proves that advanced AI orchestration doesn't require expensive enterprise contracts. Built with scale-aware architecture that starts cheap and grows with your success.

## 🎯 **Core Problem**

**Traditional AI Stack Costs:**
- AI Orchestration: LangSmith $200-2000/month
- Vector Database: Pinecone $70-700/month  
- Model Access: OpenAI/Anthropic $50-500/month
- Monitoring: DataDog AI $100-500/month
- **Total: $420-3700/month**

**Liberation AI Costs:**
- AI Orchestration: Liberation AI $5-25/month
- Vector Database: pgvector/Qdrant containers $0/month
- Model Access: Free tier + BYOK $0-50/month
- Monitoring: Prometheus/Grafana $0/month
- **Total: $5-75/month (up to 740x reduction!)**

## 🚀 **Scale-Aware Architecture**

### **🌱 Tier 1: Bootstrap (0-10k vectors)**
- **Vector Store**: PostgreSQL + pgvector extension
- **AI Models**: Free tier (Gemini) + local Ollama
- **Cost**: $5-15/month
- **Perfect for**: MVP, proof of concept, small teams

### **📈 Tier 2: Growth (10k-1M vectors)**
- **Vector Store**: Hybrid (pgvector + Qdrant)
- **AI Models**: Multi-provider with cost optimization
- **Cost**: $25-75/month
- **Perfect for**: Growing applications, performance critical

### **🏢 Tier 3: Scale (1M+ vectors)**
- **Vector Store**: Dedicated Qdrant/Chroma/Weaviate
- **AI Models**: Advanced routing and caching
- **Cost**: $100-300/month (still 10x cheaper than enterprise!)
- **Perfect for**: Enterprise scale, advanced features

## ⚡ **Key Features**

### **🔄 Zero-Downtime Migration**
- **Built-in migration** between vector stores
- **Gradual transition** from pgvector to dedicated
- **Performance monitoring** to know when to upgrade
- **Cost tracking** to optimize spending

### **🤖 Provider-Agnostic AI**
- **Multi-provider support** (OpenAI, Anthropic, Google, local)
- **Smart fallback** when providers fail
- **Cost optimization** routes to cheapest provider
- **BYOK support** (Bring Your Own Key)

### **🐳 Container-Native**
- **Standard container orchestration** (Docker, Podman, K8s)
- **Local AI models** via Ollama containers
- **Embedded vector databases** with pgvector
- **No vendor lock-in** - runs anywhere containers run

### **📊 Built-in Observability**
- **Prometheus metrics** for performance tracking
- **Cost monitoring** per provider and operation
- **Vector store analytics** for optimization
- **Migration readiness** indicators

## 🚀 **Quick Start**

### **Option 1: Docker Compose (Recommended)**
```bash
# Clone and start
git clone https://github.com/thegreenfieldoverride/liberation-ai
cd liberation-ai
docker-compose up -d

# Check status
curl http://localhost:8080/health
```

### **Option 2: Kubernetes**
```bash
# Deploy with Helm
helm install liberation-ai ./helm/
kubectl get pods -l app=liberation-ai
```

### **Option 3: Local Development**
```bash
# Start local stack
docker-compose -f docker-compose.local.yml up -d
go run cmd/main.go
```

## 🎯 **API Examples**

### **Store Vectors**
```bash
curl -X POST http://localhost:8080/api/v1/vectors \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "documents",
    "vectors": [
      {
        "id": "doc-1",
        "embedding": [0.1, 0.2, 0.3, ...],
        "metadata": {"title": "AI Strategy Guide", "type": "document"}
      }
    ]
  }'
```

### **Semantic Search**
```bash
curl -X POST http://localhost:8080/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "documents",
    "query": "AI cost optimization strategies",
    "limit": 10,
    "filters": {"type": "document"}
  }'
```

### **AI Chat with Context**
```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How can I reduce AI costs?",
    "namespace": "documents",
    "context_limit": 5,
    "provider": "auto"
  }'
```

## 🔧 **Migration Examples**

### **Check Migration Readiness**
```bash
liberation-ai vector analyze --check-migration
# Output: Ready to migrate. Performance would improve by 40%
```

### **Start Zero-Downtime Migration**
```bash
liberation-ai vector migrate \
  --from=postgres \
  --to=qdrant \
  --strategy=gradual \
  --parallel-reads=true
```

### **Monitor Migration Progress**
```bash
liberation-ai vector status
# Output: Migration 65% complete. ETA: 2 hours
```

## 💰 **Cost Comparison**

| Feature | Enterprise Solution | Liberation AI | Savings |
|---------|-------------------|---------------|---------|
| **Vector Database** | Pinecone $700/month | pgvector $0/month | 100% |
| **AI Orchestration** | LangSmith $2000/month | Liberation AI $25/month | 98.75% |
| **Model Access** | Enterprise APIs $500/month | Free tier + BYOK $50/month | 90% |
| **Monitoring** | DataDog $500/month | Prometheus $0/month | 100% |
| **Total** | **$3700/month** | **$75/month** | **98% savings** |

## 🌟 **Liberation Philosophy**

### **🔓 Anti-Gatekeeping**
- **No vendor lock-in** - runs on any infrastructure
- **Open protocols** - standard REST APIs and container interfaces
- **Provider choice** - use any AI service or local models
- **Transparent pricing** - no hidden costs or surprise bills

### **💰 Cost Sovereignty**
- **Start free** with local models and pgvector
- **Scale economically** with hybrid architectures
- **Choose your spend** - optimize for performance or cost
- **No forced upgrades** - migrate only when you need it

### **🎯 User Control**
- **Full observability** into costs and performance
- **Migration tools** for changing requirements
- **Local deployment** option for complete privacy
- **API compatibility** for easy switching

## 📚 **Documentation**

- [**Deployment Guide**](docs/DEPLOYMENT.md) - All deployment options
- [**API Reference**](docs/API.md) - Complete API documentation
- [**Migration Guide**](docs/MIGRATION.md) - Vector store migration
- [**Cost Optimization**](docs/COST_OPTIMIZATION.md) - Minimize spending
- [**Architecture**](docs/ARCHITECTURE.md) - Technical deep dive

## 🤝 **Getting Help**

- 📧 **Email**: [support@greenfieldoverride.com](mailto:support@greenfieldoverride.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/thegreenfieldoverride/liberation-ai/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/thegreenfieldoverride/liberation-ai/discussions)
- 📖 **Documentation**: Right here in this repo

---

**Liberation AI: Proving that enterprise AI orchestration doesn't require enterprise budgets - just revolutionary architecture.** 🚀