const points = [];

const cosineSimilarity = (a, b) => {
  if (!a?.length || !b?.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
};

const matchesFilter = (metadata = {}, filters = {}) => {
  if (filters.sourceType && metadata.sourceType !== filters.sourceType) {
    return false;
  }
  return true;
};

export const ensureCollection = async (_vectorSize) => {
  // No-op for in-memory local store.
};

export const resetCollection = async (_vectorSize) => {
  points.length = 0;
};

export const upsertPoints = async (newPoints) => {
  if (!newPoints?.length) {
    return;
  }

  const byId = new Map(points.map((item) => [String(item.id), item]));

  for (const point of newPoints) {
    byId.set(String(point.id), point);
  }

  points.length = 0;
  points.push(...byId.values());
};

export const searchPoints = async ({ vector, topK, filters }) => {
  return points
    .filter((point) => matchesFilter(point.payload?.metadata || {}, filters || {}))
    .map((point) => ({
      id: point.id,
      score: cosineSimilarity(vector, point.vector),
      text: point.payload?.text || "",
      metadata: point.payload?.metadata || {}
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};
