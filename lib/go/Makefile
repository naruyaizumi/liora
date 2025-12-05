.PHONY: help install generate build run test clean proto dev deploy logs status restart stop

# Variables
BINARY_NAME=ai-service
BINARY_PATH=bin/$(BINARY_NAME)
MAIN_PATH=cmd/server/main.go
PROTO_PATH=../protos/ai.proto
PB_PATH=pb

# Colors
COLOR_RESET=\033[0m
COLOR_BOLD=\033[1m
COLOR_GREEN=\033[32m
COLOR_YELLOW=\033[33m
COLOR_BLUE=\033[34m

help: ## Show this help message
	@echo "$(COLOR_BOLD)Liora AI Service - Available Commands$(COLOR_RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(COLOR_GREEN)%-15s$(COLOR_RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "$(COLOR_BLUE)📦 Installing dependencies...$(COLOR_RESET)"
	go mod download
	go mod tidy
	@echo "$(COLOR_GREEN)✓ Dependencies installed$(COLOR_RESET)"

generate: proto ## Generate gRPC code (alias for proto)

proto: ## Generate gRPC code from proto files
	@echo "$(COLOR_BLUE)🔧 Generating gRPC code...$(COLOR_RESET)"
	chmod +x scripts/generate.sh
	./scripts/generate.sh
	@echo "$(COLOR_GREEN)✓ gRPC code generated$(COLOR_RESET)"

build: ## Build the binary
	@echo "$(COLOR_BLUE)🔨 Building $(BINARY_NAME)...$(COLOR_RESET)"
	mkdir -p bin
	go build -o $(BINARY_PATH) $(MAIN_PATH)
	@echo "$(COLOR_GREEN)✓ Build complete: $(BINARY_PATH)$(COLOR_RESET)"

build-linux: ## Build for Linux (cross-compile)
	@echo "$(COLOR_BLUE)🔨 Building for Linux...$(COLOR_RESET)"
	mkdir -p bin
	GOOS=linux GOARCH=amd64 go build -o $(BINARY_PATH)-linux $(MAIN_PATH)
	@echo "$(COLOR_GREEN)✓ Linux build complete$(COLOR_RESET)"

run: ## Run the service directly
	@echo "$(COLOR_BLUE)🚀 Starting service...$(COLOR_RESET)"
	go run $(MAIN_PATH)

dev: ## Run in development mode with auto-reload
	@echo "$(COLOR_BLUE)👨‍💻 Starting development mode...$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)Press Ctrl+C to stop$(COLOR_RESET)"
	go run $(MAIN_PATH)

test: ## Run tests
	@echo "$(COLOR_BLUE)🧪 Running tests...$(COLOR_RESET)"
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "$(COLOR_GREEN)✓ Tests complete$(COLOR_RESET)"

test-coverage: ## Run tests with coverage report
	@echo "$(COLOR_BLUE)📊 Running tests with coverage...$(COLOR_RESET)"
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out
	@echo "$(COLOR_GREEN)✓ Coverage report generated$(COLOR_RESET)"

bench: ## Run benchmarks
	@echo "$(COLOR_BLUE)⚡ Running benchmarks...$(COLOR_RESET)"
	go test -bench=. -benchmem ./...

clean: ## Clean build artifacts
	@echo "$(COLOR_BLUE)🧹 Cleaning...$(COLOR_RESET)"
	rm -rf bin/
	rm -f coverage.out coverage.html
	go clean
	@echo "$(COLOR_GREEN)✓ Cleaned$(COLOR_RESET)"

fmt: ## Format code
	@echo "$(COLOR_BLUE)💅 Formatting code...$(COLOR_RESET)"
	go fmt ./...
	@echo "$(COLOR_GREEN)✓ Code formatted$(COLOR_RESET)"

lint: ## Run linter
	@echo "$(COLOR_BLUE)🔍 Running linter...$(COLOR_RESET)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "$(COLOR_YELLOW)⚠ golangci-lint not installed, using go vet$(COLOR_RESET)"; \
		go vet ./...; \
	fi
	@echo "$(COLOR_GREEN)✓ Linting complete$(COLOR_RESET)"

vet: ## Run go vet
	@echo "$(COLOR_BLUE)🔍 Running go vet...$(COLOR_RESET)"
	go vet ./...
	@echo "$(COLOR_GREEN)✓ Vet complete$(COLOR_RESET)"

deploy: build ## Build and deploy to systemd
	@echo "$(COLOR_BLUE)🚀 Deploying service...$(COLOR_RESET)"
	sudo systemctl stop liora-ai || true
	sudo cp $(BINARY_PATH) /usr/local/bin/$(BINARY_NAME)
	sudo cp liora-ai.service /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable liora-ai
	sudo systemctl start liora-ai
	@echo "$(COLOR_GREEN)✓ Service deployed$(COLOR_RESET)"
	@make status

status: ## Check service status
	@echo "$(COLOR_BLUE)📊 Service Status:$(COLOR_RESET)"
	@sudo systemctl status liora-ai --no-pager || true

logs: ## View service logs
	@echo "$(COLOR_BLUE)📋 Service Logs (Ctrl+C to exit):$(COLOR_RESET)"
	sudo journalctl -u liora-ai -f

logs-today: ## View today's logs
	@echo "$(COLOR_BLUE)📋 Today's Logs:$(COLOR_RESET)"
	sudo journalctl -u liora-ai --since today --no-pager

restart: ## Restart service
	@echo "$(COLOR_BLUE)🔄 Restarting service...$(COLOR_RESET)"
	sudo systemctl restart liora-ai
	@echo "$(COLOR_GREEN)✓ Service restarted$(COLOR_RESET)"
	@make status

stop: ## Stop service
	@echo "$(COLOR_BLUE)🛑 Stopping service...$(COLOR_RESET)"
	sudo systemctl stop liora-ai
	@echo "$(COLOR_GREEN)✓ Service stopped$(COLOR_RESET)"

start: ## Start service
	@echo "$(COLOR_BLUE)▶️  Starting service...$(COLOR_RESET)"
	sudo systemctl start liora-ai
	@echo "$(COLOR_GREEN)✓ Service started$(COLOR_RESET)"
	@make status

db-create: ## Create database
	@echo "$(COLOR_BLUE)🗄️  Creating database...$(COLOR_RESET)"
	createdb ai || echo "Database may already exist"
	psql -d ai -c "CREATE EXTENSION IF NOT EXISTS vector;"
	@echo "$(COLOR_GREEN)✓ Database ready$(COLOR_RESET)"

db-drop: ## Drop database (CAUTION)
	@echo "$(COLOR_YELLOW)⚠️  This will delete all data!$(COLOR_RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		dropdb ai; \
		echo "$(COLOR_GREEN)✓ Database dropped$(COLOR_RESET)"; \
	fi

db-reset: db-drop db-create ## Reset database

check: ## Check system requirements
	@echo "$(COLOR_BLUE)🔍 Checking requirements...$(COLOR_RESET)"
	@command -v go >/dev/null 2>&1 || echo "❌ Go not installed"
	@command -v protoc >/dev/null 2>&1 || echo "❌ protoc not installed"
	@command -v psql >/dev/null 2>&1 || echo "❌ PostgreSQL not installed"
	@command -v redis-cli >/dev/null 2>&1 || echo "❌ Redis not installed"
	@echo "$(COLOR_GREEN)✓ Requirements check complete$(COLOR_RESET)"

info: ## Show project info
	@echo "$(COLOR_BOLD)Project Information$(COLOR_RESET)"
	@echo "Binary: $(BINARY_NAME)"
	@echo "Go version: $(shell go version)"
	@echo "Modules: $(shell go list -m)"
	@echo ""
	@echo "$(COLOR_BOLD)Dependencies:$(COLOR_RESET)"
	@go list -m all | grep -v "^github.com/liora/lib/go" | head -10

all: clean install generate build ## Clean, install, generate, and build

quick: build run ## Quick build and run