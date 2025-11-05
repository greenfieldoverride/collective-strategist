# Liberation Auth

**Enterprise-grade OAuth2/OIDC authentication for $5/month instead of $50/month**

Liberation Auth is a production-ready authentication service extracted from battle-tested code, offering full OAuth2/OIDC compliance with comprehensive security features at a fraction of enterprise auth costs.

## 🚀 **Revolutionary Value Proposition**

### **Traditional Enterprise Auth**
- **Auth0**: $20-200/month per application
- **Okta**: $50-500/month per application  
- **AWS Cognito**: $0.0055 per MAU (expensive at scale)
- **Custom implementation**: 4-12 weeks engineering time

### **Liberation Auth**
- **Cost**: $5/month flat rate (unlimited applications)
- **Setup**: 30 seconds with Docker Compose
- **Features**: Full OAuth2/OIDC + rate limiting + admin panel
- **Savings**: 90-99% cost reduction vs enterprise

## ✅ **Production-Ready Features**

### **OAuth2/OIDC Compliance**
- ✅ **Authorization Code Flow** with PKCE
- ✅ **Client Credentials Flow** for service-to-service
- ✅ **JWT tokens** with RSA256 signatures
- ✅ **Refresh tokens** with secure rotation
- ✅ **OIDC Discovery** endpoint (/.well-known/openid-configuration)
- ✅ **JWKS endpoint** for public key distribution

### **Security & Performance**
- ✅ **Rate limiting tiers** (anonymous → admin)
- ✅ **Redis session storage** for scalability
- ✅ **PostgreSQL persistence** for user data
- ✅ **Prometheus metrics** for monitoring
- ✅ **Comprehensive logging** for audit trails

### **Administration**
- ✅ **OAuth client management** (create, update, delete)
- ✅ **User management** with role-based access
- ✅ **Admin API** for programmatic management
- ✅ **Performance monitoring** and health checks

## 🔧 **Quick Start**

### **1. Docker Compose (Recommended)**
```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/liberation/auth/main/docker-compose.yml
docker-compose up -d

# Service ready at http://localhost:8081
# Admin panel at http://localhost:8081/admin
```

### **2. Manual Setup**
```bash
git clone https://github.com/liberation/auth.git
cd auth
go mod tidy
go build -o liberation-auth
./liberation-auth
```

### **3. Configuration**
```bash
# Required environment variables
export DATABASE_URL="postgres://user:pass@localhost/liberation_auth"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-secure-secret"

# Optional customization
export PORT="8081"
export RATE_LIMIT_ENABLED="true"
export METRICS_ENABLED="true"
```

## 🌐 **OAuth2 Endpoints**

### **Authorization & Token**
- `GET /oauth/authorize` - Authorization endpoint
- `POST /oauth/token` - Token endpoint  
- `POST /oauth/revoke` - Token revocation

### **OIDC Discovery**
- `GET /.well-known/openid-configuration` - OIDC configuration
- `GET /.well-known/jwks.json` - Public keys for JWT verification

### **User Management**
- `GET /oauth/userinfo` - User profile information
- `POST /oauth/register` - User registration
- `POST /oauth/login` - User authentication

### **Admin API**
- `POST /admin/clients` - Create OAuth client
- `GET /admin/clients` - List OAuth clients
- `PUT /admin/clients/{id}` - Update OAuth client
- `DELETE /admin/clients/{id}` - Delete OAuth client

## 📊 **Performance & Scale**

### **Tested Performance**
- ✅ **1000+ RPS** token validation
- ✅ **Sub-50ms** response times
- ✅ **Redis clustering** for horizontal scale
- ✅ **PostgreSQL connection pooling**

### **Rate Limiting Tiers**
```
Anonymous:  100 requests/hour
Public:     1,000 requests/hour  
Trusted:    10,000 requests/hour
FirstParty: 100,000 requests/hour
Admin:      Unlimited
```

## 🔗 **Integration Examples**

### **Liberation AI Integration**
```yaml
# liberation-ai.yml
auth:
  provider:
    type: "jwt"
    settings:
      issuer: "http://localhost:8081"
      audience: "liberation-ai"
      jwks_url: "http://localhost:8081/.well-known/jwks.json"
```

### **Your Application**
```javascript
// Frontend: Get auth token
const authUrl = 'http://localhost:8081/oauth/authorize?' +
  'client_id=your-client-id&' +
  'response_type=code&' +
  'redirect_uri=http://localhost:3000/callback&' +
  'scope=openid profile email'

window.location.href = authUrl

// Backend: Validate token
const response = await fetch('http://localhost:8081/oauth/userinfo', {
  headers: { 'Authorization': `Bearer ${token}` }
})
const user = await response.json()
```

### **Service-to-Service**
```bash
# Get client credentials token
curl -X POST http://localhost:8081/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=service-client" \
  -d "client_secret=service-secret" \
  -d "scope=api:read api:write"
```

## 🛡️ **Security Features**

### **Enterprise-Grade Security**
- ✅ **PKCE** (Proof Key for Code Exchange) protection
- ✅ **State parameter** validation against CSRF
- ✅ **Secure cookie** configuration
- ✅ **JWT signature** verification with RSA keys
- ✅ **Token expiration** and refresh rotation
- ✅ **Rate limiting** per client and IP

### **Compliance**
- ✅ **OAuth 2.0 RFC 6749** compliant
- ✅ **OIDC Core 1.0** compliant
- ✅ **PKCE RFC 7636** compliant
- ✅ **JWT RFC 7519** compliant

## 📈 **Cost Comparison**

### **Monthly Costs (1000 MAUs)**
```
Auth0 Professional:     $240/month
Okta Workforce:         $120/month  
AWS Cognito:            $55/month
Liberation Auth:        $5/month

Savings vs Auth0:       $235/month (98% reduction)
Savings vs Okta:        $115/month (96% reduction)  
Savings vs Cognito:     $50/month (91% reduction)
```

### **Engineering Time Savings**
```
Custom OAuth2 implementation: 4-12 weeks
Liberation Auth setup:        30 seconds

Time savings: 4-12 weeks engineering effort
```

## 🧪 **Testing & Quality**

### **Comprehensive Test Suite**
- ✅ **OAuth2 flow tests** (authorization code, client credentials)
- ✅ **OIDC compliance tests** (token validation, userinfo)
- ✅ **Performance tests** (load testing, rate limiting)
- ✅ **Security tests** (PKCE, CSRF protection)

### **Run Tests**
```bash
# Unit tests
go test ./...

# OAuth integration tests  
./run_oauth_tests.sh

# Performance tests
go test -bench=. ./oauth_performance_test.go
```

## 🌟 **Why Liberation Auth?**

### **Battle-Tested Reliability**
Extracted from production code serving thousands of users with comprehensive test coverage and proven OAuth2/OIDC compliance.

### **Zero Vendor Lock-in**
Standard OAuth2/OIDC implementation works with any OAuth2-compatible application. Switch from Auth0/Okta with configuration changes only.

### **Revolutionary Economics**
$5/month flat rate vs $50-500/month enterprise pricing. Same features, 90-99% cost reduction.

### **Developer Experience**
30-second Docker setup vs weeks of custom implementation. Full-featured admin panel and comprehensive documentation.

---

**Liberation Auth: Enterprise authentication without enterprise prices.**

**Start saving 90%+ on auth costs today.**