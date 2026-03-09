# Getting Started with RAG Systems

## What is RAG?

Retrieval-Augmented Generation (RAG) is a technique that combines information retrieval with large language models to provide accurate, contextual responses grounded in your documents.

## How RAG Works

1. **Document Ingestion**: Your documents are split into chunks and converted into vector embeddings
2. **Vector Storage**: Embeddings are stored in a vector database (Qdrant, Chroma, or Milvus)
3. **Query Processing**: User questions are converted to embeddings
4. **Similarity Search**: The system finds the most relevant document chunks
5. **Response Generation**: An LLM generates answers using the retrieved context

## Key Benefits

- **Accurate Responses**: Answers are grounded in your actual documents
- **No Hallucination**: Reduces AI making up information
- **Always Up-to-Date**: Simply re-ingest documents when they change
- **Cost-Effective**: No need to fine-tune large models

## Quick Start

```bash
# Start the system
./scripts/run-dev.sh

# Visit the UI
open http://localhost:4200
```

## Next Steps

- Learn about [vector databases](vector-databases.md)
- Configure your [LLM provider](llm-providers.md)
- Explore [advanced techniques](advanced-rag.md)
