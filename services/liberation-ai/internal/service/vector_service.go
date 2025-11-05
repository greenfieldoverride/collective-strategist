package service

import (
	"context"
	"fmt"
	"time"

	"liberation-ai/pkg/types"
)

// VectorService provides high-level vector operations
type VectorService struct {
	store types.VectorStore
}

// NewVectorService creates a new vector service
func NewVectorService(store types.VectorStore) *VectorService {
	return &VectorService{
		store: store,
	}
}

// StoreText stores text with generated embeddings
func (s *VectorService) StoreText(ctx context.Context, namespace, id, text string, metadata map[string]interface{}) (*types.StoreResponse, error) {
	// For now, create a simple embedding (in real implementation, this would use an embedding model)
	embedding := s.generateSimpleEmbedding(text)

	vector := types.Vector{
		ID:        id,
		Embedding: embedding,
		Metadata:  metadata,
		Namespace: namespace,
		CreatedAt: time.Now(),
	}

	// Add text to metadata
	if vector.Metadata == nil {
		vector.Metadata = make(map[string]interface{})
	}
	vector.Metadata["text"] = text

	req := &types.StoreRequest{
		Namespace: namespace,
		Vectors:   []types.Vector{vector},
	}

	return s.store.Store(ctx, req)
}

// SearchText searches for similar text
func (s *VectorService) SearchText(ctx context.Context, namespace, query string, limit int) (*types.SearchResponse, error) {
	// Generate embedding for query
	queryEmbedding := s.generateSimpleEmbedding(query)

	req := &types.SearchRequest{
		Namespace: namespace,
		Embedding: queryEmbedding,
		Limit:     limit,
		Threshold: 0.7, // Similarity threshold
	}

	return s.store.Search(ctx, req)
}

// GetVector retrieves a specific vector
func (s *VectorService) GetVector(ctx context.Context, namespace, id string) (*types.Vector, error) {
	return s.store.Get(ctx, namespace, id)
}

// ListNamespaces returns all namespaces
func (s *VectorService) ListNamespaces(ctx context.Context) ([]string, error) {
	return s.store.ListNamespaces(ctx)
}

// GetStats returns vector store statistics
func (s *VectorService) GetStats(ctx context.Context) (*types.VectorStoreStats, error) {
	return s.store.Stats(ctx)
}

// Health checks the vector store health
func (s *VectorService) Health(ctx context.Context) error {
	if s.store == nil {
		return fmt.Errorf("vector store not initialized")
	}
	return s.store.Health(ctx)
}

// generateSimpleEmbedding creates a simple hash-based embedding for demo purposes
// In production, this would use a real embedding model like sentence-transformers
func (s *VectorService) generateSimpleEmbedding(text string) []float32 {
	// Simple hash-based embedding (384 dimensions to match common models)
	const dimensions = 384
	embedding := make([]float32, dimensions)

	// Convert text to bytes for hashing
	textBytes := []byte(text)

	// Generate embedding using a simple algorithm
	for i := 0; i < dimensions; i++ {
		var sum float32
		for j, b := range textBytes {
			// Simple hash function combining character values and positions
			sum += float32(b) * float32(j+1) * float32(i+1)
		}
		// Normalize to [-1, 1] range
		embedding[i] = (sum / 1000000.0) - 0.5
		if embedding[i] > 1.0 {
			embedding[i] = 1.0
		}
		if embedding[i] < -1.0 {
			embedding[i] = -1.0
		}
	}

	return embedding
}

// StoreVectors stores multiple vectors at once
func (s *VectorService) StoreVectors(ctx context.Context, req *types.StoreRequest) (*types.StoreResponse, error) {
	return s.store.Store(ctx, req)
}

// SearchVectors performs vector similarity search
func (s *VectorService) SearchVectors(ctx context.Context, req *types.SearchRequest) (*types.SearchResponse, error) {
	return s.store.Search(ctx, req)
}

// DeleteVectors deletes vectors by IDs
func (s *VectorService) DeleteVectors(ctx context.Context, namespace string, ids []string) error {
	return s.store.Delete(ctx, namespace, ids)
}

// StoreDocuments stores documents with automatic text embedding
type Document struct {
	ID       string                 `json:"id"`
	Title    string                 `json:"title,omitempty"`
	Content  string                 `json:"content"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

func (s *VectorService) StoreDocuments(ctx context.Context, namespace string, docs []Document) (*types.StoreResponse, error) {
	vectors := make([]types.Vector, len(docs))

	for i, doc := range docs {
		// Combine title and content for embedding
		text := doc.Title
		if text != "" && doc.Content != "" {
			text += " " + doc.Content
		} else if text == "" {
			text = doc.Content
		}

		embedding := s.generateSimpleEmbedding(text)

		// Prepare metadata
		metadata := doc.Metadata
		if metadata == nil {
			metadata = make(map[string]interface{})
		}
		metadata["title"] = doc.Title
		metadata["content"] = doc.Content
		metadata["text"] = text

		vectors[i] = types.Vector{
			ID:        doc.ID,
			Embedding: embedding,
			Metadata:  metadata,
			Namespace: namespace,
			CreatedAt: time.Now(),
		}
	}

	req := &types.StoreRequest{
		Namespace: namespace,
		Vectors:   vectors,
	}

	return s.store.Store(ctx, req)
}

// SearchDocuments searches for similar documents
func (s *VectorService) SearchDocuments(ctx context.Context, namespace, query string, limit int) (*types.SearchResponse, error) {
	return s.SearchText(ctx, namespace, query, limit)
}
