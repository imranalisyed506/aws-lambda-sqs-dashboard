---
description: "Create or scaffold a generic RAG implementation that reads local PDFs, repository README markdown files, and help documentation with citations."
name: "Create RAG From Local Docs"
argument-hint: "Language/framework, vector store, embedding model, and target folder paths"
agent: "agent"
---
Use [Generic RAG System Instructions](../instructions/rag-system.instructions.md) as mandatory guidance.

Create an end-to-end RAG implementation for local knowledge sources.

Inputs to collect or infer:
- Preferred language/framework (for example: Python + FastAPI, Node.js + Express)
- Target source folders (PDFs, README markdowns, help docs)
- Embedding model and vector store preference
- LLM provider and model options (prioritize open-source models and providers)
- Optional escape hatch to allow custom model IDs with explicit opt-in
- Desired interface (CLI, REST API, or both)
- Whether a UI/dashboard should be included
- If UI is Angular, use a dev proxy (for example, `/api`) and note its configuration in output

Required output:
1. Project structure and dependency list.
2. Ingestion pipeline for PDFs, markdown, and help docs.
3. Configurable chunking and embedding setup.
4. Vector index creation and incremental re-index support.
5. Query pipeline with retrieval, optional rerank, and grounded response generation.
6. Runtime options to choose LLM provider and model (`env`, CLI, and API request overrides).
7. UI wiring details (proxy/CORS, base URL configuration) if a frontend is included.
8. Citation format that includes file path and page/section metadata.
9. Run instructions and sample commands for ingest and query, plus a single-command dev runner (for example, `scripts/run-dev.sh` and `scripts/run-dev.ps1`).
10. Basic tests and a minimal evaluation checklist.

Implementation constraints:
- Keep source handlers modular per file type.
- Use environment variables for secrets and model keys.
- Add logging around parse failures and skipped files.
- Never fabricate answers when retrieval evidence is insufficient.
- Prefer simple defaults that work locally first.

When assumptions are needed, state them explicitly before generating final code.

Example output block format:

```
Assumptions:
- Using Angular with a dev proxy at /api
- Single-command dev runner scripts at scripts/run-dev.sh and scripts/run-dev.ps1

Dev Runner:
- bash: bash scripts/run-dev.sh
- PowerShell: powershell -ExecutionPolicy Bypass -File scripts\run-dev.ps1

UI Wiring:
- Frontend base URL: /api
- Proxy config: ui/proxy.conf.json
```