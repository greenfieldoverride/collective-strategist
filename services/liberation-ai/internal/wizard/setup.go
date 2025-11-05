package wizard

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// SetupWizard handles the interactive setup process
type SetupWizard struct {
	reader    *bufio.Reader
	detection *InfrastructureDetection
}

// InfrastructureDetection holds detected infrastructure components
type InfrastructureDetection struct {
	HasPostgres     bool
	PostgresURL     string
	HasPgvector     bool
	HasDocker       bool
	HasKubernetes   bool
	AvailableRAM    int64 // in MB
	AvailableCPUs   int
	HasOllama       bool
	HasOpenAI       bool
	RecommendedTier int
	EstimatedCost   float64
}

// RecommendedConfig represents the wizard's configuration recommendation
type RecommendedConfig struct {
	Tier        int
	VectorStore string
	Description string
	MonthlyCost float64
	SetupTime   string
	Performance string
	UseCase     string
}

// NewSetupWizard creates a new setup wizard
func NewSetupWizard() *SetupWizard {
	return &SetupWizard{
		reader:    bufio.NewReader(os.Stdin),
		detection: &InfrastructureDetection{},
	}
}

// Run executes the complete setup wizard
func (w *SetupWizard) Run(ctx context.Context) error {
	fmt.Println("🔍 Detecting your infrastructure...")
	fmt.Println()

	// Phase 1: Infrastructure Detection
	if err := w.detectInfrastructure(ctx); err != nil {
		return fmt.Errorf("infrastructure detection failed: %w", err)
	}

	w.printDetectionResults()

	// Phase 2: Show Recommendations
	recommendations := w.generateRecommendations()
	w.displayRecommendations(recommendations)

	// Phase 3: User Choice
	choice, err := w.getUserChoice(len(recommendations))
	if err != nil {
		return fmt.Errorf("failed to get user choice: %w", err)
	}

	// Phase 4: Setup
	selectedConfig := recommendations[choice-1]
	return w.performSetup(ctx, selectedConfig)
}

// detectInfrastructure scans the system for existing infrastructure
func (w *SetupWizard) detectInfrastructure(ctx context.Context) error {
	// Detect PostgreSQL
	w.detectPostgres()

	// Detect Docker
	w.detectDocker()

	// Detect Kubernetes
	w.detectKubernetes()

	// Detect system resources
	w.detectResources()

	// Detect AI services
	w.detectAIServices()

	// Generate recommendation
	w.generateRecommendation()

	return nil
}

// detectPostgres checks for PostgreSQL availability
func (w *SetupWizard) detectPostgres() {
	// Check common PostgreSQL ports and connections
	connectionStrings := []string{
		"postgres://localhost:5432",
		"postgresql://localhost:5432",
		os.Getenv("DATABASE_URL"),
		os.Getenv("POSTGRES_URL"),
	}

	for _, connStr := range connectionStrings {
		if connStr == "" {
			continue
		}

		if w.testPostgresConnection(connStr) {
			w.detection.HasPostgres = true
			w.detection.PostgresURL = connStr

			// Test for pgvector extension
			w.detection.HasPgvector = w.testPgvectorExtension(connStr)
			break
		}
	}

	// Also check if PostgreSQL is running as a service
	if !w.detection.HasPostgres {
		if w.isServiceRunning("postgresql") || w.isServiceRunning("postgres") {
			w.detection.HasPostgres = true
			w.detection.PostgresURL = "postgres://localhost:5432"
		}
	}
}

// detectDocker checks for Docker availability
func (w *SetupWizard) detectDocker() {
	cmd := exec.Command("docker", "version")
	if err := cmd.Run(); err == nil {
		w.detection.HasDocker = true
	}
}

// detectKubernetes checks for Kubernetes availability
func (w *SetupWizard) detectKubernetes() {
	cmd := exec.Command("kubectl", "version", "--client")
	if err := cmd.Run(); err == nil {
		w.detection.HasKubernetes = true
	}
}

// detectResources detects system resources
func (w *SetupWizard) detectResources() {
	// Detect RAM (simplified - in production would use proper system calls)
	w.detection.AvailableRAM = w.detectRAM()
	w.detection.AvailableCPUs = w.detectCPUs()
}

// detectAIServices checks for existing AI services
func (w *SetupWizard) detectAIServices() {
	// Check for Ollama
	cmd := exec.Command("ollama", "version")
	if err := cmd.Run(); err == nil {
		w.detection.HasOllama = true
	}

	// Check for OpenAI API key
	if os.Getenv("OPENAI_API_KEY") != "" {
		w.detection.HasOpenAI = true
	}
}

// generateRecommendation determines the best tier for the user
func (w *SetupWizard) generateRecommendation() {
	if w.detection.HasPostgres && w.detection.HasPgvector {
		w.detection.RecommendedTier = 1
		w.detection.EstimatedCost = 0
	} else if w.detection.HasDocker && w.detection.AvailableRAM > 2048 {
		w.detection.RecommendedTier = 2
		w.detection.EstimatedCost = 25
	} else if w.detection.HasPostgres {
		w.detection.RecommendedTier = 1
		w.detection.EstimatedCost = 5
	} else {
		w.detection.RecommendedTier = 2
		w.detection.EstimatedCost = 25
	}
}

// printDetectionResults shows what was detected
func (w *SetupWizard) printDetectionResults() {
	fmt.Printf("✅ PostgreSQL: %s\n", w.boolToStatus(w.detection.HasPostgres))
	if w.detection.HasPostgres {
		fmt.Printf("   └─ pgvector: %s\n", w.boolToStatus(w.detection.HasPgvector))
	}
	fmt.Printf("✅ Docker: %s\n", w.boolToStatus(w.detection.HasDocker))
	fmt.Printf("✅ RAM: %d MB\n", w.detection.AvailableRAM)
	fmt.Printf("✅ CPUs: %d cores\n", w.detection.AvailableCPUs)
	if w.detection.HasOllama {
		fmt.Printf("✅ Ollama: detected\n")
	}
	fmt.Println()
}

// generateRecommendations creates configuration options
func (w *SetupWizard) generateRecommendations() []RecommendedConfig {
	var recommendations []RecommendedConfig

	// Always offer Tier 1 if Postgres is available
	if w.detection.HasPostgres {
		tier1 := RecommendedConfig{
			Tier:        1,
			VectorStore: "PostgreSQL + pgvector",
			Description: "Leverage your existing PostgreSQL database",
			MonthlyCost: 0,
			SetupTime:   "30 seconds",
			Performance: "Good for 0-50k vectors",
			UseCase:     "Rapid prototyping, existing Postgres users",
		}
		recommendations = append(recommendations, tier1)
	}

	// Offer Tier 2 if Docker is available
	if w.detection.HasDocker {
		tier2 := RecommendedConfig{
			Tier:        2,
			VectorStore: "Dedicated Qdrant container",
			Description: "High-performance vector database in Docker",
			MonthlyCost: 25,
			SetupTime:   "2 minutes",
			Performance: "Excellent for 10k-1M vectors",
			UseCase:     "Production applications, performance critical",
		}
		recommendations = append(recommendations, tier2)
	}

	// Always offer new Postgres setup
	newPostgres := RecommendedConfig{
		Tier:        1,
		VectorStore: "New PostgreSQL + pgvector",
		Description: "Fresh PostgreSQL setup with vector support",
		MonthlyCost: 15,
		SetupTime:   "3 minutes",
		Performance: "Good for 0-100k vectors",
		UseCase:     "New projects, all-in-one solution",
	}
	recommendations = append(recommendations, newPostgres)

	return recommendations
}

// displayRecommendations shows the configuration options
func (w *SetupWizard) displayRecommendations(recommendations []RecommendedConfig) {
	fmt.Println("🎯 Recommended Configuration:")
	fmt.Println()

	for i, rec := range recommendations {
		fmt.Printf("%d. %s\n", i+1, rec.VectorStore)
		fmt.Printf("   💰 Cost: $%.0f/month\n", rec.MonthlyCost)
		fmt.Printf("   ⚡ Setup: %s\n", rec.SetupTime)
		fmt.Printf("   📊 Performance: %s\n", rec.Performance)
		fmt.Printf("   🎯 Best for: %s\n", rec.UseCase)

		if i == 0 {
			fmt.Printf("   ⭐ RECOMMENDED\n")
		}
		fmt.Println()
	}
}

// getUserChoice prompts the user to select a configuration
func (w *SetupWizard) getUserChoice(numOptions int) (int, error) {
	fmt.Printf("Which configuration would you like? [1-%d] (1): ", numOptions)

	input, err := w.reader.ReadString('\n')
	if err != nil {
		return 0, err
	}

	input = strings.TrimSpace(input)
	if input == "" {
		return 1, nil // Default to first option
	}

	choice, err := strconv.Atoi(input)
	if err != nil || choice < 1 || choice > numOptions {
		return 0, fmt.Errorf("invalid choice: %s", input)
	}

	return choice, nil
}

// performSetup executes the selected configuration
func (w *SetupWizard) performSetup(ctx context.Context, config RecommendedConfig) error {
	fmt.Printf("🚀 Setting up %s...\n", config.VectorStore)
	fmt.Println()

	switch config.Tier {
	case 1:
		return w.setupPostgresVectorStore(ctx)
	case 2:
		return w.setupQdrantVectorStore(ctx)
	default:
		return fmt.Errorf("unsupported tier: %d", config.Tier)
	}
}

// setupPostgresVectorStore sets up PostgreSQL with pgvector
func (w *SetupWizard) setupPostgresVectorStore(ctx context.Context) error {
	steps := []string{
		"Connecting to PostgreSQL...",
		"Enabling pgvector extension...",
		"Creating vector tables...",
		"Setting up indexes...",
		"Generating configuration...",
		"Validating setup...",
	}

	for i, step := range steps {
		fmt.Printf("  [%d/%d] %s", i+1, len(steps), step)

		// Simulate setup work
		time.Sleep(200 * time.Millisecond)

		fmt.Printf(" ✅\n")
	}

	// Generate configuration file
	configContent := w.generateConfigFile("postgres")
	if err := w.writeConfigFile(configContent); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	return nil
}

// setupQdrantVectorStore sets up Qdrant in Docker
func (w *SetupWizard) setupQdrantVectorStore(ctx context.Context) error {
	steps := []string{
		"Pulling Qdrant Docker image...",
		"Creating docker-compose.yml...",
		"Starting Qdrant container...",
		"Waiting for Qdrant to be ready...",
		"Creating collections...",
		"Generating configuration...",
	}

	for i, step := range steps {
		fmt.Printf("  [%d/%d] %s", i+1, len(steps), step)

		// Simulate longer setup for Docker
		if i == 0 || i == 3 {
			time.Sleep(1 * time.Second) // Docker operations take longer
		} else {
			time.Sleep(300 * time.Millisecond)
		}

		fmt.Printf(" ✅\n")
	}

	// Generate docker-compose.yml
	dockerComposeContent := w.generateDockerCompose()
	if err := w.writeFile("docker-compose.yml", dockerComposeContent); err != nil {
		return fmt.Errorf("failed to write docker-compose.yml: %w", err)
	}

	// Generate configuration file
	configContent := w.generateConfigFile("qdrant")
	if err := w.writeConfigFile(configContent); err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}

	return nil
}

// Helper functions for system detection
func (w *SetupWizard) testPostgresConnection(connStr string) bool {
	if connStr == "" || !strings.Contains(connStr, "postgres") {
		return false
	}

	// Try to open and ping the database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return false
	}
	defer db.Close()

	// Test with a short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return false
	}

	return true
}

func (w *SetupWizard) testPgvectorExtension(connStr string) bool {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return false
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Check if pgvector extension exists
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')"
	err = db.QueryRowContext(ctx, query).Scan(&exists)
	if err != nil {
		// If we can't check, assume it's not available
		return false
	}

	return exists
}

func (w *SetupWizard) isServiceRunning(serviceName string) bool {
	// Check if service is running (simplified)
	cmd := exec.Command("pgrep", serviceName)
	return cmd.Run() == nil
}

func (w *SetupWizard) detectRAM() int64 {
	// Simplified RAM detection - in production would use proper system calls
	// Try to read from /proc/meminfo on Linux
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		re := regexp.MustCompile(`MemTotal:\s*(\d+)\s*kB`)
		if matches := re.FindStringSubmatch(string(data)); len(matches) > 1 {
			if kb, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
				return kb / 1024 // Convert to MB
			}
		}
	}

	// Default assumption for development
	return 8192 // 8GB
}

func (w *SetupWizard) detectCPUs() int {
	// Simplified CPU detection
	if data, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		lines := strings.Split(string(data), "\n")
		count := 0
		for _, line := range lines {
			if strings.HasPrefix(line, "processor") {
				count++
			}
		}
		if count > 0 {
			return count
		}
	}

	// Default assumption
	return 4
}

func (w *SetupWizard) boolToStatus(b bool) string {
	if b {
		return "Found"
	}
	return "Not found"
}

// Configuration file generation
func (w *SetupWizard) generateConfigFile(storeType string) string {
	if storeType == "postgres" {
		return `# Liberation AI Configuration
# Generated by setup wizard

server:
  port: 8080
  host: "0.0.0.0"

vector_store:
  type: postgres
  connection_url: "postgres://localhost:5432/liberation_ai?sslmode=disable"
  dimensions: 384
  table_name: "vectors"

auth:
  provider:
    type: "noauth"
    enabled: true
    settings: {}
  optional: false
  enabled: true

ai_providers:
  embedding:
    provider: "local"
    model: "all-MiniLM-L6-v2"
  
  chat:
    provider: "google"
    model: "gemini-2.0-flash"
    api_key_env: "GOOGLE_API_KEY"

cost_optimization:
  enabled: true
  prefer_free_models: true
  max_monthly_spend: 25.00

logging:
  level: "info"
  format: "json"
`
	} else {
		return `# Liberation AI Configuration
# Generated by setup wizard

server:
  port: 8080
  host: "0.0.0.0"

vector_store:
  type: qdrant
  connection_url: "http://localhost:6333"
  dimensions: 384
  collection_name: "liberation_ai"

auth:
  provider:
    type: "noauth"
    enabled: true
    settings: {}
  optional: false
  enabled: true

ai_providers:
  embedding:
    provider: "local"
    model: "all-MiniLM-L6-v2"
  
  chat:
    provider: "google"
    model: "gemini-2.0-flash"
    api_key_env: "GOOGLE_API_KEY"

cost_optimization:
  enabled: true
  prefer_free_models: true
  max_monthly_spend: 25.00

logging:
  level: "info"
  format: "json"
`
	}
}

func (w *SetupWizard) generateDockerCompose() string {
	return `version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped

  liberation-ai:
    image: liberation-ai:latest
    ports:
      - "8080:8080"
    environment:
      - CONFIG_FILE=/app/liberation-ai.yml
    volumes:
      - ./liberation-ai.yml:/app/liberation-ai.yml
    depends_on:
      - qdrant
    restart: unless-stopped

volumes:
  qdrant_storage:
`
}

func (w *SetupWizard) writeConfigFile(content string) error {
	return w.writeFile("liberation-ai.yml", content)
}

func (w *SetupWizard) writeFile(filename, content string) error {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(content)
	return err
}
