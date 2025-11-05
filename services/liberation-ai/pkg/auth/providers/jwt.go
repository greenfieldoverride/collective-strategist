package providers

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"liberation-ai/pkg/auth"
)

// JWTProvider validates JWT tokens from various issuers
type JWTProvider struct {
	issuer     string
	audience   string
	publicKey  *rsa.PublicKey
	jwksURL    string
	httpClient *http.Client
}

// JWTConfig contains configuration for JWT provider
type JWTConfig struct {
	Issuer     string `yaml:"issuer" json:"issuer"`
	Audience   string `yaml:"audience" json:"audience"`
	PublicKey  string `yaml:"public_key" json:"public_key"`
	JWKSUrl    string `yaml:"jwks_url" json:"jwks_url"`
	TimeoutSec int    `yaml:"timeout_sec" json:"timeout_sec"`
}

// JWTClaims represents the claims in a JWT token
type JWTClaims struct {
	jwt.RegisteredClaims
	Email       string   `json:"email,omitempty"`
	Name        string   `json:"name,omitempty"`
	Picture     string   `json:"picture,omitempty"`
	Roles       []string `json:"roles,omitempty"`
	Scopes      []string `json:"scope,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// NewJWTProvider creates a new JWT provider
func NewJWTProvider(config JWTConfig) (*JWTProvider, error) {
	provider := &JWTProvider{
		issuer:   config.Issuer,
		audience: config.Audience,
		jwksURL:  config.JWKSUrl,
		httpClient: &http.Client{
			Timeout: time.Duration(config.TimeoutSec) * time.Second,
		},
	}

	// Parse public key if provided
	if config.PublicKey != "" {
		publicKey, err := parsePublicKey(config.PublicKey)
		if err != nil {
			return nil, fmt.Errorf("failed to parse public key: %w", err)
		}
		provider.publicKey = publicKey
	}

	return provider, nil
}

// Name returns the provider name
func (p *JWTProvider) Name() string {
	return "jwt"
}

// ValidateToken validates a JWT token and returns user information
func (p *JWTProvider) ValidateToken(ctx context.Context, tokenString string) (*auth.AuthContext, error) {
	if tokenString == "" {
		return nil, auth.NewAuthError(auth.ErrCodeInvalidToken, "empty token", "")
	}

	// Remove "Bearer " prefix if present
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, p.getKeyFunc)
	if err != nil {
		return nil, auth.NewAuthError(auth.ErrCodeInvalidToken, "invalid token", err.Error())
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, auth.NewAuthError(auth.ErrCodeInvalidToken, "invalid token claims", "")
	}

	// Check expiration
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, auth.NewAuthError(auth.ErrCodeExpiredToken, "token expired", "")
	}

	// Check issuer
	if p.issuer != "" && claims.Issuer != p.issuer {
		return nil, auth.NewAuthError(auth.ErrCodeInvalidToken, "invalid issuer", fmt.Sprintf("expected %s, got %s", p.issuer, claims.Issuer))
	}

	// Check audience
	if p.audience != "" && !claims.VerifyAudience(p.audience, true) {
		return nil, auth.NewAuthError(auth.ErrCodeInvalidToken, "invalid audience", fmt.Sprintf("expected %s", p.audience))
	}

	// Build user object
	user := &auth.User{
		ID:      claims.Subject,
		Email:   claims.Email,
		Name:    claims.Name,
		Picture: claims.Picture,
		Roles:   claims.Roles,
		Scopes:  claims.Scopes,
	}

	// Build auth context
	authContext := &auth.AuthContext{
		User:        user,
		Token:       tokenString,
		Permissions: claims.Permissions,
		Metadata: map[string]string{
			"provider": "jwt",
			"issuer":   claims.Issuer,
		},
	}

	if claims.ExpiresAt != nil {
		authContext.ExpiresAt = claims.ExpiresAt.Time
	}

	return authContext, nil
}

// GetUserInfo retrieves user information by user ID
func (p *JWTProvider) GetUserInfo(ctx context.Context, userID string) (*auth.User, error) {
	// JWT providers typically don't store user info separately
	// This would need to call an external API or return cached info
	return nil, auth.NewAuthError(auth.ErrCodeProviderError, "user info not available", "JWT provider doesn't support user lookup by ID")
}

// CheckPermission checks if a user has permission for a specific resource/action
func (p *JWTProvider) CheckPermission(ctx context.Context, userID, resource, action string) (bool, error) {
	// This would typically check against a policy engine or permission service
	// For now, implement basic scope-based checking
	return true, nil // TODO: Implement proper permission checking
}

// RefreshToken refreshes an access token (if supported)
func (p *JWTProvider) RefreshToken(ctx context.Context, refreshToken string) (*auth.AuthContext, error) {
	// JWT refresh would typically involve calling the token endpoint
	return nil, auth.NewAuthError(auth.ErrCodeProviderError, "refresh not supported", "JWT provider doesn't support token refresh")
}

// Health checks if the auth provider is healthy
func (p *JWTProvider) Health(ctx context.Context) error {
	// Could check JWKS endpoint if available
	if p.jwksURL != "" {
		req, err := http.NewRequestWithContext(ctx, "GET", p.jwksURL, nil)
		if err != nil {
			return err
		}

		resp, err := p.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("JWKS endpoint returned %d", resp.StatusCode)
		}
	}

	return nil
}

// getKeyFunc returns the key function for JWT validation
func (p *JWTProvider) getKeyFunc(token *jwt.Token) (interface{}, error) {
	// Check signing method
	if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
		return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
	}

	// Use static public key if available
	if p.publicKey != nil {
		return p.publicKey, nil
	}

	// TODO: Implement JWKS fetching for dynamic key rotation
	return nil, fmt.Errorf("no public key available for token validation")
}

// parsePublicKey parses a base64-encoded RSA public key
func parsePublicKey(keyData string) (*rsa.PublicKey, error) {
	// Decode base64
	keyBytes, err := base64.StdEncoding.DecodeString(keyData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64 key: %w", err)
	}

	// Parse PEM block
	key, err := jwt.ParseRSAPublicKeyFromPEM(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse RSA public key: %w", err)
	}

	return key, nil
}
