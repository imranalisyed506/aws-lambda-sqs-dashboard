#!/usr/bin/env node
import { Command } from "commander";

import { getModelOptions } from "../rag/llmProvider.js";

const program = new Command();
program
  .name("rag-query")
  .description("Query the local RAG index")
  .option("-q, --question <question>", "Question to answer")
  .option("-k, --top-k <number>", "How many chunks to retrieve", "5")
  .option("--source-type <type>", "Filter by source type: pdf|markdown|html|text|web-help")
  .option("--llm-provider <provider>", "LLM provider: none|ollama|openai|openrouter|groq|together")
  .option("--llm-model <model>", "LLM model id to use for generation")
  .option("--allow-custom-model", "Allow model IDs outside curated provider list")
  .option("--temperature <number>", "Generation temperature")
  .option("--max-tokens <number>", "Generation max output tokens")
  .option("--list-model-options", "Print available model provider/model options")
  .action(async (options) => {
    try {
      if (options.listModelOptions) {
        console.log(JSON.stringify(getModelOptions(), null, 2));
        return;
      }

      if (!options.question) {
        throw new Error("Question is required unless --list-model-options is used.");
      }

      const { queryRag } = await import("../services/queryService.js");

      const filters = {};
      if (options.sourceType) {
        filters.sourceType = options.sourceType;
      }

      const llm = {};
      if (options.llmProvider) llm.provider = options.llmProvider;
      if (options.llmModel) llm.model = options.llmModel;
      if (options.allowCustomModel) llm.allowCustomModel = true;
      if (options.temperature) {
        llm.temperature = Number.parseFloat(options.temperature);
      }
      if (options.maxTokens) {
        llm.maxTokens = Number.parseInt(options.maxTokens, 10);
      }

      const result = await queryRag({
        question: options.question,
        topK: Number.parseInt(options.topK, 10),
        filters,
        llm
      });

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  });

program.parse();
