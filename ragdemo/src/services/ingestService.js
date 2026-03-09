import path from "node:path";

import { config } from "../config.js";
import { discoverFiles } from "../ingest/discover.js";
import { parsePdf } from "../parsers/pdfParser.js";
import { parseMarkdown } from "../parsers/markdownParser.js";
import { parseText } from "../parsers/textParser.js";
import { parseHtml } from "../parsers/htmlParser.js";
import { crawlHelpDocs } from "../ingest/webCrawler.js";
import { chunkText } from "../rag/chunker.js";
import { embedTexts } from "../rag/embeddingProvider.js";
import { getVectorStore } from "../rag/vectorStore.js";
import { readJsonIfExists, sha256, writeJson } from "../utils/file.js";

const parserByExtension = {
  ".pdf": parsePdf,
  ".md": parseMarkdown,
  ".markdown": parseMarkdown,
  ".txt": parseText,
  ".html": parseHtml,
  ".htm": parseHtml
};

const parseFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const parser = parserByExtension[ext];
  if (!parser) {
    return [];
  }
  return parser(filePath);
};

const toSourceType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".md" || ext === ".markdown") return "markdown";
  if (ext === ".html" || ext === ".htm") return "html";
  return "text";
};

export const ingest = async ({
  sourceDirs = config.sourceDirs,
  helpUrls = config.helpUrls,
  vectorDbProvider = config.vectorDbProvider
} = {}) => {
  const vectorStore = getVectorStore(vectorDbProvider);
  if (!sourceDirs.length && !helpUrls.length) {
    throw new Error(
      "No sources configured. Set RAG_SOURCE_DIRS and/or RAG_HELP_URLS."
    );
  }

  const existing = await readJsonIfExists(config.indexPath, null);
  const previousHashes = existing?.fileHashes || {};
  const files = sourceDirs.length
    ? await discoverFiles(sourceDirs, config.includeExtensions)
    : [];

  const fileHashes = {};
  const changedFiles = [];

  for (const filePath of files) {
    const hash = await sha256(filePath);
    fileHashes[filePath] = hash;
    if (previousHashes[filePath] !== hash) {
      changedFiles.push(filePath);
    }
  }

  const unchanged = files.length - changedFiles.length;
  const chunks = [];
  let parsedFiles = 0;

  for (const filePath of files) {
    const parsed = await parseFile(filePath);
    if (!parsed.length) {
      continue;
    }

    parsedFiles += 1;

    for (const segment of parsed) {
      const baseMetadata = {
        sourcePath: filePath,
        sourceType: toSourceType(filePath),
        section: segment.metadata.section,
        page: segment.metadata.page,
        pageCount: segment.metadata.pageCount
      };

      const segmented = chunkText(segment.text, baseMetadata, {
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap
      });

      for (let i = 0; i < segmented.length; i += 1) {
        chunks.push({
          id: `${filePath}::${i + 1}`,
          sourceId: filePath,
          text: segmented[i].text,
          metadata: segmented[i].metadata
        });
      }
    }
  }

  const webPages = helpUrls.length
    ? await crawlHelpDocs({
        seedUrls: helpUrls,
        maxDepth: config.crawlMaxDepth,
        maxPages: config.crawlMaxPages
      })
    : [];

  for (const page of webPages) {
    const metadata = {
      sourcePath: page.url,
      sourceType: "web-help",
      section: page.title,
      page: null,
      pageCount: null
    };

    const segmented = chunkText(page.text, metadata, {
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap
    });

    for (let i = 0; i < segmented.length; i += 1) {
      chunks.push({
        id: `${page.url}::${i + 1}`,
        sourceId: page.url,
        text: segmented[i].text,
        metadata: segmented[i].metadata
      });
    }
  }

  if (!chunks.length) {
    throw new Error("No chunkable content found across provided sources.");
  }

  const texts = chunks.map((chunk) => chunk.text);
  const embeddings = await embedTexts(texts);

  if (!embeddings.length || !embeddings[0]?.length) {
    throw new Error("Embedding provider returned empty vectors.");
  }

  await vectorStore.resetCollection(embeddings[0].length);

  const points = chunks.map((chunk, index) => ({
    id: chunk.id,
    vector: embeddings[index],
    payload: {
      text: chunk.text,
      metadata: chunk.metadata
    }
  }));

  await vectorStore.upsertPoints(points);

  const serialized = {
    version: 2,
    engine: `embeddings+${vectorDbProvider}`,
    provider: config.embeddingProvider,
    qdrantCollection: config.qdrantCollection,
    chromaCollection: config.chromaCollection,
    milvusCollection: config.milvusCollection,
    vectorDbProvider,
    fileHashes,
    lastIngestedAt: new Date().toISOString()
  };
  await writeJson(config.indexPath, serialized);

  return {
    indexPath: config.indexPath,
    vectorCollection: config.qdrantCollection,
    embeddingProvider: config.embeddingProvider,
    discoveredFiles: files.length,
    crawledPages: webPages.length,
    parsedFiles,
    totalChunks: points.length,
    changedFiles: changedFiles.length,
    unchangedFiles: unchanged
  };
};
