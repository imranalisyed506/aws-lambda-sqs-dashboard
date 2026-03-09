import { config } from "../config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const postJson = async (url, body, headers = {}) => {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(
      `Embedding request failed to connect (${url}). ${error?.message || "Network error"}`
    );
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${message}`);
  }

  return response.json();
};

const LOCAL_EMBEDDING_DIM = 256;

const hashToken = (token) => {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);

const normalize = (vector) => {
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) {
    norm += vector[i] * vector[i];
  }

  const scale = Math.sqrt(norm) || 1;
  return vector.map((value) => value / scale);
};

const embedWithLocal = async (texts) =>
  texts.map((text) => {
    const vector = new Array(LOCAL_EMBEDDING_DIM).fill(0);
    const tokens = tokenize(text);

    for (const token of tokens) {
      const index = hashToken(token) % LOCAL_EMBEDDING_DIM;
      vector[index] += 1;
    }

    return normalize(vector);
  });

const embedWithOpenAi = async (texts) => {
  const payload = {
    input: texts,
    model: config.openAiEmbeddingModel
  };

  const result = await postJson("https://api.openai.com/v1/embeddings", payload, {
    Authorization: `Bearer ${config.openAiApiKey}`
  });

  return result.data.map((row) => row.embedding);
};

const embedWithOllama = async (texts) => {
  const vectors = [];

  for (const text of texts) {
    const result = await postJson(`${config.ollamaBaseUrl}/api/embeddings`, {
      model: config.ollamaEmbeddingModel,
      prompt: text
    });

    vectors.push(result.embedding);
    await sleep(5);
  }

  return vectors;
};

export const embedTexts = async (texts) => {
  if (!texts.length) {
    return [];
  }

  if (config.embeddingProvider === "openai") {
    if (!config.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai.");
    }
    return embedWithOpenAi(texts);
  }

  if (config.embeddingProvider === "ollama") {
    return embedWithOllama(texts);
  }

  if (config.embeddingProvider === "local") {
    return embedWithLocal(texts);
  }

  throw new Error(
    `Unsupported EMBEDDING_PROVIDER: ${config.embeddingProvider}. Use 'openai', 'ollama', or 'local'.`
  );
};
