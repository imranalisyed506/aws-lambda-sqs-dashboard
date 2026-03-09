import { describe, expect, it } from "vitest";

import { chunkText } from "../src/rag/chunker.js";

describe("chunkText", () => {
  it("creates overlapping chunks", () => {
    const input = "a".repeat(1000);
    const chunks = chunkText(input, { sourcePath: "test.md" }, { chunkSize: 300, chunkOverlap: 50 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBe(300);
    expect(chunks[1].text.length).toBe(300);
  });

  it("returns no chunks for empty text", () => {
    const chunks = chunkText("   ", {}, { chunkSize: 300, chunkOverlap: 50 });
    expect(chunks).toEqual([]);
  });
});
