#!/bin/bash

# Quick demo script for RAG system with sample data
# This script demonstrates the complete workflow: ingest sample data and run queries

set -e

echo "🚀 RAG System Demo with Sample Data"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the absolute path to the ragdemo directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SAMPLE_DATA_DIR="$PROJECT_DIR/sample-data"

echo -e "${BLUE}Project directory: $PROJECT_DIR${NC}"
echo -e "${BLUE}Sample data directory: $SAMPLE_DATA_DIR${NC}"
echo ""

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}Backend not running. Please start it first:${NC}"
    echo "  ./scripts/run-dev.sh"
    echo ""
    echo "Or run backend only:"
    echo "  npm start"
    exit 1
fi

echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Step 1: Reset vector database (optional)
echo -e "${YELLOW}Step 1: Reset vector database (optional)${NC}"
read -p "Do you want to reset the vector database first? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Resetting vector database..."
    curl -s -X POST http://localhost:3000/reset > /dev/null
    echo -e "${GREEN}✓ Vector database reset${NC}"
fi
echo ""

# Step 2: Ingest sample data
echo -e "${YELLOW}Step 2: Ingest sample data${NC}"
echo "Ingesting documents from: $SAMPLE_DATA_DIR"
echo "This may take 30-60 seconds..."
echo ""

INGEST_RESPONSE=$(curl -s -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d "{\"directoryPath\": \"$SAMPLE_DATA_DIR\"}")

echo "$INGEST_RESPONSE" | jq '.' 2>/dev/null || echo "$INGEST_RESPONSE"
echo -e "${GREEN}✓ Sample data ingested${NC}"
echo ""

# Wait a moment for ingestion to complete
sleep 2

# Step 3: Run sample queries
echo -e "${YELLOW}Step 3: Running sample queries${NC}"
echo ""

# Array of sample queries
queries=(
    "How does RAG work?"
    "What vector databases are supported?"
    "How do I configure Ollama?"
    "What are the CloudStore pricing plans?"
    "How do I create a product via API?"
)

# Function to run a query and display results
run_query() {
    local question="$1"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Q: $question${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    QUERY_RESPONSE=$(curl -s -X POST http://localhost:3000/query \
      -H "Content-Type: application/json" \
      -d "{\"question\": \"$question\", \"topK\": 3}")
    
    # Extract and display the answer
    echo "$QUERY_RESPONSE" | jq -r '.answer // .error // "No response"' 2>/dev/null || echo "$QUERY_RESPONSE"
    echo ""
    
    # Show sources
    echo -e "${YELLOW}Sources:${NC}"
    echo "$QUERY_RESPONSE" | jq -r '.citations[]? | "  - \(.filePath)"' 2>/dev/null || echo "  No citations available"
    echo ""
}

# Run each query
for query in "${queries[@]}"; do
    run_query "$query"
    sleep 1
done

# Summary
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Demo complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Visit the UI: http://localhost:4200"
echo "  2. Try your own queries in the UI"
echo "  3. Ingest your own documents"
echo "  4. Read the sample data guide: cat sample-data/README.md"
echo ""
echo -e "${BLUE}To run more queries:${NC}"
echo "  npm run query -- --question \"Your question here\""
echo ""
echo -e "${BLUE}To test different LLM providers:${NC}"
echo "  npm run query -- --question \"Your question\" --llm-provider groq --llm-model mixtral-8x7b-32768"
echo ""
