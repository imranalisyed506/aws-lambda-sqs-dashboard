import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const ensureDir = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

export const readJsonIfExists = async (filePath, fallbackValue) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallbackValue;
    }
    throw error;
  }
};

export const writeJson = async (filePath, data) => {
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

export const sha256 = async (filePath) => {
  const content = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
};
