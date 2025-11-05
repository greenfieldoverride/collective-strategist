# Liberation AI Auth Demo

Liberation AI provides **provider-agnostic authentication** that works with any auth system.

## ✅ **Current Status**

- ✅ **Provider Interface**: Pluggable auth providers
- ✅ **NoAuth Provider**: Development mode (no authentication)
- ✅ **JWT Provider**: Works with Liberation Auth, Auth0, Keycloak, etc.
- ✅ **Middleware**: Gin middleware with role/scope/permission checking
- ✅ **Configuration**: YAML-based provider configuration

## 🔌 **Supported Auth Providers**

### **1. NoAuth (Development)**
```yaml
auth:
  provider:
    type: "noauth"
    enabled: true
  optional: false
```
- **Use case**: Development, testing
- **Security**: None (allows all requests)
- **Cost**: $0

### **2. JWT (Production)**
```yaml
auth:
  provider:
    type: "jwt"
    enabled: true
    settings:
      issuer: "https://your-auth-provider.com"
      audience: "liberation-ai"
      public_key: "base64-encoded-rsa-public-key"
      jwks_url: "https://your-auth-provider.com/.well-known/jwks.json"
  optional: false
```
- **Use case**: Production with Liberation Auth, Auth0, Keycloak
- **Security**: Full JWT validation with RSA signatures
- **Cost**: $5-200/month depending on provider

### **3. Auth0 (Coming Soon)**
```yaml
auth:
  provider:
    type: "auth0"
    enabled: true
    settings:
      domain: "your-domain.auth0.com"
      audience: "liberation-ai"
```

## 🛡️ **Authorization Features**

### **Role-Based Access Control**
```go
// Require admin role
router.Use(authMiddleware.RequireRole("admin"))

// Require any of multiple roles
router.Use(authMiddleware.RequireRole("admin", "editor", "viewer"))
```

### **Scope-Based Authorization**
```go
// Require specific OAuth scopes
router.Use(authMiddleware.RequireScope("vectors:write"))
router.Use(authMiddleware.RequireScope("vectors:read", "vectors:write"))
```

### **Resource/Action Permissions**
```go
// Fine-grained permissions
router.Use(authMiddleware.RequirePermission(
    auth.ResourceVectors, 
    auth.ActionWrite,
))
```

## 🚀 **Quick Start**

### **1. Development Mode (No Auth)**
```bash
# Setup with noauth provider
liberation-ai init
liberation-ai serve

# All requests allowed
curl http://localhost:8080/v1/vectors
curl http://localhost:8080/stats
```

### **2. Production Mode (JWT)**
```bash
# Update config to use JWT
vim liberation-ai.yml  # Change provider type to "jwt"
liberation-ai serve

# Requests require valid JWT
curl -H "Authorization: Bearer your-jwt-token" \
     http://localhost:8080/v1/vectors
```

## 🎯 **Revolutionary Benefits**

### **Traditional Enterprise Auth**
- **Auth0**: $20-200/month
- **Okta**: $50-500/month  
- **Custom middleware**: 2-4 weeks development
- **Vendor lock-in**: High switching costs

### **Liberation AI Auth**
- **Any provider**: JWT, Auth0, Keycloak, Liberation Auth
- **Zero lock-in**: Switch providers with config change
- **Development mode**: Built-in noauth provider
- **5-minute setup**: Drop-in middleware

### **Cost Comparison**
```
Enterprise: Auth0 ($50/month) + custom middleware (4 weeks)
Liberation: Any provider + zero integration time
Savings: $50/month + 4 weeks engineering time
```

## 🔗 **Integration Examples**

### **Your Existing App**
```javascript
// Your app continues using your current auth
const token = await getCurrentUserToken()

// Liberation AI respects your auth provider
const response = await fetch('http://localhost:8080/v1/vectors', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### **Multiple Auth Providers**
```yaml
# Switch providers by changing config
auth:
  provider:
    type: "auth0"     # Switch from JWT to Auth0
    # type: "jwt"     # Or back to JWT
    # type: "noauth"  # Or disable for development
```

## 🎉 **Ready for Production**

Liberation AI's provider-agnostic auth means:
- ✅ **Use your existing auth** (Auth0, Keycloak, etc.)
- ✅ **No vendor lock-in** (switch providers easily)  
- ✅ **Development friendly** (noauth mode)
- ✅ **Enterprise ready** (full RBAC/permissions)
- ✅ **Cost optimized** (choose cheapest provider)

**You can start using Liberation AI with your current auth system immediately!**