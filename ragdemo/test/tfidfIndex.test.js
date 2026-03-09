import { describe, expect, it } from "vitest";

import { buildIndex, queryIndex } from "../src/rag/tfidfIndex.js";

describe("tfidf index", () => {
  it("retrieves relevant chunks", () => {
    const index = buildIndex([
      {
        id: "1",
        sourceId: "a.md",
        text: "authentication uses oauth tokens",
        metadata: { sourcePath: "a.md" }
      },
      {
        id: "2",
        sourceId: "b.md",
        text: "database migrations and schema changes",
        metadata: { sourcePath: "b.md" }
      }
    ]);

    const hits = queryIndex(index, "oauth authentication", 1);
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe("1");
  });
});
