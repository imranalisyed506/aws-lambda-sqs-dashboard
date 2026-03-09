# Sample Data for RAG System Testing

This directory contains sample documents organized into three categories for testing the RAG system's ingestion and query capabilities.

## Directory Structure

```
sample-data/
├── docs/               # Technical documentation about RAG systems
├── repo/               # Sample repository documentation
├── help-site/          # Customer support documentation
└── README.md          # This file
```

## 📁 Contents

### docs/ - RAG System Documentation
Technical guides about RAG systems and related technologies:

- **getting-started.md** - Introduction to RAG systems, how they work, and quick start guide
- **vector-databases.md** - Comprehensive guide to vector databases (Qdrant, Chroma, Milvus)
- **llm-providers.md** - LLM provider configuration and recommendations
- **advanced-rag.md** - Advanced techniques, optimization, and production patterns

**Best for testing**: Technical Q&A, architecture questions, configuration help

**Example queries**:
- "How does RAG work?"
- "What vector database should I use for production?"
- "How do I configure Ollama?"
- "What are the best chunking strategies?"

---

### repo/ - CloudStore Repository
Documentation for a fictional e-commerce platform:

- **README.md** - Project overview, tech stack, quick start
- **CONTRIBUTING.md** - Contribution guidelines, PR process, code style
- **API-DOCS.md** - Complete REST API documentation with examples

**Best for testing**: Project documentation, API questions, contribution workflows

**Example queries**:
- "How do I create a product via API?"
- "What's the pull request process?"
- "How do I authenticate API requests?"
- "What integrations does CloudStore support?"

---

### help-site/ - CloudStore Help Documentation
Customer-facing support documentation:

- **faq.md** - Frequently asked questions about CloudStore
- **troubleshooting.md** - Common issues and solutions
- **getting-started-guide.md** - Complete onboarding guide for new users

**Best for testing**: Customer support, troubleshooting, how-to questions

**Example queries**:
- "How do I reset my password?"
- "What are the pricing plans?"
- "Why can't I log in?"
- "How do I set up shipping?"
- "What happens if I exceed my plan limits?"

---

## 🚀 How to Use

### Option 1: Ingest All Documents

Ingest the entire sample-data directory:

```bash
# Using curl
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "/Users/imransyed/Downloads/projects/march9/ragdemo/sample-data"}'

# Using the UI
1. Start the app: ./scripts/run-dev.sh
2. Visit: http://localhost:4200
3. Paste directory path: /Users/imransyed/Downloads/projects/march9/ragdemo/sample-data
4. Click "Ingest Documents"
```

### Option 2: Ingest Specific Categories

Ingest only specific subdirectories:

```bash
# Ingest only RAG documentation
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "/Users/imransyed/Downloads/projects/march9/ragdemo/sample-data/docs"}'

# Ingest only help site
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "/Users/imransyed/Downloads/projects/march9/ragdemo/sample-data/help-site"}'
```

### Option 3: Test Individual Files

For focused testing, ingest single documents:

```bash
# Ingest just the FAQ
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "/Users/imransyed/Downloads/projects/march9/ragdemo/sample-data/help-site/faq.md"}'
```

---

## 🧪 Suggested Test Queries

After ingestion, try these queries to test retrieval quality:

### Technical Questions
```
Q: What is RAG and how does it work?
Expected: Explanation from getting-started.md

Q: Compare Qdrant, Chroma, and Milvus
Expected: Details from vector-databases.md

Q: How do I configure OpenRouter?
Expected: Configuration from llm-providers.md

Q: What are the best practices for chunking?
Expected: Advanced techniques from advanced-rag.md
```

### API Questions
```
Q: How do I create a product via API?
Expected: POST /api/v1/products details from API-DOCS.md

Q: What authentication does the API use?
Expected: JWT authentication details from API-DOCS.md

Q: What are the rate limits?
Expected: Rate limiting info from API-DOCS.md
```

### Customer Support
```
Q: What are the pricing plans?
Expected: Pricing tiers from faq.md

Q: I can't log into my account
Expected: Login troubleshooting from troubleshooting.md

Q: How do I set up my first product?
Expected: Step-by-step from getting-started-guide.md

Q: What's your refund policy?
Expected: Refund information from getting-started-guide.md
```

### Cross-Document Queries
```
Q: What are all the supported payment integrations?
Expected: Synthesis from multiple files (repo/API-DOCS.md, help-site/faq.md)

Q: How do I contribute API improvements to CloudStore?
Expected: Combination of CONTRIBUTING.md and API-DOCS.md
```

---

## 📊 Document Statistics

| Category | Files | Words | Topics |
|----------|-------|-------|--------|
| docs/ | 4 | ~5,000 | RAG systems, vector DBs, LLMs, advanced techniques |
| repo/ | 3 | ~4,500 | E-commerce platform, API, contribution |
| help-site/ | 3 | ~6,500 | FAQ, troubleshooting, onboarding |
| **Total** | **10** | **~16,000** | **Mixed domains** |

---

## 🎯 Testing Scenarios

### Scenario 1: Single Domain Expert
Ingest only `docs/` and ask technical RAG questions. Tests domain-specific expertise.

### Scenario 2: Multi-Domain Assistant
Ingest all directories. Ask questions spanning multiple domains. Tests cross-document synthesis.

### Scenario 3: Customer Support Bot
Ingest only `help-site/`. Ask common customer questions. Tests practical support use case.

### Scenario 4: Developer Assistant
Ingest only `repo/`. Ask about contributing, API usage. Tests code documentation retrieval.

---

## 💡 Tips for Best Results

1. **Let ingestion complete**: Wait for "Ingestion complete" message
2. **Use natural language**: Ask questions as you would to a human
3. **Be specific**: "How do I configure Qdrant?" vs "vector database"
4. **Try variations**: Different phrasings may retrieve different content
5. **Check relevance**: See if answers cite the right source documents
6. **Test edge cases**: Ask questions not directly covered in docs
7. **Monitor performance**: Note response time and quality

---

## 🔄 Resetting Data

To start fresh:

```bash
# Reset vector database
curl -X POST http://localhost:3000/reset

# Re-ingest documents
curl -X POST http://localhost:3000/ingest \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "/Users/imransyed/Downloads/projects/march9/ragdemo/sample-data"}'
```

---

## 📝 Adding Your Own Data

Feel free to add more documents:

1. Create markdown or text files in any subdirectory
2. Keep documents focused on specific topics
3. Use clear headings and structure
4. Re-ingest the directory after adding files

---

## 🐛 Troubleshooting

**Ingestion fails**:
- Check file paths are absolute
- Verify vector database is running
- Check embedding provider configuration

**Poor retrieval quality**:
- Adjust chunk size in config
- Try different embedding models
- Increase top-k results
- Experiment with query rephrasing

**Slow responses**:
- Use local Ollama for embeddings
- Reduce chunk overlap
- Optimize vector database indexing
- Consider faster LLM provider (Groq)

---

## 📚 Learn More

For information about the RAG system itself:
- [Main README](../README.md)
- [Configuration Guide](../src/config.js)
- [API Documentation](../src/server.js)

---

**Ready to test?** Start with: `./scripts/run-dev.sh` and visit http://localhost:4200

Happy testing! 🚀
