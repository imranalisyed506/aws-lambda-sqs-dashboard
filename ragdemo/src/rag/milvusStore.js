import { DataType, MilvusClient } from "@zilliz/milvus2-sdk-node";

import { config } from "../config.js";

let client = null;

const getClient = () => {
  if (!client) {
    client = new MilvusClient({
      address: config.milvusAddress,
      username: config.milvusUsername || undefined,
      password: config.milvusPassword || undefined
    });
  }
  return client;
};

const collectionName = config.milvusCollection;

const collectionFields = (vectorSize) => [
  {
    name: "id",
    description: "primary id",
    data_type: DataType.VarChar,
    is_primary_key: true,
    max_length: 512
  },
  {
    name: "vector",
    description: "embedding vector",
    data_type: DataType.FloatVector,
    dim: vectorSize
  },
  {
    name: "text",
    description: "chunk text",
    data_type: DataType.VarChar,
    max_length: 8192
  },
  {
    name: "metadata",
    description: "chunk metadata",
    data_type: DataType.JSON
  }
];

const ensureCollectionInternal = async (vectorSize) => {
  const client = getClient();
  const exists = await client.hasCollection({ collection_name: collectionName });
  if (!exists.value) {
    await client.createCollection({
      collection_name: collectionName,
      fields: collectionFields(vectorSize)
    });
  }

  await client.loadCollection({ collection_name: collectionName });
};

export const ensureCollection = async (vectorSize) => {
  await ensureCollectionInternal(vectorSize);
};

export const resetCollection = async (vectorSize) => {
  const client = getClient();
  const exists = await client.hasCollection({ collection_name: collectionName });
  if (exists.value) {
    await client.dropCollection({ collection_name: collectionName });
  }

  await ensureCollectionInternal(vectorSize);
};

export const upsertPoints = async (points) => {
  if (!points.length) {
    return;
  }

  const client = getClient();
  const fields_data = points.map((point) => ({
    id: String(point.id),
    vector: point.vector,
    text: point.payload.text,
    metadata: point.payload.metadata
  }));

  await client.insert({
    collection_name: collectionName,
    fields_data
  });

  await client.flush({ collection_names: [collectionName] });
};

export const searchPoints = async ({ vector, topK }) => {
  const client = getClient();
  const result = await client.search({
    collection_name: collectionName,
    vector,
    limit: topK,
    output_fields: ["text", "metadata"],
    params: { nprobe: 10 }
  });

  return (result.results || []).map((hit) => ({
    id: hit.id,
    score: hit.score,
    text: hit.fields?.text || "",
    metadata: hit.fields?.metadata || {}
  }));
};
