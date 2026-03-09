import fs from "node:fs/promises";

export const parseText = async (filePath) => {
  const text = await fs.readFile(filePath, "utf8");
  return [{ text, metadata: {} }];
};
