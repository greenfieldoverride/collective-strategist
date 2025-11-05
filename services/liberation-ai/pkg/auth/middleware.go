package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware wraps an auth provider for Gin
type AuthMiddleware struct {
	provider AuthProvider
	optional bool
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(provider AuthProvider, optional bool) *AuthMiddleware {
	return &AuthMiddleware{
		provider: provider,
		optional: optional,
	}
}

// RequireAuth creates middleware that requires authentication
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return m.authHandler(false)
}

// OptionalAuth creates middleware that allows optional authentication
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return m.authHandler(true)
}

// authHandler implements the core auth logic
func (m *AuthMiddleware) authHandler(optional bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			if optional {
				c.Next()
				return
			}
			m.unauthorizedResponse(c, "missing authorization header")
			return
		}

		// Validate token with provider
		authCtx, err := m.provider.ValidateToken(c.Request.Context(), authHeader)
		if err != nil {
			if optional {
				c.Next()
				return
			}
			m.unauthorizedResponse(c, err.Error())
			return
		}

		// Store auth context in Gin context
		c.Set("auth", authCtx)
		c.Set("user", authCtx.User)
		c.Set("user_id", authCtx.User.ID)

		c.Next()
	}
}

// RequirePermission creates middleware that checks for specific permissions
func (m *AuthMiddleware) RequirePermission(resource Resource, action Action) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get auth context
		authCtx, exists := m.getAuthContext(c)
		if !exists {
			m.forbiddenResponse(c, "authentication required")
			return
		}

		// Check permission
		hasPermission, err := m.provider.CheckPermission(
			c.Request.Context(),
			authCtx.User.ID,
			string(resource),
			string(action),
		)
		if err != nil {
			m.forbiddenResponse(c, "permission check failed: "+err.Error())
			return
		}

		if !hasPermission {
			m.forbiddenResponse(c, "insufficient permissions")
			return
		}

		c.Next()
	}
}

// RequireRole creates middleware that checks for specific roles
func (m *AuthMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authCtx, exists := m.getAuthContext(c)
		if !exists {
			m.forbiddenResponse(c, "authentication required")
			return
		}

		// Check if user has any of the required roles
		userRoles := make(map[string]bool)
		for _, role := range authCtx.User.Roles {
			userRoles[role] = true
		}

		hasRole := false
		for _, role := range roles {
			if userRoles[role] {
				hasRole = true
				break
			}
		}

		if !hasRole {
			m.forbiddenResponse(c, "insufficient role")
			return
		}

		c.Next()
	}
}

// RequireScope creates middleware that checks for specific scopes
func (m *AuthMiddleware) RequireScope(scopes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authCtx, exists := m.getAuthContext(c)
		if !exists {
			m.forbiddenResponse(c, "authentication required")
			return
		}

		// Check if user has any of the required scopes
		userScopes := make(map[string]bool)
		for _, scope := range authCtx.User.Scopes {
			userScopes[scope] = true
		}

		hasScope := false
		for _, scope := range scopes {
			if userScopes[scope] {
				hasScope = true
				break
			}
		}

		if !hasScope {
			m.forbiddenResponse(c, "insufficient scope")
			return
		}

		c.Next()
	}
}

// GetAuthContext retrieves auth context from Gin context
func GetAuthContext(c *gin.Context) (*AuthContext, bool) {
	authCtx, exists := c.Get("auth")
	if !exists {
		return nil, false
	}

	auth, ok := authCtx.(*AuthContext)
	return auth, ok
}

// GetUser retrieves user from Gin context
func GetUser(c *gin.Context) (*User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}

	u, ok := user.(*User)
	return u, ok
}

// GetUserID retrieves user ID from Gin context
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}

	id, ok := userID.(string)
	return id, ok
}

// Helper methods
func (m *AuthMiddleware) getAuthContext(c *gin.Context) (*AuthContext, bool) {
	return GetAuthContext(c)
}

func (m *AuthMiddleware) unauthorizedResponse(c *gin.Context, message string) {
	c.JSON(http.StatusUnauthorized, gin.H{
		"error":    "unauthorized",
		"message":  message,
		"provider": m.provider.Name(),
	})
	c.Abort()
}

func (m *AuthMiddleware) forbiddenResponse(c *gin.Context, message string) {
	c.JSON(http.StatusForbidden, gin.H{
		"error":    "forbidden",
		"message":  message,
		"provider": m.provider.Name(),
	})
	c.Abort()
}

// AuthConfig represents authentication configuration
type AuthConfig struct {
	Provider ProviderConfig `yaml:"provider" json:"provider"`
	Optional bool           `yaml:"optional" json:"optional"`
	Enabled  bool           `yaml:"enabled" json:"enabled"`
}
