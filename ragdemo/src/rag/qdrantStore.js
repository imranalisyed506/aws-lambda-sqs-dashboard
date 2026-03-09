import { QdrantClient } from "@qdrant/js-client-rest";

import { config } from "../config.js";

const client = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey || undefined
});

const collectionName = config.qdrantCollection;

const buildFilter = (filters = {}) => {
  const must = [];

  if (filters.sourceType) {
    must.push({ key: "metadata.sourceType", match: { value: filters.sourceType } });
  }

  return must.length ? { must } : undefined;
};

export const ensureCollection = async (vectorSize) => {
  const collections = await client.getCollections();
  const exists = collections.collections.some((item) => item.name === collectionName);

  if (!exists) {
    await client.createCollection(collectionName, {
      vectors: {
        size: vectorSize,
        distance: "Cosine"
      }
    });
  }
};

export const resetCollection = async (vectorSize) => {
  try {
    await client.deleteCollection(collectionName);
  } catch (_error) {
    // Collection might not exist on first run.
  }

  await client.createCollection(collectionName, {
    vectors: {
      size: vectorSize,
      distance: "Cosine"
    }
  });
};

export const upsertPoints = async (points) => {
  if (!points.length) {
    return;
  }

  await client.upsert(collectionName, {
    wait: true,
    points
  });
};

export const searchPoints = async ({ vector, topK, filters }) => {
  const hits = await client.search(collectionName, {
    vector,
    limit: topK,
    filter: buildFilter(filters),
    with_payload: true
  });

  return hits.map((hit) => ({
    id: hit.id,
    score: hit.score,
    text: hit.payload.text,
    metadata: hit.payload.metadata
  }));
};
