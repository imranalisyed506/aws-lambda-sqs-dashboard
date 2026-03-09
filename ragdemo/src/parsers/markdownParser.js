import fs from "node:fs/promises";

const headingRegex = /^(#{1,6})\s+(.+)$/;

export const parseMarkdown = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  const sections = [];
  let current = { heading: "Document", text: "" };

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (match) {
      if (current.text.trim()) {
        sections.push(current);
      }
      current = { heading: match[2].trim(), text: "" };
      continue;
    }
    current.text += `${line}\n`;
  }

  if (current.text.trim()) {
    sections.push(current);
  }

  return sections.map((section) => ({
    text: section.text,
    metadata: {
      section: section.heading
    }
  }));
};
