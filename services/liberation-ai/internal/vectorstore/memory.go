package vectorstore

import (
	"context"
	"fmt"
	"math"
	"sort"
	"sync"
	"time"

	"liberation-ai/pkg/types"
)

// MemoryVectorStore implements VectorStore using in-memory storage
// This is perfect for demos and development
type MemoryVectorStore struct {
	mu         sync.RWMutex
	vectors    map[string]map[string]*types.Vector // namespace -> id -> vector
	dimensions int
}

// NewMemoryVectorStore creates a new in-memory vector store
func NewMemoryVectorStore(dimensions int) *MemoryVectorStore {
	return &MemoryVectorStore{
		vectors:    make(map[string]map[string]*types.Vector),
		dimensions: dimensions,
	}
}

// Store implements VectorStore.Store
func (m *MemoryVectorStore) Store(ctx context.Context, req *types.StoreRequest) (*types.StoreResponse, error) {
	start := time.Now()
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.vectors[req.Namespace] == nil {
		m.vectors[req.Namespace] = make(map[string]*types.Vector)
	}

	stored := 0
	failed := 0

	for _, vector := range req.Vectors {
		// Validate dimensions
		if len(vector.Embedding) != m.dimensions {
			failed++
			continue
		}

		// Store vector (copy to avoid reference issues)
		vectorCopy := vector
		vectorCopy.Namespace = req.Namespace
		if vectorCopy.CreatedAt.IsZero() {
			vectorCopy.CreatedAt = time.Now()
		}

		m.vectors[req.Namespace][vector.ID] = &vectorCopy
		stored++
	}

	return &types.StoreResponse{
		Stored:         stored,
		Failed:         failed,
		ProcessingTime: time.Since(start).Milliseconds(),
		Store:          "memory",
		Cost:           0, // No cost for in-memory storage
	}, nil
}

// Search implements VectorStore.Search
func (m *MemoryVectorStore) Search(ctx context.Context, req *types.SearchRequest) (*types.SearchResponse, error) {
	start := time.Now()
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(req.Embedding) != m.dimensions {
		return nil, fmt.Errorf("query dimension mismatch: expected %d, got %d", m.dimensions, len(req.Embedding))
	}

	namespace := m.vectors[req.Namespace]
	if namespace == nil {
		return &types.SearchResponse{
			Results:        []types.SearchResult{},
			ProcessingTime: time.Since(start).Milliseconds(),
			Store:          "memory",
			Cost:           0,
		}, nil
	}

	var results []types.SearchResult

	// Calculate similarity for all vectors in the namespace
	for _, vector := range namespace {
		similarity := m.cosineSimilarity(req.Embedding, vector.Embedding)

		// Apply threshold filter
		if req.Threshold > 0 && similarity < req.Threshold {
			continue
		}

		// Apply metadata filters
		if len(req.Filters) > 0 {
			matches := true
			for key, value := range req.Filters {
				if vector.Metadata == nil {
					matches = false
					break
				}
				vectorValue, exists := vector.Metadata[key]
				if !exists || fmt.Sprintf("%v", vectorValue) != fmt.Sprintf("%v", value) {
					matches = false
					break
				}
			}
			if !matches {
				continue
			}
		}

		result := types.SearchResult{
			Vector:   *vector,
			Score:    similarity,
			Distance: 1 - similarity,
		}
		results = append(results, result)
	}

	// Sort by similarity (highest first)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	// Apply limit
	if req.Limit > 0 && len(results) > req.Limit {
		results = results[:req.Limit]
	}

	return &types.SearchResponse{
		Results:        results,
		ProcessingTime: time.Since(start).Milliseconds(),
		Store:          "memory",
		Cost:           0,
	}, nil
}

// Get implements VectorStore.Get
func (m *MemoryVectorStore) Get(ctx context.Context, namespace string, id string) (*types.Vector, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	namespaceVectors := m.vectors[namespace]
	if namespaceVectors == nil {
		return nil, fmt.Errorf("vector not found: %s/%s", namespace, id)
	}

	vector := namespaceVectors[id]
	if vector == nil {
		return nil, fmt.Errorf("vector not found: %s/%s", namespace, id)
	}

	// Return a copy
	vectorCopy := *vector
	return &vectorCopy, nil
}

// Delete implements VectorStore.Delete
func (m *MemoryVectorStore) Delete(ctx context.Context, namespace string, ids []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	namespaceVectors := m.vectors[namespace]
	if namespaceVectors == nil {
		return nil // Nothing to delete
	}

	for _, id := range ids {
		delete(namespaceVectors, id)
	}

	// Clean up empty namespaces
	if len(namespaceVectors) == 0 {
		delete(m.vectors, namespace)
	}

	return nil
}

// ListNamespaces implements VectorStore.ListNamespaces
func (m *MemoryVectorStore) ListNamespaces(ctx context.Context) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	namespaces := make([]string, 0, len(m.vectors))
	for namespace := range m.vectors {
		namespaces = append(namespaces, namespace)
	}

	sort.Strings(namespaces)
	return namespaces, nil
}

// Stats implements VectorStore.Stats
func (m *MemoryVectorStore) Stats(ctx context.Context) (*types.VectorStoreStats, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var totalVectors int64
	namespaceStats := make(map[string]int64)

	for namespace, vectors := range m.vectors {
		count := int64(len(vectors))
		totalVectors += count
		namespaceStats[namespace] = count
	}

	return &types.VectorStoreStats{
		Store:           "memory",
		TotalVectors:    totalVectors,
		TotalNamespaces: len(m.vectors),
		Dimensions:      m.dimensions,
		StorageSize:     0, // Memory usage tracking could be added
		NamespaceStats:  namespaceStats,
		Performance: &types.PerformanceStats{
			AvgSearchTime:  1, // Very fast in-memory search
			AvgStoreTime:   1, // Very fast in-memory storage
			SearchesPerSec: 1000,
			StoresPerSec:   2000,
			CacheHitRate:   1.0, // Everything is "cached" in memory
		},
	}, nil
}

// Health implements VectorStore.Health
func (m *MemoryVectorStore) Health(ctx context.Context) error {
	// Memory store is always healthy if initialized
	return nil
}

// Close implements VectorStore.Close
func (m *MemoryVectorStore) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Clear all data
	m.vectors = make(map[string]map[string]*types.Vector)
	return nil
}

// Migrate implements VectorStore.Migrate
func (m *MemoryVectorStore) Migrate(ctx context.Context, destination types.VectorStore) (*types.MigrationResult, error) {
	start := time.Now()
	m.mu.RLock()
	defer m.mu.RUnlock()

	var totalMigrated int64
	var errors []string

	// Migrate each namespace
	for namespace, vectors := range m.vectors {
		vectorSlice := make([]types.Vector, 0, len(vectors))
		for _, vector := range vectors {
			vectorSlice = append(vectorSlice, *vector)
		}

		if len(vectorSlice) > 0 {
			req := &types.StoreRequest{
				Namespace: namespace,
				Vectors:   vectorSlice,
			}

			_, err := destination.Store(ctx, req)
			if err != nil {
				errors = append(errors, fmt.Sprintf("namespace %s: %v", namespace, err))
				continue
			}

			totalMigrated += int64(len(vectorSlice))
		}
	}

	return &types.MigrationResult{
		Strategy:           types.MigrationBulk,
		VectorsMigrated:    totalMigrated,
		NamespacesMigrated: len(m.vectors) - len(errors),
		Errors:             errors,
		Duration:           time.Since(start),
		ValidationPassed:   len(errors) == 0,
		Cost:               0,
	}, nil
}

// cosineSimilarity calculates cosine similarity between two vectors
func (m *MemoryVectorStore) cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float64

	for i := 0; i < len(a); i++ {
		dotProduct += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}
