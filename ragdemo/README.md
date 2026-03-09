# Local Docs RAG (Node.js)

Generic Node.js RAG starter for local documents:
- PDFs
- Git README markdown files
- Help docs (`.md`, `.txt`, `.html`)
- Optional help documentation websites (crawler)

This implementation uses true embedding-based retrieval with a Qdrant vector database.

You can select a vector DB provider via `VECTOR_DB_PROVIDER`. This starter implements `qdrant`, `chroma`, and `milvus`.

## Folder Layout (Preconfigured)

All default sources now live under `sample-data/`:

- `sample-data/docs/`
- `sample-data/repo/`
- `sample-data/help-site/`

`.env` is already preconfigured to ingest these folders.

## 1. Install

```bash
npm install
```

## 2. Start Infrastructure (Docker Compose)

This project ships with Docker Compose to run Ollama and vector databases.

```bash
docker compose up -d
```

Or use the helper script:

```bash
./scripts/run-docker.sh
```

Pull recommended Ollama models (including embeddings):

```bash
./scripts/pull-ollama-models.sh
```

Windows PowerShell equivalents:

```powershell
./scripts/run-docker.ps1
./scripts/pull-ollama-models.ps1
```

Keep `.env` defaults:

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
VECTOR_DB_PROVIDER=qdrant
```

### Option B: OpenAI + Qdrant

Set in `.env`:

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
QDRANT_URL=http://localhost:6333
```

Vector DB provider options:

```env
VECTOR_DB_PROVIDER=qdrant
```

Supported values: `chroma`, `pinecone`, `weaviate`, `faiss`, `qdrant`, `milvus`.
Implemented today: `qdrant`, `chroma`, `milvus`.

Chroma is included in Docker Compose (port 8000).

Milvus is available via profile:

```bash
docker compose --profile milvus up -d
```

## LLM Provider And Model Options

Set generation provider and model in `.env`:

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1:8b
LLM_ALLOW_CUSTOM_MODEL=false
```

Supported providers:
- `none` (extractive fallback only)
- `ollama` (local open-source)
- `openrouter` (hosted open-source)
- `groq` (hosted open-source)
- `together` (hosted open-source)
- `openai`

Example open-source models:
- Ollama: `llama3.1:8b`, `qwen2.5:7b`, `mistral:7b-instruct`
- OpenRouter: `meta-llama/llama-3.1-8b-instruct`, `mistralai/mistral-7b-instruct`
- Groq: `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
- Together: `meta-llama/Llama-3.1-8B-Instruct-Turbo`, `mistralai/Mixtral-8x7B-Instruct-v0.1`

Model validation is strict: unsupported model IDs for a provider fail fast with a clear error.
Set `LLM_ALLOW_CUSTOM_MODEL=true` to bypass curated model checks.

## 3. Configure Sources

Edit `.env`:

```env
RAG_SOURCE_DIRS=./sample-data/docs,./sample-data/repo,./sample-data/help-site
RAG_HELP_URLS=https://docs.example.com/help
```

Add files under those folders.

Website crawl is optional; leave `RAG_HELP_URLS` empty if you only want local files.

## 4. Run Backend API

```bash
npm start
```

Backend runs at http://localhost:3000.

## 5. Run Frontend UI

```bash
cd ui
npm start
```

Frontend runs at http://localhost:4200.

## 6. Run Full Dev (API + UI + Docker)

```bash
./scripts/run-dev.sh
```

Skip Docker (use external services or local providers):

```bash
USE_DOCKER=0 ./scripts/run-dev.sh
```

PowerShell:

```powershell
./scripts/run-dev.ps1
```

Skip Docker:

```powershell
$env:USE_DOCKER=0; ./scripts/run-dev.ps1
```

## 6b. Run App Only (API + UI)

```bash
./scripts/run-app.sh
```

PowerShell:

```powershell
./scripts/run-app.ps1
```

## 7. Run E2E Demo (Ingest + Query)

```bash
./scripts/demo-sample-data.sh
```

This script ingests the sample data and runs a few example queries end-to-end.

## 8. Ingest

```bash
npm run ingest
```

Optional custom source dirs and help websites:

```bash
npm run ingest -- --source ./sample-data/docs,./sample-data/repo --help-urls https://docs.example.com/help,https://docs.example.com/api
```

## 9. Query (CLI)

```bash
npm run query -- --question "How do I configure authentication?"
```

Optional source-type filter:

```bash
npm run query -- --question "How do I configure authentication?" --source-type web-help
```

Optional LLM override at query time:

```bash
npm run query -- --question "How do I configure authentication?" --llm-provider openrouter --llm-model meta-llama/llama-3.1-8b-instruct
```

Allow custom/non-catalog model IDs for a one-off query:

```bash
npm run query -- --question "How do I configure authentication?" --llm-provider ollama --llm-model my-private-model --allow-custom-model
```

List available provider/model options:

```bash
npm run query -- --list-model-options
```

## 10. API Mode

```bash
npm start
```

Endpoints:
- `GET /health`
- `GET /model-options`
- `POST /ingest` with `{ "sourceDirs": ["./docs"], "helpUrls": ["https://docs.example.com/help"] }` (all optional)
- `POST /query` with `{ "question": "...", "topK": 5, "filters": { "sourceType": "web-help" } }`
- `POST /query` accepts optional `llm`: `{ "provider": "ollama", "model": "llama3.1:8b", "allowCustomModel": false, "temperature": 0.2, "maxTokens": 500 }`

## Notes

- Index file is persisted at `data/rag-index.json`.
- Vector data is stored in Qdrant collection from `QDRANT_COLLECTION`.
- Re-ingest resets and repopulates the configured vector collection.
- Query responses include citations with file path plus section/page metadata when available.

## Run Tests

```bash
npm test
```

## 📚 Sample Data

A comprehensive set of sample documents is included in the `sample-data/` directory for testing the RAG system. This includes:

### Included Content
- **docs/** - Technical documentation about RAG systems, vector databases, and LLM providers
- **repo/** - Sample repository with README, contributing guidelines, and API documentation
- **help-site/** - Customer support content including FAQ, troubleshooting, and getting started guides

### Quick Start with Sample Data

```bash
# Start Docker services + development servers
./scripts/run-dev.sh

# Visit the UI
open http://localhost:4200

# Ingest sample data using the UI:
# Paste this path: /Users/imransyed/Downloads/projects/march9/ragdemo/sample-data
# Click "Ingest Documents"
```

Or use the API directly:

```bash
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"sourceDirs": ["/absolute/path/to/ragdemo/sample-data"]}'
```

### Try These Queries

After ingesting the sample data:

```bash
# Technical questions
npm run query -- --question "How does RAG work?"
npm run query -- --question "What vector database should I use for production?"

# API questions
npm run query -- --question "How do I create a product via API?"
npm run query -- --question "What authentication does the API use?"

# Customer support
npm run query -- --question "What are the pricing plans?"
npm run query -- --question "How do I reset my password?"
```

### Learn More

See [sample-data/README.md](sample-data/README.md) for detailed information about the sample documents, suggested test queries, and testing scenarios.
