package types

import (
	"context"
	"time"
)

// Vector represents a single vector with metadata
type Vector struct {
	ID        string                 `json:"id"`
	Embedding []float32              `json:"embedding"`
	Metadata  map[string]interface{} `json:"metadata"`
	Namespace string                 `json:"namespace"`
	CreatedAt time.Time              `json:"created_at"`
}

// SearchRequest represents a vector search query
type SearchRequest struct {
	Query     string                 `json:"query,omitempty"`
	Embedding []float32              `json:"embedding,omitempty"`
	Namespace string                 `json:"namespace"`
	Limit     int                    `json:"limit"`
	Filters   map[string]interface{} `json:"filters,omitempty"`
	Threshold float64                `json:"threshold,omitempty"`
}

// SearchResult represents a single search result
type SearchResult struct {
	Vector   Vector  `json:"vector"`
	Score    float64 `json:"score"`
	Distance float64 `json:"distance"`
}

// SearchResponse represents the complete search response
type SearchResponse struct {
	Results        []SearchResult `json:"results"`
	ProcessingTime int64          `json:"processing_time_ms"`
	Store          string         `json:"store"`
	Cost           float64        `json:"cost"`
}

// StoreRequest represents a request to store vectors
type StoreRequest struct {
	Namespace string   `json:"namespace"`
	Vectors   []Vector `json:"vectors"`
}

// StoreResponse represents the response from storing vectors
type StoreResponse struct {
	Stored         int     `json:"stored"`
	Failed         int     `json:"failed"`
	ProcessingTime int64   `json:"processing_time_ms"`
	Store          string  `json:"store"`
	Cost           float64 `json:"cost"`
}

// VectorStore interface defines the contract for vector storage implementations
type VectorStore interface {
	// Store vectors in the specified namespace
	Store(ctx context.Context, req *StoreRequest) (*StoreResponse, error)

	// Search for similar vectors
	Search(ctx context.Context, req *SearchRequest) (*SearchResponse, error)

	// Delete vectors by ID
	Delete(ctx context.Context, namespace string, ids []string) error

	// Get vector by ID
	Get(ctx context.Context, namespace string, id string) (*Vector, error)

	// List all namespaces
	ListNamespaces(ctx context.Context) ([]string, error)

	// Get statistics about the store
	Stats(ctx context.Context) (*VectorStoreStats, error)

	// Migrate data to another store
	Migrate(ctx context.Context, destination VectorStore) (*MigrationResult, error)

	// Health check
	Health(ctx context.Context) error

	// Close the store
	Close() error
}

// VectorStoreStats represents statistics about a vector store
type VectorStoreStats struct {
	Store           string            `json:"store"`
	TotalVectors    int64             `json:"total_vectors"`
	TotalNamespaces int               `json:"total_namespaces"`
	Dimensions      int               `json:"dimensions"`
	StorageSize     int64             `json:"storage_size_bytes"`
	NamespaceStats  map[string]int64  `json:"namespace_stats"`
	Performance     *PerformanceStats `json:"performance"`
}

// PerformanceStats represents performance metrics
type PerformanceStats struct {
	AvgSearchTime  int64   `json:"avg_search_time_ms"`
	AvgStoreTime   int64   `json:"avg_store_time_ms"`
	SearchesPerSec float64 `json:"searches_per_sec"`
	StoresPerSec   float64 `json:"stores_per_sec"`
	CacheHitRate   float64 `json:"cache_hit_rate"`
}

// MigrationStrategy defines how migration should be performed
type MigrationStrategy string

const (
	MigrationGradual    MigrationStrategy = "gradual"    // Gradual migration with parallel reads
	MigrationBulk       MigrationStrategy = "bulk"       // Fast bulk migration
	MigrationParallel   MigrationStrategy = "parallel"   // Parallel migration
	MigrationValidation MigrationStrategy = "validation" // Migration with validation
)

// MigrationRequest represents a migration request
type MigrationRequest struct {
	From          VectorStore       `json:"-"`
	To            VectorStore       `json:"-"`
	Strategy      MigrationStrategy `json:"strategy"`
	Namespaces    []string          `json:"namespaces,omitempty"`
	BatchSize     int               `json:"batch_size"`
	ParallelReads bool              `json:"parallel_reads"`
	Validate      bool              `json:"validate"`
}

// MigrationResult represents the result of a migration
type MigrationResult struct {
	Strategy           MigrationStrategy `json:"strategy"`
	VectorsMigrated    int64             `json:"vectors_migrated"`
	NamespacesMigrated int               `json:"namespaces_migrated"`
	Errors             []string          `json:"errors,omitempty"`
	Duration           time.Duration     `json:"duration"`
	ValidationPassed   bool              `json:"validation_passed"`
	Cost               float64           `json:"cost"`
}

// MigrationProgress represents ongoing migration progress
type MigrationProgress struct {
	Status             MigrationStatus `json:"status"`
	VectorsTotal       int64           `json:"vectors_total"`
	VectorsMigrated    int64           `json:"vectors_migrated"`
	PercentComplete    float64         `json:"percent_complete"`
	EstimatedRemaining time.Duration   `json:"estimated_remaining"`
	CurrentNamespace   string          `json:"current_namespace"`
	Errors             []string        `json:"errors,omitempty"`
}

// MigrationStatus represents the status of a migration
type MigrationStatus string

const (
	MigrationPending   MigrationStatus = "pending"
	MigrationRunning   MigrationStatus = "running"
	MigrationCompleted MigrationStatus = "completed"
	MigrationFailed    MigrationStatus = "failed"
	MigrationCancelled MigrationStatus = "cancelled"
)

// VectorStoreType represents different vector store implementations
type VectorStoreType string

const (
	StoreTypePostgres VectorStoreType = "postgres"
	StoreTypeQdrant   VectorStoreType = "qdrant"
	StoreTypeChroma   VectorStoreType = "chroma"
	StoreTypeWeaviate VectorStoreType = "weaviate"
	StoreTypeHybrid   VectorStoreType = "hybrid"
)

// VectorStoreConfig represents configuration for a vector store
type VectorStoreConfig struct {
	Type           VectorStoreType        `yaml:"type"`
	ConnectionURL  string                 `yaml:"connection_url"`
	Database       string                 `yaml:"database"`
	Collection     string                 `yaml:"collection"`
	Dimensions     int                    `yaml:"dimensions"`
	IndexType      string                 `yaml:"index_type"`
	DistanceMetric string                 `yaml:"distance_metric"`
	Options        map[string]interface{} `yaml:"options"`
}

// EmbeddingRequest represents a request to generate embeddings
type EmbeddingRequest struct {
	Text     string   `json:"text,omitempty"`
	Texts    []string `json:"texts,omitempty"`
	Model    string   `json:"model,omitempty"`
	Provider string   `json:"provider,omitempty"`
}

// EmbeddingResponse represents the response from embedding generation
type EmbeddingResponse struct {
	Embeddings     [][]float32 `json:"embeddings"`
	Model          string      `json:"model"`
	Provider       string      `json:"provider"`
	Dimensions     int         `json:"dimensions"`
	ProcessingTime int64       `json:"processing_time_ms"`
	Cost           float64     `json:"cost"`
	TokensUsed     int         `json:"tokens_used"`
}

// ChatRequest represents a chat request with vector context
type ChatRequest struct {
	Message      string                 `json:"message"`
	Namespace    string                 `json:"namespace,omitempty"`
	ContextLimit int                    `json:"context_limit,omitempty"`
	Filters      map[string]interface{} `json:"filters,omitempty"`
	Provider     string                 `json:"provider,omitempty"`
	Model        string                 `json:"model,omitempty"`
	Temperature  float64                `json:"temperature,omitempty"`
	MaxTokens    int                    `json:"max_tokens,omitempty"`
}

// ChatResponse represents a chat response with context
type ChatResponse struct {
	Response       string         `json:"response"`
	Context        []SearchResult `json:"context,omitempty"`
	Provider       string         `json:"provider"`
	Model          string         `json:"model"`
	ProcessingTime int64          `json:"processing_time_ms"`
	Cost           float64        `json:"cost"`
	TokensUsed     int            `json:"tokens_used"`
}

// HealthStatus represents the health status of the service
type HealthStatus struct {
	Status     string                     `json:"status"`
	Version    string                     `json:"version"`
	Timestamp  time.Time                  `json:"timestamp"`
	Components map[string]ComponentHealth `json:"components"`
	Stats      *VectorStoreStats          `json:"stats,omitempty"`
}

// ComponentHealth represents the health of a single component
type ComponentHealth struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Latency int64  `json:"latency_ms,omitempty"`
}

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Code    string                 `json:"code,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}
