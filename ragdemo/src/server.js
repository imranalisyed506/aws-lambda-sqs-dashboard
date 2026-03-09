import express from "express";
import cors from "cors";

import { ingest } from "./services/ingestService.js";
import { queryRag } from "./services/queryService.js";
import { getModelOptions } from "./rag/llmProvider.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/model-options", (_req, res) => {
  res.json(getModelOptions());
});

app.post("/ingest", async (req, res) => {
  try {
    const sourceDirs = req.body?.sourceDirs;
    const helpUrls = req.body?.helpUrls;
    const vectorDbProvider = req.body?.vectorDbProvider;
    const result = await ingest({ sourceDirs, helpUrls, vectorDbProvider });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/query", async (req, res) => {
  try {
    const { question, topK, filters, llm, vectorDbProvider } = req.body || {};
    const result = await queryRag({ question, topK, filters, llm, vectorDbProvider });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const port = Number.parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`RAG API listening on http://localhost:${port}`);
});
