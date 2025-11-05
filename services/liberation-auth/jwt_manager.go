package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTManager handles JWT token operations
type JWTManager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	issuer     string
	keyID      string
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secret, issuer string) (*JWTManager, error) {
	// For now, generate a key pair for testing
	// In production, you'd load keys from secure storage
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, fmt.Errorf("failed to generate private key: %v", err)
	}

	return &JWTManager{
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
		issuer:     issuer,
		keyID:      uuid.New().String(),
	}, nil
}

// GenerateToken creates a new JWT token
func (jm *JWTManager) GenerateToken(userID uuid.UUID, audience string, scopes []string, expiresIn time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"iss":   jm.issuer,
		"sub":   userID.String(),
		"aud":   audience,
		"exp":   now.Add(expiresIn).Unix(),
		"iat":   now.Unix(),
		"nbf":   now.Unix(),
		"jti":   uuid.New().String(),
		"scope": scopes,
		"typ":   "Bearer",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = jm.keyID

	return token.SignedString(jm.privateKey)
}

// ValidateToken validates and parses a JWT token
func (jm *JWTManager) ValidateToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jm.publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// GetPublicKey returns the public key for token verification
func (jm *JWTManager) GetPublicKey() *rsa.PublicKey {
	return jm.publicKey
}

// GetPublicKeyPEM returns the public key in PEM format
func (jm *JWTManager) GetPublicKeyPEM() (string, error) {
	pubKeyBytes, err := x509.MarshalPKIXPublicKey(jm.publicKey)
	if err != nil {
		return "", err
	}

	pubKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubKeyBytes,
	})

	return string(pubKeyPEM), nil
}

// GetJWKS returns the JSON Web Key Set for the public key
func (jm *JWTManager) GetJWKS() map[string]interface{} {
	return map[string]interface{}{
		"keys": []map[string]interface{}{
			{
				"kty": "RSA",
				"use": "sig",
				"alg": "RS256",
				"kid": jm.keyID,
				"n":   encodeRSAPublicKeyComponent(jm.publicKey.N),
				"e":   encodeRSAPublicKeyComponent(big.NewInt(int64(jm.publicKey.E))),
			},
		},
	}
}

// Helper function to encode RSA key components for JWKS
func encodeRSAPublicKeyComponent(component *big.Int) string {
	return base64.RawURLEncoding.EncodeToString(component.Bytes())
}
