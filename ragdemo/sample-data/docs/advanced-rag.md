# Advanced RAG Techniques

## Chunking Strategies

### Fixed-Size Chunking
Simple and predictable. Use 256-512 tokens with 50-100 token overlap.

```javascript
const chunks = splitIntoChunks(document, {
  size: 512,
  overlap: 50
});
```

### Semantic Chunking
Split by meaning boundaries (paragraphs, sections). Better context preservation.

### Hierarchical Chunking
Create nested chunks at multiple levels. Query parent chunks for broader context.

## Retrieval Optimization

### Hybrid Search
Combine vector similarity with keyword matching for better precision.

### Query Expansion
Rewrite user queries into multiple variations before retrieval.

```javascript
const variations = [
  originalQuery,
  paraphrased(originalQuery),
  expandedWithSynonyms(originalQuery)
];
```

### Re-ranking
Use a cross-encoder to re-score retrieved chunks for better relevance.

## Metadata Filtering

Add metadata to chunks for precise filtering:

```javascript
{
  text: "Product pricing starts at $99",
  metadata: {
    source: "pricing-page",
    date: "2026-03-01",
    category: "commercial"
  }
}
```

Query with filters:
```javascript
searchVectors(query, {
  filter: {
    category: "commercial",
    date: { $gte: "2026-01-01" }
  }
});
```

## Context Management

### Context Window Utilization
- GPT-4: 128k tokens → ~15-20 large chunks
- Claude 3: 200k tokens → ~25-30 large chunks
- Mixtral: 32k tokens → ~4-6 large chunks

### Dynamic Context Selection
Adjust chunk count based on query complexity.

## Prompt Engineering

### System Prompt Template
```
You are a helpful assistant. Answer questions based ONLY on the provided context.

Context:
{retrieved_chunks}

Rules:
1. If the answer isn't in the context, say "I don't have enough information"
2. Cite which context sections you used
3. Be concise but complete

Question: {user_query}
```

### Chain of Thought
For complex queries, ask the LLM to reason step-by-step:

```
Based on the context:
1. First, identify relevant facts
2. Then, analyze relationships
3. Finally, synthesize an answer
```

## Multi-Query RAG

Generate multiple queries from user input and aggregate results:

```javascript
const queries = generateQueryVariations(userInput);
const allResults = await Promise.all(
  queries.map(q => vectorSearch(q))
);
const uniqueChunks = deduplicate(allResults);
```

## Streaming Responses

Stream LLM responses for better UX:

```javascript
for await (const chunk of llm.stream(prompt)) {
  yield chunk;
}
```

## Evaluation Metrics

### Retrieval Quality
- **Precision@K**: Relevant chunks in top K results
- **MRR**: Mean Reciprocal Rank of first relevant result
- **NDCG**: Normalized Discounted Cumulative Gain

### Response Quality
- **Faithfulness**: Answer matches context
- **Relevance**: Answer addresses question
- **Coherence**: Answer is well-structured

## Production Patterns

### Caching
Cache embeddings and responses for identical queries:

```javascript
const cached = await cache.get(queryHash);
if (cached) return cached;
```

### Async Ingestion
Process documents in background queues for scalability.

### Monitoring
Track:
- Query latency
- Retrieval accuracy
- LLM token usage
- Error rates

### A/B Testing
Test different:
- Chunking strategies
- Retrieval parameters
- Prompt templates
- LLM models

## Security Considerations

1. **Access Control**: Filter results by user permissions
2. **PII Scrubbing**: Remove sensitive data before embedding
3. **Audit Logging**: Track all queries and responses
4. **Input Validation**: Sanitize user queries

## Cost Optimization

- Use smaller embedding models (384d vs 1536d)
- Implement query caching
- Choose cost-effective LLM providers
- Batch document processing
- Compress vector storage

## Next Steps

Experiment with these techniques incrementally. Start simple, measure performance, then add complexity as needed.
