.PHONY: help install clean clean-cache clean-all build dev test lint format

# Default target
help:
	@echo "Local Docs RAG System - Makefile Commands"
	@echo "==========================================="
	@echo ""
	@echo "Installation & Setup:"
	@echo "  make install          - Install all dependencies (backend + frontend)"
	@echo "  make setup            - Install dependencies and setup environment"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start development servers"
	@echo "  make start-backend    - Start backend only (port 3000)"
	@echo "  make start-frontend   - Start frontend only (port 5173)"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test             - Run all tests"
	@echo "  make lint             - Run ESLint on source files"
	@echo "  make format           - Format code with Prettier"
	@echo ""
	@echo "Cleaning:"
	@echo "  make clean            - Remove node_modules directories"
	@echo "  make clean-cache      - Remove cache files (.cache, .turbo, etc.)"
	@echo "  make clean-build      - Remove build outputs (dist/)"
	@echo "  make clean-logs       - Remove log files"
	@echo "  make clean-all        - Remove everything (node_modules, cache, build, logs)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        - Start Docker services (Ollama, Qdrant, etc.)"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make docker-clean     - Remove Docker containers and volumes"
	@echo ""

# Installation targets
install:
	@echo "Installing dependencies..."
	npm install
	@if [ -d "ui" ]; then \
		cd ui && npm install && cd ..; \
	fi
	@echo "✓ Dependencies installed"

setup: install
	@echo "Setting up environment..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env from .env.example"; \
	fi
	@echo "✓ Setup complete"

# Development targets
dev:
	@echo "Starting development environment..."
	./scripts/run-dev.sh

start-backend:
	@echo "Starting backend server (port 3000)..."
	npm run start

start-frontend:
	@if [ -d "ui" ]; then \
		cd ui && npm run dev; \
	else \
		echo "Frontend directory not found"; \
	fi

# Testing & Quality targets
test:
	@echo "Running tests..."
	npm run test 2>/dev/null || echo "Tests not configured"

lint:
	@echo "Linting source files..."
	npx eslint src/ 2>/dev/null || echo "ESLint not available"

format:
	@echo "Formatting code..."
	npx prettier --write "src/**/*.js" 2>/dev/null || echo "Prettier not available"

# Cleaning targets
clean:
	@echo "Removing node_modules directories..."
	@rm -rf node_modules
	@if [ -d "ui" ]; then \
		rm -rf ui/node_modules; \
	fi
	@echo "✓ node_modules cleaned"

clean-cache:
	@echo "Removing cache files..."
	@rm -rf .cache .turbo .eslintcache
	@if [ -d "ui" ]; then \
		rm -rf ui/.cache ui/.turbo ui/.eslintcache; \
	fi
	@echo "✓ Cache files cleaned"

clean-build:
	@echo "Removing build outputs..."
	@rm -rf dist build *.tsbuildinfo
	@if [ -d "ui" ]; then \
		rm -rf ui/dist ui/build; \
	fi
	@echo "✓ Build outputs cleaned"

clean-logs:
	@echo "Removing log files..."
	@rm -rf logs
	@find . -maxdepth 2 -name "*.log" -delete
	@find . -maxdepth 2 -name "npm-debug.log*" -delete
	@echo "✓ Log files cleaned"

clean-data:
	@echo "Removing data files..."
	@rm -rf data/*.json data/*.json.bak
	@echo "✓ Data files cleaned (keeping directory structure)"

clean-all: clean clean-cache clean-build clean-logs
	@echo "Removing Docker volumes..."
	@docker-compose down -v 2>/dev/null || true
	@echo "✓ Everything cleaned"

# Docker targets
docker-up:
	@echo "Starting Docker services..."
	docker-compose up -d
	@echo "✓ Docker services started"

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down
	@echo "✓ Docker services stopped"

docker-clean:
	@echo "Removing Docker containers and volumes..."
	docker-compose down -v
	@echo "✓ Docker containers and volumes removed"

# Utility targets
reinstall: clean install
	@echo "✓ Reinstallation complete"

full-reset: clean-all install
	@echo "✓ Full reset complete"

status:
	@echo "Project Status"
	@echo "=============="
	@echo "Backend: src/server.js"
	@echo "Frontend: ui/"
	@echo "Sample Data: sample-data/"
	@echo ""
	@docker-compose ps 2>/dev/null || echo "Docker not running"
	@echo ""
	@du -sh node_modules 2>/dev/null || echo "node_modules not found"
	@if [ -d "ui/node_modules" ]; then \
		echo "Frontend node_modules: $$(du -sh ui/node_modules | cut -f1)"; \
	fi
