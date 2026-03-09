import { ChromaClient } from "chromadb";

import { config } from "../config.js";

let client = null;

const getClient = () => {
  if (!client) {
    client = new ChromaClient({ path: config.chromaUrl });
  }
  return client;
};

const collectionName = config.chromaCollection;

const getCollection = async () => {
  const client = getClient();
  try {
    return await client.getCollection({ name: collectionName });
  } catch (_error) {
    return client.createCollection({ name: collectionName });
  }
};

export const ensureCollection = async (_vectorSize) => {
  await getCollection();
};

export const resetCollection = async (_vectorSize) => {
  const client = getClient();
  try {
    await client.deleteCollection({ name: collectionName });
  } catch (_error) {
    // ignore
  }
  await client.createCollection({ name: collectionName });
};

export const upsertPoints = async (points) => {
  if (!points.length) {
    return;
  }

  const collection = await getCollection();
  await collection.add({
    ids: points.map((point) => String(point.id)),
    embeddings: points.map((point) => point.vector),
    documents: points.map((point) => point.payload.text),
    metadatas: points.map((point) => point.payload.metadata)
  });
};

export const searchPoints = async ({ vector, topK }) => {
  const collection = await getCollection();
  const result = await collection.query({
    queryEmbeddings: [vector],
    nResults: topK
  });

  const ids = result.ids?.[0] || [];
  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  return ids.map((id, index) => ({
    id,
    score: typeof distances[index] === "number" ? 1 - distances[index] : 0,
    text: documents[index] || "",
    metadata: metadatas[index] || {}
  }));
};
