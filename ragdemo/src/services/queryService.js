import { config } from "../config.js";
import { embedTexts } from "../rag/embeddingProvider.js";
import { validateLlmSelection } from "../rag/llmProvider.js";
import { generateAnswer } from "../rag/answer.js";
import { getVectorStore } from "../rag/vectorStore.js";
import { readJsonIfExists } from "../utils/file.js";

export const queryRag = async ({
  question,
  topK = config.topK,
  filters = {},
  llm = {},
  vectorDbProvider = config.vectorDbProvider
}) => {
  if (!question?.trim()) {
    throw new Error("Question is required.");
  }

  const vectorStore = getVectorStore(vectorDbProvider);

  const resolvedLlm = validateLlmSelection(llm);

  const saved = await readJsonIfExists(config.indexPath, null);
  if (!saved) {
    throw new Error("Index not found. Run ingestion first.");
  }

  if (!saved.engine?.startsWith("embeddings+")) {
    throw new Error("Index metadata is incompatible. Re-run ingestion.");
  }

  const [queryVector] = await embedTexts([question]);
  const hits = await vectorStore.searchPoints({ vector: queryVector, topK, filters });
  const response = await generateAnswer({ question, hits, llm });

  return {
    question,
    topK,
    llm: {
      provider: resolvedLlm.provider,
      model: resolvedLlm.model || null,
      allowCustomModel: resolvedLlm.allowCustomModel
    },
    hits: hits.map((hit) => ({
      score: Number(hit.score.toFixed(4)),
      metadata: hit.metadata,
      textPreview: hit.text.slice(0, 220)
    })),
    ...response
  };
};
