const normalize = (text) => text.replace(/\s+/g, " ").trim();

export const chunkText = (text, metadata, options) => {
  const cleaned = normalize(text);
  if (!cleaned) {
    return [];
  }

  const { chunkSize, chunkOverlap } = options;
  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const chunk = cleaned.slice(start, end);

    chunks.push({
      text: chunk,
      metadata
    });

    if (end === cleaned.length) {
      break;
    }

    start = Math.max(0, end - chunkOverlap);
  }

  return chunks;
};
