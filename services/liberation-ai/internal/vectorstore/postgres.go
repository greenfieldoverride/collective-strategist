package vectorstore

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
	"github.com/pgvector/pgvector-go"
	"github.com/sirupsen/logrus"

	"liberation-ai/pkg/types"
)

// PostgresVectorStore implements VectorStore using PostgreSQL with pgvector
type PostgresVectorStore struct {
	db         *sql.DB
	logger     *logrus.Logger
	dimensions int
	tableName  string
}

// NewPostgresVectorStore creates a new PostgreSQL vector store
func NewPostgresVectorStore(connectionURL string, dimensions int, logger *logrus.Logger) (*PostgresVectorStore, error) {
	db, err := sql.Open("postgres", connectionURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	store := &PostgresVectorStore{
		db:         db,
		logger:     logger,
		dimensions: dimensions,
		tableName:  "vectors",
	}

	// Initialize the store
	if err := store.initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize postgres store: %w", err)
	}

	return store, nil
}

// initialize sets up the database schema and extensions
func (p *PostgresVectorStore) initialize() error {
	ctx := context.Background()

	// Check if pgvector extension is available
	if err := p.ensurePgvectorExtension(ctx); err != nil {
		return fmt.Errorf("pgvector extension not available: %w", err)
	}

	// Create vectors table
	createTableSQL := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			id TEXT PRIMARY KEY,
			namespace TEXT NOT NULL,
			embedding vector(%d) NOT NULL,
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`, p.tableName, p.dimensions)

	if _, err := p.db.ExecContext(ctx, createTableSQL); err != nil {
		return fmt.Errorf("failed to create vectors table: %w", err)
	}

	// Create indexes for performance
	indexes := []string{
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_namespace ON %s (namespace)", p.tableName, p.tableName),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_embedding ON %s USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)", p.tableName, p.tableName),
		fmt.Sprintf("CREATE INDEX IF NOT EXISTS idx_%s_metadata ON %s USING GIN (metadata)", p.tableName, p.tableName),
	}

	for _, indexSQL := range indexes {
		if _, err := p.db.ExecContext(ctx, indexSQL); err != nil {
			p.logger.Warnf("Failed to create index: %v", err)
			// Continue - indexes are performance optimizations
		}
	}

	p.logger.Info("PostgreSQL vector store initialized successfully")
	return nil
}

// ensurePgvectorExtension checks and enables the pgvector extension
func (p *PostgresVectorStore) ensurePgvectorExtension(ctx context.Context) error {
	// Check if extension exists
	var exists bool
	checkSQL := "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')"
	if err := p.db.QueryRowContext(ctx, checkSQL).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check pgvector extension: %w", err)
	}

	if !exists {
		// Try to create the extension
		if _, err := p.db.ExecContext(ctx, "CREATE EXTENSION IF NOT EXISTS vector"); err != nil {
			return fmt.Errorf("failed to create pgvector extension: %w. Please ensure pgvector is installed", err)
		}
		p.logger.Info("pgvector extension created successfully")
	}

	return nil
}

// Store implements VectorStore.Store
func (p *PostgresVectorStore) Store(ctx context.Context, req *types.StoreRequest) (*types.StoreResponse, error) {
	start := time.Now()

	if len(req.Vectors) == 0 {
		return &types.StoreResponse{
			Stored:         0,
			Failed:         0,
			ProcessingTime: time.Since(start).Milliseconds(),
			Store:          "postgres",
			Cost:           0,
		}, nil
	}

	// Validate dimensions
	for _, vector := range req.Vectors {
		if len(vector.Embedding) != p.dimensions {
			return nil, fmt.Errorf("vector dimension mismatch: expected %d, got %d", p.dimensions, len(vector.Embedding))
		}
	}

	// Batch insert for better performance
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	insertSQL := fmt.Sprintf(`
		INSERT INTO %s (id, namespace, embedding, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			embedding = EXCLUDED.embedding,
			metadata = EXCLUDED.metadata,
			created_at = EXCLUDED.created_at
	`, p.tableName)

	stmt, err := tx.PrepareContext(ctx, insertSQL)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare insert statement: %w", err)
	}
	defer stmt.Close()

	stored := 0
	failed := 0

	for _, vector := range req.Vectors {
		metadataJSON, err := json.Marshal(vector.Metadata)
		if err != nil {
			p.logger.Errorf("Failed to marshal metadata for vector %s: %v", vector.ID, err)
			failed++
			continue
		}

		pgVector := pgvector.NewVector(vector.Embedding)
		_, err = stmt.ExecContext(ctx, vector.ID, req.Namespace, pgVector, metadataJSON, vector.CreatedAt)
		if err != nil {
			p.logger.Errorf("Failed to insert vector %s: %v", vector.ID, err)
			failed++
			continue
		}
		stored++
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &types.StoreResponse{
		Stored:         stored,
		Failed:         failed,
		ProcessingTime: time.Since(start).Milliseconds(),
		Store:          "postgres",
		Cost:           0, // No additional cost for using existing Postgres
	}, nil
}

// Search implements VectorStore.Search
func (p *PostgresVectorStore) Search(ctx context.Context, req *types.SearchRequest) (*types.SearchResponse, error) {
	start := time.Now()

	if len(req.Embedding) != p.dimensions {
		return nil, fmt.Errorf("query dimension mismatch: expected %d, got %d", p.dimensions, len(req.Embedding))
	}

	// Build the search query with filters
	whereClause := "WHERE namespace = $1"
	args := []interface{}{req.Namespace, pgvector.NewVector(req.Embedding)}
	argIndex := 3

	// Add metadata filters
	if len(req.Filters) > 0 {
		for key, value := range req.Filters {
			whereClause += fmt.Sprintf(" AND metadata->>'%s' = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	// Add similarity threshold
	if req.Threshold > 0 {
		whereClause += fmt.Sprintf(" AND (1 - (embedding <=> $2)) >= $%d", argIndex)
		args = append(args, req.Threshold)
		argIndex++
	}

	searchSQL := fmt.Sprintf(`
		SELECT id, embedding, metadata, created_at, (1 - (embedding <=> $2)) as similarity
		FROM %s
		%s
		ORDER BY embedding <=> $2
		LIMIT $%d
	`, p.tableName, whereClause, argIndex)

	args = append(args, req.Limit)

	rows, err := p.db.QueryContext(ctx, searchSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search query: %w", err)
	}
	defer rows.Close()

	var results []types.SearchResult
	for rows.Next() {
		var (
			id           string
			embedding    pgvector.Vector
			metadataJSON []byte
			createdAt    time.Time
			similarity   float64
		)

		if err := rows.Scan(&id, &embedding, &metadataJSON, &createdAt, &similarity); err != nil {
			p.logger.Errorf("Failed to scan search result: %v", err)
			continue
		}

		var metadata map[string]interface{}
		if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
			p.logger.Errorf("Failed to unmarshal metadata for vector %s: %v", id, err)
			metadata = make(map[string]interface{})
		}

		vector := types.Vector{
			ID:        id,
			Embedding: embedding.Slice(),
			Metadata:  metadata,
			Namespace: req.Namespace,
			CreatedAt: createdAt,
		}

		result := types.SearchResult{
			Vector:   vector,
			Score:    similarity,
			Distance: 1 - similarity,
		}

		results = append(results, result)
	}

	return &types.SearchResponse{
		Results:        results,
		ProcessingTime: time.Since(start).Milliseconds(),
		Store:          "postgres",
		Cost:           0, // No additional cost
	}, nil
}

// Delete implements VectorStore.Delete
func (p *PostgresVectorStore) Delete(ctx context.Context, namespace string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	deleteSQL := fmt.Sprintf("DELETE FROM %s WHERE namespace = $1 AND id = ANY($2)", p.tableName)
	_, err := p.db.ExecContext(ctx, deleteSQL, namespace, pq.Array(ids))
	if err != nil {
		return fmt.Errorf("failed to delete vectors: %w", err)
	}

	return nil
}

// Get implements VectorStore.Get
func (p *PostgresVectorStore) Get(ctx context.Context, namespace string, id string) (*types.Vector, error) {
	getSQL := fmt.Sprintf(`
		SELECT id, embedding, metadata, created_at
		FROM %s
		WHERE namespace = $1 AND id = $2
	`, p.tableName)

	var (
		vectorID     string
		embedding    pgvector.Vector
		metadataJSON []byte
		createdAt    time.Time
	)

	err := p.db.QueryRowContext(ctx, getSQL, namespace, id).Scan(&vectorID, &embedding, &metadataJSON, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("vector not found: %s/%s", namespace, id)
		}
		return nil, fmt.Errorf("failed to get vector: %w", err)
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
		p.logger.Errorf("Failed to unmarshal metadata for vector %s: %v", id, err)
		metadata = make(map[string]interface{})
	}

	return &types.Vector{
		ID:        vectorID,
		Embedding: embedding.Slice(),
		Metadata:  metadata,
		Namespace: namespace,
		CreatedAt: createdAt,
	}, nil
}

// ListNamespaces implements VectorStore.ListNamespaces
func (p *PostgresVectorStore) ListNamespaces(ctx context.Context) ([]string, error) {
	listSQL := fmt.Sprintf("SELECT DISTINCT namespace FROM %s ORDER BY namespace", p.tableName)

	rows, err := p.db.QueryContext(ctx, listSQL)
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}
	defer rows.Close()

	var namespaces []string
	for rows.Next() {
		var namespace string
		if err := rows.Scan(&namespace); err != nil {
			return nil, fmt.Errorf("failed to scan namespace: %w", err)
		}
		namespaces = append(namespaces, namespace)
	}

	return namespaces, nil
}

// Stats implements VectorStore.Stats
func (p *PostgresVectorStore) Stats(ctx context.Context) (*types.VectorStoreStats, error) {
	// Get total vectors
	var totalVectors int64
	err := p.db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s", p.tableName)).Scan(&totalVectors)
	if err != nil {
		return nil, fmt.Errorf("failed to count vectors: %w", err)
	}

	// Get namespace stats
	namespaceStatsSQL := fmt.Sprintf("SELECT namespace, COUNT(*) FROM %s GROUP BY namespace", p.tableName)
	rows, err := p.db.QueryContext(ctx, namespaceStatsSQL)
	if err != nil {
		return nil, fmt.Errorf("failed to get namespace stats: %w", err)
	}
	defer rows.Close()

	namespaceStats := make(map[string]int64)
	for rows.Next() {
		var namespace string
		var count int64
		if err := rows.Scan(&namespace, &count); err != nil {
			continue
		}
		namespaceStats[namespace] = count
	}

	// Get storage size (approximate)
	var storageSize int64
	sizeSQL := `SELECT pg_total_relation_size($1)`
	if err := p.db.QueryRowContext(ctx, sizeSQL, p.tableName).Scan(&storageSize); err != nil {
		p.logger.Warnf("Failed to get storage size: %v", err)
		storageSize = 0
	}

	return &types.VectorStoreStats{
		Store:           "postgres",
		TotalVectors:    totalVectors,
		TotalNamespaces: len(namespaceStats),
		Dimensions:      p.dimensions,
		StorageSize:     storageSize,
		NamespaceStats:  namespaceStats,
		Performance: &types.PerformanceStats{
			AvgSearchTime:  50, // Estimate based on typical pgvector performance
			AvgStoreTime:   10,
			SearchesPerSec: 100,
			StoresPerSec:   200,
			CacheHitRate:   0.8,
		},
	}, nil
}

// Health implements VectorStore.Health
func (p *PostgresVectorStore) Health(ctx context.Context) error {
	return p.db.PingContext(ctx)
}

// Close implements VectorStore.Close
func (p *PostgresVectorStore) Close() error {
	return p.db.Close()
}

// Migrate implements VectorStore.Migrate
func (p *PostgresVectorStore) Migrate(ctx context.Context, destination types.VectorStore) (*types.MigrationResult, error) {
	start := time.Now()

	// Get all namespaces
	namespaces, err := p.ListNamespaces(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	var totalMigrated int64
	var errors []string

	// Migrate each namespace
	for _, namespace := range namespaces {
		migrated, err := p.migrateNamespace(ctx, namespace, destination)
		if err != nil {
			errors = append(errors, fmt.Sprintf("namespace %s: %v", namespace, err))
			continue
		}
		totalMigrated += migrated
	}

	return &types.MigrationResult{
		Strategy:           types.MigrationBulk,
		VectorsMigrated:    totalMigrated,
		NamespacesMigrated: len(namespaces) - len(errors),
		Errors:             errors,
		Duration:           time.Since(start),
		ValidationPassed:   len(errors) == 0,
		Cost:               0, // No cost for reading from Postgres
	}, nil
}

// migrateNamespace migrates all vectors from a specific namespace
func (p *PostgresVectorStore) migrateNamespace(ctx context.Context, namespace string, destination types.VectorStore) (int64, error) {
	// Get all vectors in this namespace
	selectSQL := fmt.Sprintf(`
		SELECT id, embedding, metadata, created_at
		FROM %s
		WHERE namespace = $1
		ORDER BY created_at
	`, p.tableName)

	rows, err := p.db.QueryContext(ctx, selectSQL, namespace)
	if err != nil {
		return 0, fmt.Errorf("failed to select vectors: %w", err)
	}
	defer rows.Close()

	const batchSize = 100
	var vectors []types.Vector
	var migrated int64

	for rows.Next() {
		var (
			id           string
			embedding    pgvector.Vector
			metadataJSON []byte
			createdAt    time.Time
		)

		if err := rows.Scan(&id, &embedding, &metadataJSON, &createdAt); err != nil {
			return migrated, fmt.Errorf("failed to scan vector: %w", err)
		}

		var metadata map[string]interface{}
		if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
			metadata = make(map[string]interface{})
		}

		vector := types.Vector{
			ID:        id,
			Embedding: embedding.Slice(),
			Metadata:  metadata,
			Namespace: namespace,
			CreatedAt: createdAt,
		}

		vectors = append(vectors, vector)

		// Process in batches
		if len(vectors) >= batchSize {
			if err := p.storeBatch(ctx, namespace, vectors, destination); err != nil {
				return migrated, err
			}
			migrated += int64(len(vectors))
			vectors = vectors[:0] // Reset slice
		}
	}

	// Process remaining vectors
	if len(vectors) > 0 {
		if err := p.storeBatch(ctx, namespace, vectors, destination); err != nil {
			return migrated, err
		}
		migrated += int64(len(vectors))
	}

	return migrated, nil
}

// storeBatch stores a batch of vectors to the destination store
func (p *PostgresVectorStore) storeBatch(ctx context.Context, namespace string, vectors []types.Vector, destination types.VectorStore) error {
	req := &types.StoreRequest{
		Namespace: namespace,
		Vectors:   vectors,
	}

	_, err := destination.Store(ctx, req)
	return err
}
