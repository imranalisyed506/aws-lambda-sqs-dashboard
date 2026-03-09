import { createRequire } from "node:module";
import fs from "node:fs/promises";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const parsePdf = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const result = await pdfParse(buffer);

  return [
    {
      text: result.text || "",
      metadata: {
        page: 1,
        pageCount: result.numpages || 1
      }
    }
  ];
};
