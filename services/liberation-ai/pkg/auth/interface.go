package auth

import (
	"context"
	"time"
)

// User represents an authenticated user
type User struct {
	ID       string            `json:"id"`
	Email    string            `json:"email,omitempty"`
	Name     string            `json:"name,omitempty"`
	Picture  string            `json:"picture,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
	Roles    []string          `json:"roles,omitempty"`
	Scopes   []string          `json:"scopes,omitempty"`
}

// AuthContext contains authentication information for a request
type AuthContext struct {
	User        *User             `json:"user"`
	Token       string            `json:"token,omitempty"`
	ExpiresAt   time.Time         `json:"expires_at,omitempty"`
	Permissions []string          `json:"permissions,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// AuthProvider defines the interface for authentication providers
type AuthProvider interface {
	// Name returns the provider name (e.g., "jwt", "auth0", "keycloak", "none")
	Name() string

	// ValidateToken validates a token and returns user information
	ValidateToken(ctx context.Context, token string) (*AuthContext, error)

	// GetUserInfo retrieves user information by user ID
	GetUserInfo(ctx context.Context, userID string) (*User, error)

	// CheckPermission checks if a user has permission for a specific resource/action
	CheckPermission(ctx context.Context, userID, resource, action string) (bool, error)

	// RefreshToken refreshes an access token (if supported)
	RefreshToken(ctx context.Context, refreshToken string) (*AuthContext, error)

	// Health checks if the auth provider is healthy
	Health(ctx context.Context) error
}

// PermissionLevel defines common permission levels
type PermissionLevel string

const (
	PermissionNone      PermissionLevel = "none"
	PermissionRead      PermissionLevel = "read"
	PermissionWrite     PermissionLevel = "write"
	PermissionAdmin     PermissionLevel = "admin"
	PermissionSuperuser PermissionLevel = "superuser"
)

// Resource defines common resources in Liberation AI
type Resource string

const (
	ResourceVectors    Resource = "vectors"
	ResourceNamespaces Resource = "namespaces"
	ResourceStats      Resource = "stats"
	ResourceHealth     Resource = "health"
	ResourceCost       Resource = "cost"
	ResourceAdmin      Resource = "admin"
)

// Action defines common actions
type Action string

const (
	ActionRead   Action = "read"
	ActionWrite  Action = "write"
	ActionDelete Action = "delete"
	ActionAdmin  Action = "admin"
)

// AuthError represents authentication/authorization errors
type AuthError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e *AuthError) Error() string {
	return e.Message
}

// Common auth error codes
const (
	ErrCodeInvalidToken     = "invalid_token"
	ErrCodeExpiredToken     = "expired_token"
	ErrCodeInsufficientPerm = "insufficient_permissions"
	ErrCodeUserNotFound     = "user_not_found"
	ErrCodeProviderError    = "provider_error"
	ErrCodeConfigError      = "config_error"
)

// NewAuthError creates a new auth error
func NewAuthError(code, message, details string) *AuthError {
	return &AuthError{
		Code:    code,
		Message: message,
		Details: details,
	}
}

// ProviderConfig represents configuration for auth providers
type ProviderConfig struct {
	Type     string                 `yaml:"type" json:"type"`
	Enabled  bool                   `yaml:"enabled" json:"enabled"`
	Settings map[string]interface{} `yaml:"settings" json:"settings"`
}
