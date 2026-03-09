import { generateWithLlm } from "./llmProvider.js";

const summarizeExtractive = (question, hits) => {
  const snippets = hits.slice(0, 3).map((hit, idx) => {
    const snippet = hit.text.slice(0, 380).trim();
    return `${idx + 1}. ${snippet}`;
  });

  return [
    `No LLM key configured. Returning extractive context for: ${question}`,
    ...snippets
  ].join("\n\n");
};

const buildCitations = (hits) =>
  hits.map((hit) => ({
    source: hit.metadata.sourcePath,
    section: hit.metadata.section || null,
    page: hit.metadata.page || null,
    score: Number(hit.score.toFixed(4))
  }));

const buildPrompt = ({ question, hits }) => {
  const context = hits
    .slice(0, 6)
    .map((hit, idx) => {
      const section = hit.metadata.section ? ` section=${hit.metadata.section}` : "";
      const page = hit.metadata.page ? ` page=${hit.metadata.page}` : "";
      return [
        `[${idx + 1}] source=${hit.metadata.sourcePath}${section}${page}`,
        hit.text
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Question: ${question}`,
    "Use only the context below. If insufficient, say what is missing.",
    "Context:",
    context
  ].join("\n\n");
};

export const generateAnswer = async ({ question, hits, llm = {} }) => {
  if (!hits.length) {
    return {
      answer: "I could not find relevant context in the indexed sources.",
      citations: [],
      confidence: "low"
    };
  }

  let answer = "";

  try {
    answer =
      (await generateWithLlm({
        prompt: buildPrompt({ question, hits }),
        llm
      })) || "";
  } catch (_error) {
    answer = "";
  }

  if (!answer) {
    answer = summarizeExtractive(question, hits);
  }

  return {
    answer,
    citations: buildCitations(hits),
    confidence: hits.length > 0 ? "medium" : "low"
  };
};
