#!/usr/bin/env node
import { Command } from "commander";

import { ingest } from "../services/ingestService.js";

const program = new Command();
program
  .name("rag-ingest")
  .description("Ingest local PDF/markdown/help docs into the local RAG index")
  .option("-s, --source <paths>", "Comma-separated source directories")
  .option("-u, --help-urls <urls>", "Comma-separated help website URLs to crawl")
  .action(async (options) => {
    try {
      const sourceDirs = options.source
        ? options.source.split(",").map((item) => item.trim()).filter(Boolean)
        : undefined;
      const helpUrls = options.helpUrls
        ? options.helpUrls.split(",").map((item) => item.trim()).filter(Boolean)
        : undefined;

      const result = await ingest({ sourceDirs, helpUrls });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  });

program.parse();
