import fs from "node:fs/promises";
import path from "node:path";

const shouldInclude = (filePath, extensions) => {
  const ext = path.extname(filePath).toLowerCase();
  return extensions.includes(ext);
};

const walk = async (rootDir, extensions, collected) => {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath, extensions, collected);
      continue;
    }

    if (entry.isFile() && shouldInclude(absolutePath, extensions)) {
      collected.push(absolutePath);
    }
  }
};

export const discoverFiles = async (sourceDirs, extensions) => {
  const files = [];
  for (const dir of sourceDirs) {
    await walk(dir, extensions, files);
  }
  return files;
};
