package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"

	"liberation-ai/internal/service"
	"liberation-ai/internal/vectorstore"
	"liberation-ai/internal/wizard"
)

var (
	wizardMode = flag.Bool("init", false, "Run the Liberation AI setup wizard")
	serve      = flag.Bool("serve", false, "Start the Liberation AI server")
	config     = flag.String("config", "liberation-ai.yml", "Path to configuration file")
	port       = flag.Int("port", 8080, "Port to serve on")
)

func main() {
	flag.Parse()

	if *wizardMode {
		runSetupWizard()
		return
	}

	if *serve {
		runServer()
		return
	}

	// Default: show help
	showHelp()
}

func runSetupWizard() {
	fmt.Println("🤖 Liberation AI Setup Wizard")
	fmt.Println("=============================")
	fmt.Println()

	ctx := context.Background()
	w := wizard.NewSetupWizard()

	if err := w.Run(ctx); err != nil {
		fmt.Printf("❌ Setup failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("🚀 Liberation AI is ready!")
	fmt.Println()
	fmt.Println("Next steps:")
	fmt.Printf("  liberation-ai serve --config=%s\n", *config)
	fmt.Println("  curl http://localhost:8080/health")
	fmt.Println()
}

func runServer() {
	fmt.Printf("🚀 Starting Liberation AI server on port %d...\n", *port)
	fmt.Printf("📄 Config file: %s\n", *config)

	// Initialize vector store (in-memory for demo)
	store := vectorstore.NewMemoryVectorStore(384)
	vectorService := service.NewVectorService(store)

	fmt.Printf("✅ Vector store initialized: memory (384 dimensions)\n")

	// Setup Gin server
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// Health endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "liberation-ai",
			"version": "1.0.0",
			"uptime":  time.Since(time.Now()).String(),
		})
	})

	// Ready endpoint
	r.GET("/ready", func(c *gin.Context) {
		err := vectorService.Health(c.Request.Context())
		status := "ready"
		if err != nil {
			status = "degraded"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":       status,
			"vector_store": "memory",
			"healthy":      err == nil,
		})
	})

	// Vector operations
	v1 := r.Group("/v1")
	{
		// Store text documents
		v1.POST("/documents", func(c *gin.Context) {
			var docs []service.Document
			if err := c.ShouldBindJSON(&docs); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			namespace := c.Query("namespace")
			if namespace == "" {
				namespace = "default"
			}

			response, err := vectorService.StoreDocuments(c.Request.Context(), namespace, docs)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, response)
		})

		// Search documents
		v1.GET("/search", func(c *gin.Context) {
			query := c.Query("q")
			if query == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
				return
			}

			namespace := c.Query("namespace")
			if namespace == "" {
				namespace = "default"
			}

			limit := 10
			if l := c.Query("limit"); l != "" {
				if parsed, err := fmt.Sscanf(l, "%d", &limit); err != nil || parsed != 1 {
					limit = 10
				}
			}

			response, err := vectorService.SearchText(c.Request.Context(), namespace, query, limit)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, response)
		})

		// Get specific vector
		v1.GET("/vectors/:namespace/:id", func(c *gin.Context) {
			namespace := c.Param("namespace")
			id := c.Param("id")

			vector, err := vectorService.GetVector(c.Request.Context(), namespace, id)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, vector)
		})

		// List namespaces
		v1.GET("/namespaces", func(c *gin.Context) {
			namespaces, err := vectorService.ListNamespaces(c.Request.Context())
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"namespaces": namespaces,
				"count":      len(namespaces),
			})
		})
	}

	// Stats endpoint
	r.GET("/stats", func(c *gin.Context) {
		stats, err := vectorService.GetStats(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, stats)
	})

	// Cost endpoint
	r.GET("/cost", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"current_month": gin.H{
				"vector_store": 0,
				"ai_models":    0,
				"total":        0,
			},
			"projected_month": gin.H{
				"vector_store": 0,
				"ai_models":    5,
				"total":        5,
			},
			"savings_vs_enterprise": gin.H{
				"traditional_cost": 2500,
				"liberation_cost":  5,
				"savings":          2495,
				"savings_percent":  99.8,
			},
		})
	})

	// Prometheus metrics endpoint
	r.GET("/metrics", func(c *gin.Context) {
		stats, _ := vectorService.GetStats(c.Request.Context())
		var m runtime.MemStats
		runtime.ReadMemStats(&m)

		// Generate Prometheus format metrics
		metrics := fmt.Sprintf(`# HELP liberation_ai_info Information about Liberation AI
# TYPE liberation_ai_info gauge
liberation_ai_info{version="1.0.0",service="liberation-ai"} 1

# HELP liberation_ai_uptime_seconds Uptime in seconds
# TYPE liberation_ai_uptime_seconds counter
liberation_ai_uptime_seconds %d

# HELP liberation_ai_namespaces_total Total number of namespaces
# TYPE liberation_ai_namespaces_total gauge
liberation_ai_namespaces_total %d

# HELP liberation_ai_vectors_total Total number of vectors
# TYPE liberation_ai_vectors_total gauge
liberation_ai_vectors_total %d

# HELP liberation_ai_memory_bytes Memory usage in bytes
# TYPE liberation_ai_memory_bytes gauge
liberation_ai_memory_bytes %d

# HELP liberation_ai_storage_size_bytes Storage size in bytes
# TYPE liberation_ai_storage_size_bytes gauge
liberation_ai_storage_size_bytes %d

# HELP liberation_ai_avg_search_time_ms Average search time in milliseconds
# TYPE liberation_ai_avg_search_time_ms gauge
liberation_ai_avg_search_time_ms %d
`,
			0, // uptime placeholder
			stats.TotalNamespaces,
			stats.TotalVectors,
			m.Alloc,
			stats.StorageSize,
			stats.Performance.AvgSearchTime,
		)

		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.String(http.StatusOK, metrics)
	})

	fmt.Printf("💡 Health check: http://localhost:%d/health\n", *port)
	fmt.Printf("📊 Cost tracking: http://localhost:%d/cost\n", *port)
	fmt.Printf("📈 Statistics: http://localhost:%d/stats\n", *port)
	fmt.Printf("🔍 Vector operations: http://localhost:%d/v1/\n", *port)
	fmt.Printf("📄 Store documents: POST http://localhost:%d/v1/documents\n", *port)
	fmt.Printf("🔍 Search documents: GET http://localhost:%d/v1/search?q=query\n", *port)
	fmt.Println()

	addr := fmt.Sprintf(":%d", *port)
	if err := r.Run(addr); err != nil {
		fmt.Printf("❌ Server failed: %v\n", err)
		os.Exit(1)
	}
}

func showHelp() {
	fmt.Println("🤖 Liberation AI - Enterprise AI orchestration for $25/month instead of $2500/month")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  liberation-ai init                    Run setup wizard")
	fmt.Println("  liberation-ai serve                   Start the AI server")
	fmt.Println("  liberation-ai serve --port=9000       Start on custom port")
	fmt.Println("  liberation-ai --help                  Show this help")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  # Quick setup (recommended)")
	fmt.Println("  liberation-ai init")
	fmt.Println()
	fmt.Println("  # Start server")
	fmt.Println("  liberation-ai serve")
	fmt.Println()
	fmt.Println("Documentation: https://github.com/thegreenfieldoverride/liberation-ai")
}
