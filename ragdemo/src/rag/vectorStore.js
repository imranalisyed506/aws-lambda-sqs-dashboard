import { config } from "../config.js";
import * as qdrantStore from "./qdrantStore.js";
import * as chromaStore from "./chromaStore.js";
import * as milvusStore from "./milvusStore.js";
import * as localStore from "./localStore.js";

const providerMap = {
  local: localStore,
  qdrant: qdrantStore,
  chroma: chromaStore,
  milvus: milvusStore
};

export const supportedVectorProviders = Object.keys(providerMap);

export const getVectorStore = (provider = config.vectorDbProvider) => {
  const selected = providerMap[provider];
  if (!selected) {
    throw new Error(
      `Unsupported VECTOR_DB_PROVIDER '${provider}'. Supported: ${supportedVectorProviders.join(
        ", "
      )}.`
    );
  }
  return selected;
};
