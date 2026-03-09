# Quick Reference: Sample Data Test Queries

After ingesting the sample data from `sample-data/`, try these queries to test your RAG system.

## RAG System Questions (from docs/)

### Understanding RAG

**Q:** How does RAG work?  
**Expected:** Explanation of document ingestion, vector storage, similarity search, and response generation

**Q:** What are the benefits of RAG?  
**Expected:** Accurate responses, no hallucination, always up-to-date, cost-effective

**Q:** What is retrieval-augmented generation?  
**Expected:** Definition and overview of the RAG technique

---

### Vector Databases

**Q:** What vector databases are supported?  
**Expected:** Qdrant, Chroma, Milvus with their characteristics

**Q:** What vector database should I use for production?  
**Expected:** Recommendation for Qdrant or Milvus depending on scale

**Q:** How do I configure Qdrant?  
**Expected:** QDRANT_URL and VECTOR_DB_PROVIDER configuration

**Q:** Compare Qdrant and Chroma  
**Expected:** Rust performance vs Python simplicity, production vs prototyping

**Q:** What is cosine similarity?  
**Expected:** Explanation of angle-based vector similarity metric

**Q:** What is HNSW?  
**Expected:** Index type for speed, mentioned in performance considerations

---

### LLM Providers

**Q:** What LLM providers are supported?  
**Expected:** ollama, openrouter, groq, together, openai, none

**Q:** How do I configure Ollama?  
**Expected:** LLM_PROVIDER, LLM_MODEL, OLLAMA_BASE_URL settings

**Q:** What's the fastest LLM provider?  
**Expected:** Groq with sub-second response times

**Q:** Which LLM provider should I use for development?  
**Expected:** Ollama with mistral - free and fast enough

**Q:** What are the Groq rate limits?  
**Expected:** 14,400 requests/day, 30 requests/minute

**Q:** How do I use a custom model?  
**Expected:** Set LLM_ALLOW_CUSTOM_MODEL=true

**Q:** What OpenRouter models are recommended?  
**Expected:** claude-3-opus, llama-3-70b, mistral-7b

---

### Advanced Techniques

**Q:** What chunking strategies are available?  
**Expected:** Fixed-size, semantic, hierarchical chunking

**Q:** What is the recommended chunk size?  
**Expected:** 256-512 tokens with 50-100 token overlap

**Q:** How do I improve retrieval quality?  
**Expected:** Hybrid search, query expansion, re-ranking

**Q:** What is query expansion?  
**Expected:** Rewriting queries into multiple variations

**Q:** How should I use metadata filtering?  
**Expected:** Add metadata to chunks, filter by source/date/category

**Q:** What are the recommended evaluation metrics?  
**Expected:** Precision@K, MRR, NDCG for retrieval; faithfulness, relevance, coherence for responses

**Q:** How can I reduce costs?  
**Expected:** Use smaller embedding models, cache queries, choose cost-effective providers

---

## CloudStore Repository Questions (from repo/)

### Project Overview

**Q:** What is CloudStore?  
**Expected:** Modern e-commerce platform with microservices architecture

**Q:** What technology stack does CloudStore use?  
**Expected:** Node.js, Express, PostgreSQL, React, TypeScript, Docker, Kubernetes

**Q:** How do I run CloudStore locally?  
**Expected:** Clone, npm install, docker-compose up

**Q:** What services are in CloudStore?  
**Expected:** product-service, order-service, payment-service, user-service

---

### API Usage

**Q:** How do I authenticate API requests?  
**Expected:** Use JWT tokens via POST /api/v1/auth/login, include in Authorization header

**Q:** How do I create a product via API?  
**Expected:** POST /api/v1/products with name, description, price, category

**Q:** How do I list products?  
**Expected:** GET /api/v1/products with pagination parameters

**Q:** What are the API rate limits?  
**Expected:** 100 req/min standard, 1000 req/min premium

**Q:** How do I create an order?  
**Expected:** POST /api/v1/orders with items, shippingAddress, paymentMethod

**Q:** What payment methods are supported in the API?  
**Expected:** card payments via token

**Q:** How do I track an order?  
**Expected:** GET /api/v1/orders/:id returns trackingNumber

**Q:** What integrations does CloudStore support?  
**Expected:** Stripe, PayPal, FedEx, UPS, Mailchimp, etc.

---

### Contributing

**Q:** How do I contribute to CloudStore?  
**Expected:** Fork repo, create feature branch, add tests, submit PR

**Q:** What's the pull request process?  
**Expected:** Discuss in issue, create branch, make changes, add tests, submit PR

**Q:** What commit message format should I use?  
**Expected:** Conventional commits: feat:, fix:, docs:, etc.

**Q:** What code style should I follow?  
**Expected:** TypeScript, ESLint, Prettier, self-documenting code

**Q:** What testing is required?  
**Expected:** Unit tests for business logic, integration tests for APIs, 80%+ coverage

---

## CloudStore Help Site Questions (from help-site/)

### Pricing & Plans

**Q:** What are the pricing plans?  
**Expected:** Starter $29/month, Professional $99/month, Enterprise custom

**Q:** Is there a free trial?  
**Expected:** Yes, 14-day free trial, no credit card required

**Q:** Can I cancel anytime?  
**Expected:** Yes, no cancellation fees, service continues until end of billing period

**Q:** What happens if I exceed my plan limits?  
**Expected:** Email at 80%, overage charges or rate limiting

---

### Account Management

**Q:** How do I reset my password?  
**Expected:** Go to login page, click "Forgot Password", enter email, check email for reset link

**Q:** How do I upgrade my plan?  
**Expected:** Settings → Billing → Upgrade Plan, changes take effect immediately

**Q:** How do I delete my account?  
**Expected:** Settings → Account → Danger Zone → Delete Account

**Q:** I can't log into my account  
**Expected:** Check credentials, Caps Lock, use forgot password, clear cache, try different browser

**Q:** My account is locked  
**Expected:** Wait 30 minutes for auto-unlock or use "Forgot Password"

---

### Getting Started

**Q:** How do I set up my first product?  
**Expected:** Products → Add Product, fill required fields (name, price, SKU, image)

**Q:** How do I set up shipping?  
**Expected:** Settings → Shipping, choose flat rate, calculated rates, or free shipping

**Q:** What payment methods can I accept?  
**Expected:** Stripe, PayPal, credit/debit cards, Apple Pay, Google Pay

**Q:** How do I customize my storefront?  
**Expected:** Store Design → Themes, choose theme, click Customize

**Q:** How do I add pages to my store?  
**Expected:** Settings → Pages → Add Page, create About, Shipping Policy, Return Policy

---

### Troubleshooting

**Q:** Why aren't my products showing on the store?  
**Expected:** Check product status (Active), inventory > 0, visibility settings, clear cache

**Q:** Image upload fails  
**Expected:** Check file size (max 5MB), format (JPG/PNG/WebP), compress if needed

**Q:** Bulk import errors  
**Expected:** Use CSV template, verify required fields, check formatting, test small batch

**Q:** Payment failed  
**Expected:** Contact customer to retry, send payment link, check payment gateway status

**Q:** Shipping label won't generate  
**Expected:** Verify address complete, check carrier integration, ensure dimensions entered

**Q:** Webhook not receiving events  
**Expected:** Verify URL, check publicly accessible, ensure HTTPS, must respond in <10s

**Q:** The dashboard is slow  
**Expected:** Clear browser cache, disable extensions, close unused tabs, try incognito

---

### Features & Integrations

**Q:** What shipping carriers are supported?  
**Expected:** FedEx, UPS, USPS, DHL with all their services

**Q:** Do you support international shipping?  
**Expected:** Yes, 200+ countries, automatic customs docs, currency conversion

**Q:** Can I offer free shipping?  
**Expected:** Yes, based on order total, location, categories, or promo codes

**Q:** Is my data secure?  
**Expected:** 256-bit SSL, encrypted storage, SOC 2, PCI DSS compliance, daily backups

**Q:** What's your uptime guarantee?  
**Expected:** 99.9% for Professional and Enterprise, 99.97% average

**Q:** Do you offer an API?  
**Expected:** Yes, comprehensive REST API available on all plans

---

## Cross-Document Questions

These queries require synthesizing information from multiple documents:

**Q:** How do I deploy a RAG system in production?  
**Expected:** Combine info from vector-databases.md (choose DB), llm-providers.md (choose LLM), and advanced-rag.md (production patterns)

**Q:** What are all the supported integrations across CloudStore?  
**Expected:** Combine repo API-DOCS.md and help-site FAQ (payment, shipping, marketing, accounting, CRM)

**Q:** How do I contribute improvements to the CloudStore API?  
**Expected:** Combine CONTRIBUTING.md PR process with API-DOCS.md API knowledge

**Q:** What should I consider for a production e-commerce setup?  
**Expected:** Tech stack from README.md, security from FAQ, API from API-DOCS.md

---

## Testing Tips

1. **Try variations**: Rephrase questions to test retrieval robustness
2. **Test specificity**: Compare broad vs specific questions
3. **Check citations**: Verify answers cite relevant source files
4. **Cross-validate**: Ask same question different ways
5. **Test gaps**: Ask questions not directly in documents
6. **Measure latency**: Note response times with different providers
7. **Evaluate quality**: Rate answer accuracy and relevance

---

## Quick Commands

```bash
# Run a query via CLI
npm run query -- --question "Your question here"

# Run with specific LLM
npm run query -- --question "Your question" --llm-provider groq --llm-model mixtral-8x7b-32768

# Run via API
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Your question here", "topK": 5}'

# List available models
npm run query -- --list-model-options
```

---

**Happy testing! 🎉**

For more details, see [sample-data/README.md](README.md)
