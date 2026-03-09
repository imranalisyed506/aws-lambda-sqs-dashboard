import { config } from "../config.js";

export const OPEN_SOURCE_MODEL_OPTIONS = {
  ollama: ["llama3.1:8b", "qwen2.5:7b", "mistral:7b-instruct"],
  openrouter: [
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-7b-instruct",
    "qwen/qwen2.5-72b-instruct"
  ],
  groq: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  together: [
    "meta-llama/Llama-3.1-8B-Instruct-Turbo",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "Qwen/Qwen2.5-72B-Instruct-Turbo"
  ],
  openai: ["gpt-4.1-mini"]
};

const SUPPORTED_PROVIDERS = ["none", "ollama", "openai", "openrouter", "groq", "together"];

const postJson = async (url, body, headers = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${text}`);
  }

  return response.json();
};

const callOpenAiCompatible = async ({ baseUrl, apiKey, model, messages, temperature, maxTokens }) => {
  if (!apiKey) {
    throw new Error("Missing API key for selected LLM provider.");
  }

  const data = await postJson(
    `${baseUrl}/chat/completions`,
    {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    },
    {
      Authorization: `Bearer ${apiKey}`
    }
  );

  return data?.choices?.[0]?.message?.content?.trim() || "";
};

const callOllama = async ({ model, messages, temperature, maxTokens }) => {
  const data = await postJson(`${config.ollamaBaseUrl}/api/chat`, {
    model,
    messages,
    stream: false,
    options: {
      temperature,
      num_predict: maxTokens
    }
  });

  return data?.message?.content?.trim() || "";
};

export const resolveLlmConfig = (overrides = {}) => ({
  provider: (overrides.provider || config.llmProvider || "none").toLowerCase(),
  model: overrides.model || config.llmModel,
  allowCustomModel:
    typeof overrides.allowCustomModel === "boolean"
      ? overrides.allowCustomModel
      : config.llmAllowCustomModel,
  temperature:
    typeof overrides.temperature === "number" ? overrides.temperature : config.llmTemperature,
  maxTokens: typeof overrides.maxTokens === "number" ? overrides.maxTokens : config.llmMaxTokens
});

export const validateLlmSelection = (overrides = {}) => {
  const resolved = resolveLlmConfig(overrides);

  if (!SUPPORTED_PROVIDERS.includes(resolved.provider)) {
    throw new Error(
      `Unsupported LLM provider: ${resolved.provider}. Use one of: ${SUPPORTED_PROVIDERS.join(", ")}.`
    );
  }

  if (resolved.provider === "none") {
    return resolved;
  }

  if (!resolved.model) {
    throw new Error(
      `Model is required for provider '${resolved.provider}'. Set LLM_MODEL or pass --llm-model.`
    );
  }

  const allowedModels = OPEN_SOURCE_MODEL_OPTIONS[resolved.provider] || [];
  if (!resolved.allowCustomModel && allowedModels.length && !allowedModels.includes(resolved.model)) {
    throw new Error(
      `Unsupported model '${resolved.model}' for provider '${resolved.provider}'. Supported models: ${allowedModels.join(
        ", "
      )}. Set LLM_ALLOW_CUSTOM_MODEL=true or pass --allow-custom-model to bypass.`
    );
  }

  return resolved;
};

export const generateWithLlm = async ({ prompt, llm }) => {
  const resolved = validateLlmSelection(llm);

  if (!resolved.model || resolved.provider === "none") {
    return null;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a grounded RAG assistant. Answer only from provided context and mention uncertainty when context is insufficient."
    },
    {
      role: "user",
      content: prompt
    }
  ];

  if (resolved.provider === "ollama") {
    return callOllama({ ...resolved, messages });
  }

  if (resolved.provider === "openai") {
    return callOpenAiCompatible({
      baseUrl: "https://api.openai.com/v1",
      apiKey: config.openAiApiKey,
      ...resolved,
      messages
    });
  }

  if (resolved.provider === "openrouter") {
    return callOpenAiCompatible({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: config.openRouterApiKey,
      ...resolved,
      messages
    });
  }

  if (resolved.provider === "groq") {
    return callOpenAiCompatible({
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: config.groqApiKey,
      ...resolved,
      messages
    });
  }

  if (resolved.provider === "together") {
    return callOpenAiCompatible({
      baseUrl: "https://api.together.xyz/v1",
      apiKey: config.togetherApiKey,
      ...resolved,
      messages
    });
  }

  throw new Error("Unsupported LLM provider configuration.");
};

export const getModelOptions = () => OPEN_SOURCE_MODEL_OPTIONS;
