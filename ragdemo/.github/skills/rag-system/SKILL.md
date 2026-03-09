---
name: rag-system
description: 'Build or upgrade a Retrieval-Augmented Generation (RAG) system for local PDFs, repo README markdown, and help docs. Use when adding ingestion, embeddings, vector DB retrieval, LLM provider selection, citations, UI wiring, or single-command dev runners.'
argument-hint: 'Language/framework, embedding provider, vector DB, UI needs'
user-invocable: true
---
# RAG System Skill

## When to Use
- Create or extend a RAG pipeline for local documents (PDF, markdown, help docs).
- Add embeddings, vector DB storage, and semantic retrieval.
- Introduce LLM provider/model selection with strict validation and optional escape hatch.
- Wire a UI to the backend (proxy or CORS-safe base URL).
- Add one-command dev scripts to run frontend and backend together.

## Procedure
1. Review [RAG system instructions](../../instructions/rag-system.instructions.md) and follow all rules.
2. Confirm sources (folders + optional help URLs), chunking, and metadata needs.
3. Implement ingestion with file parsers and optional web crawling.
4. Add embeddings + vector database indexing with incremental re-index support.
5. Implement query pipeline with retrieval, rerank (optional), and grounded answers.
6. Expose config via env vars and add CLI/API overrides.
7. If UI is needed, wire API base URL via proxy or CORS-safe config.
8. Add single-command dev runner scripts (bash and PowerShell).
9. Add tests for parsers, chunking, retrieval, and model validation.

## Outputs Checklist
- Ingest and query commands work end-to-end
- Citations include file path and section/page metadata
- LLM provider/model selection documented with strict validation
- Optional escape hatch for custom model IDs
- UI connects to backend (proxy or CORS)
- Dev runner scripts: scripts/run-dev.sh and scripts/run-dev.ps1

## Related Assets
- [Generic RAG system instructions](../../instructions/rag-system.instructions.md)
- [RAG project prompt](../../prompts/create-rag-from-local-docs.prompt.md)
- [Check API health](./scripts/check-api.sh)
- [Example query request](./scripts/example-query.sh)
