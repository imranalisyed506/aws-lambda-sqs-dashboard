---
description: "Use when building or updating Retrieval-Augmented Generation (RAG) systems that ingest local PDFs, repository README markdown files, help documentation, and mixed local docs. Covers ingestion, chunking, metadata, indexing, retrieval, and answer citation standards."
name: "Generic RAG System Instructions"
---
# Generic RAG System Instructions

## Goal

Build a production-oriented RAG pipeline that can ingest and query:
- Local PDF files
- Git repository README markdown files
- Help and support documentation (Markdown, text, HTML exports)
- Other local knowledge documents

## Source Coverage Rules

- Treat each source as a first-class document type with its own parser.
- Preserve source provenance for every chunk: file path, repository, section heading, page number (if available), and last-modified timestamp.
- Support recursive folder ingestion with allowlists and denylists for file patterns.
- Fail gracefully on malformed files and continue ingestion for healthy files.

## Parsing and Normalization

- PDFs: extract text per page, keep page index metadata, and remove repetitive headers/footers where possible.
- Markdown: preserve heading hierarchy and convert links to absolute or repository-relative form in metadata.
- Help docs: normalize into plain text while preserving section boundaries.
- Normalize whitespace and Unicode, but do not remove meaningful code blocks, lists, or tables.

## Chunking Strategy

- Use structure-aware chunking first (heading/section based), then token-based fallback.
- Keep chunk size and overlap configurable.
- Store parent document id and section lineage in metadata.
- Avoid splitting code blocks or bullet lists mid-structure when possible.

## Embeddings and Indexing

- Use one embedding model per index unless there is a deliberate hybrid strategy.
- Store vectors and metadata in a retrievable index (local or managed).
- Support incremental re-indexing by detecting changed files via checksum or modified time.
- Add deduplication to avoid storing duplicate chunks across reruns.

## Retrieval and Ranking

- Retrieve by semantic similarity with configurable `top_k`.
- Optionally include metadata filters (source type, repo, date, path prefix).
- Use reranking when available for better precision.
- Return retrieval context with source metadata for transparent answers.

## Answer Generation Rules

- Ground all answers only in retrieved context.
- Provide configurable LLM provider and model selection with environment variables and per-request overrides.
- Include open-source provider options (for example: Ollama, OpenRouter, Groq, Together) and document valid model IDs.
- Validate provider/model combinations at request start and fail fast on unsupported model IDs.
- Keep strict validation by default; allow custom model IDs only through explicit opt-in controls.
- Cite sources per claim using file path and page/section where possible.
- If evidence is weak or missing, say what is unknown and suggest where to search next.
- Do not fabricate citations.

## API and UX Expectations

- Provide a clear ingest command and a query command.
- Expose key config values via environment variables or config file.
- Include progress logging for ingestion and indexing.
- Return structured query output with: answer, citations, and confidence notes.
- If a UI is included, ensure it connects to the backend via a proxy or CORS-safe base URL.
- Provide a single-command dev runner script (bash and PowerShell) that starts frontend + backend together.
- For Angular UIs, document the dev proxy path (for example, `/api` → backend) and include script names such as `scripts/run-dev.sh` and `scripts/run-dev.ps1`.

## Quality and Evaluation

- Include a small eval set with representative questions from PDFs and markdown docs.
- Track retrieval quality metrics (hit rate at k, citation accuracy).
- Add tests for parser edge cases (empty docs, scanned PDFs, broken markdown).

## Operational Safety

- Never send local documents to external services unless explicitly configured by the user.
- Redact secrets and credentials if detected during ingestion.
- Keep local paths in citations but avoid exposing unrelated private file content.
