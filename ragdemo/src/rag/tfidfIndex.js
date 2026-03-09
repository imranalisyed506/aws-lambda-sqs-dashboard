const tokenize = (text) =>
  (text.toLowerCase().match(/[a-z0-9]{2,}/g) || []).filter(Boolean);

const buildTf = (tokens) => {
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  const length = tokens.length || 1;
  const tf = new Map();
  for (const [token, count] of counts.entries()) {
    tf.set(token, count / length);
  }
  return tf;
};

const dot = (a, b) => {
  let sum = 0;
  for (const [key, value] of a.entries()) {
    const right = b.get(key);
    if (right) {
      sum += value * right;
    }
  }
  return sum;
};

const magnitude = (vector) => {
  let sum = 0;
  for (const value of vector.values()) {
    sum += value * value;
  }
  return Math.sqrt(sum);
};

export const buildIndex = (chunks) => {
  const docFreq = new Map();
  const docs = chunks.map((chunk, i) => {
    const tokens = tokenize(chunk.text);
    const tf = buildTf(tokens);
    const unique = new Set(tokens);
    for (const term of unique) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }

    return {
      id: chunk.id || `doc-${i + 1}`,
      sourceId: chunk.sourceId,
      text: chunk.text,
      metadata: chunk.metadata,
      tf
    };
  });

  const totalDocs = docs.length || 1;
  const idf = new Map();
  for (const [term, freq] of docFreq.entries()) {
    idf.set(term, Math.log(1 + totalDocs / (1 + freq)) + 1);
  }

  const indexedDocs = docs.map((doc) => {
    const vector = new Map();
    for (const [term, tfValue] of doc.tf.entries()) {
      vector.set(term, tfValue * (idf.get(term) || 1));
    }

    return {
      ...doc,
      vector,
      magnitude: magnitude(vector)
    };
  });

  return {
    idf,
    docs: indexedDocs,
    totalDocs
  };
};

export const queryIndex = (index, query, topK = 5) => {
  const queryTokens = tokenize(query);
  const tf = buildTf(queryTokens);
  const queryVector = new Map();

  for (const [term, tfValue] of tf.entries()) {
    queryVector.set(term, tfValue * (index.idf.get(term) || 1));
  }

  const queryMagnitude = magnitude(queryVector) || 1;

  const scored = index.docs
    .map((doc) => {
      const denominator = (doc.magnitude || 1) * queryMagnitude;
      const score = denominator === 0 ? 0 : dot(doc.vector, queryVector) / denominator;
      return { ...doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
};

const mapToObject = (map) => Object.fromEntries(map.entries());
const objectToMap = (obj) => new Map(Object.entries(obj || {}));

export const serializeIndex = (index, meta = {}) => ({
  version: 1,
  createdAt: new Date().toISOString(),
  fileHashes: meta.fileHashes || {},
  idf: mapToObject(index.idf),
  docs: index.docs.map((doc) => ({
    id: doc.id,
    sourceId: doc.sourceId,
    text: doc.text,
    metadata: doc.metadata,
    vector: mapToObject(doc.vector),
    magnitude: doc.magnitude
  }))
});

export const deserializeIndex = (saved) => {
  if (!saved || !saved.idf || !saved.docs) {
    return null;
  }

  return {
    idf: objectToMap(saved.idf),
    docs: saved.docs.map((doc) => ({
      ...doc,
      vector: objectToMap(doc.vector)
    })),
    totalDocs: saved.docs.length
  };
};
