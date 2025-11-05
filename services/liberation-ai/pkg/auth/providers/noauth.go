package providers

import (
	"context"
	"time"

	"liberation-ai/pkg/auth"
)

// NoAuthProvider is a development-only provider that allows all requests
type NoAuthProvider struct {
	defaultUser *auth.User
}

// NewNoAuthProvider creates a new no-auth provider
func NewNoAuthProvider() *NoAuthProvider {
	return &NoAuthProvider{
		defaultUser: &auth.User{
			ID:    "dev-user",
			Email: "dev@liberation-ai.local",
			Name:  "Development User",
			Roles: []string{"admin"},
			Scopes: []string{
				"vectors:read",
				"vectors:write",
				"vectors:delete",
				"namespaces:read",
				"stats:read",
				"admin:read",
			},
		},
	}
}

// Name returns the provider name
func (p *NoAuthProvider) Name() string {
	return "noauth"
}

// ValidateToken always returns the default dev user
func (p *NoAuthProvider) ValidateToken(ctx context.Context, token string) (*auth.AuthContext, error) {
	return &auth.AuthContext{
		User:      p.defaultUser,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24h expiry
		Permissions: []string{
			"vectors:read",
			"vectors:write",
			"vectors:delete",
			"namespaces:read",
			"stats:read",
			"admin:read",
		},
		Metadata: map[string]string{
			"provider": "noauth",
			"mode":     "development",
		},
	}, nil
}

// GetUserInfo returns the default dev user
func (p *NoAuthProvider) GetUserInfo(ctx context.Context, userID string) (*auth.User, error) {
	return p.defaultUser, nil
}

// CheckPermission always returns true in development mode
func (p *NoAuthProvider) CheckPermission(ctx context.Context, userID, resource, action string) (bool, error) {
	return true, nil
}

// RefreshToken returns the same context with updated expiry
func (p *NoAuthProvider) RefreshToken(ctx context.Context, refreshToken string) (*auth.AuthContext, error) {
	return p.ValidateToken(ctx, refreshToken)
}

// Health always returns healthy
func (p *NoAuthProvider) Health(ctx context.Context) error {
	return nil
}
