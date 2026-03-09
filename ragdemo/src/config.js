import dotenv from "dotenv";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const splitCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  sourceDirs: splitCsv(process.env.RAG_SOURCE_DIRS),
  helpUrls: splitCsv(process.env.RAG_HELP_URLS),
  includeExtensions: splitCsv(process.env.RAG_INCLUDE_EXTENSIONS).map((ext) =>
    ext.toLowerCase()
  ),
  indexPath: process.env.RAG_INDEX_PATH || "./data/rag-index.json",
  chunkSize: toInt(process.env.RAG_CHUNK_SIZE, 900),
  chunkOverlap: toInt(process.env.RAG_CHUNK_OVERLAP, 150),
  topK: toInt(process.env.RAG_TOP_K, 5),
  crawlMaxDepth: toInt(process.env.RAG_CRAWL_MAX_DEPTH, 1),
  crawlMaxPages: toInt(process.env.RAG_CRAWL_MAX_PAGES, 20),
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || "ollama").toLowerCase(),
  openAiEmbeddingModel:
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  llmProvider: (process.env.LLM_PROVIDER || "none").toLowerCase(),
  llmModel: process.env.LLM_MODEL || "",
  llmAllowCustomModel: toBool(process.env.LLM_ALLOW_CUSTOM_MODEL, false),
  llmTemperature: toFloat(process.env.LLM_TEMPERATURE, 0.2),
  llmMaxTokens: toInt(process.env.LLM_MAX_TOKENS, 500),
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  togetherApiKey: process.env.TOGETHER_API_KEY || "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  ollamaEmbeddingModel:
    process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  qdrantApiKey: process.env.QDRANT_API_KEY || "",
  qdrantCollection: process.env.QDRANT_COLLECTION || "local_docs",
  vectorDbProvider: (process.env.VECTOR_DB_PROVIDER || "qdrant").toLowerCase(),
  chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
  chromaCollection: process.env.CHROMA_COLLECTION || "local_docs",
  milvusAddress: process.env.MILVUS_ADDRESS || "localhost:19530",
  milvusUsername: process.env.MILVUS_USERNAME || "",
  milvusPassword: process.env.MILVUS_PASSWORD || "",
  milvusCollection: process.env.MILVUS_COLLECTION || "local_docs"
};
