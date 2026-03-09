import { describe, expect, it } from "vitest";

import { validateLlmSelection } from "../src/rag/llmProvider.js";

describe("validateLlmSelection", () => {
  it("rejects unknown providers", () => {
    expect(() => validateLlmSelection({ provider: "foobar", model: "x" })).toThrow(
      /Unsupported LLM provider/
    );
  });

  it("rejects unsupported models for known providers", () => {
    expect(() =>
      validateLlmSelection({ provider: "ollama", model: "not-a-real-model" })
    ).toThrow(/Unsupported model/);
  });

  it("accepts supported provider/model pair", () => {
    const resolved = validateLlmSelection({ provider: "ollama", model: "llama3.1:8b" });
    expect(resolved.provider).toBe("ollama");
    expect(resolved.model).toBe("llama3.1:8b");
  });

  it("allows custom model when escape hatch is enabled", () => {
    const resolved = validateLlmSelection({
      provider: "ollama",
      model: "my-private-model",
      allowCustomModel: true
    });

    expect(resolved.provider).toBe("ollama");
    expect(resolved.model).toBe("my-private-model");
    expect(resolved.allowCustomModel).toBe(true);
  });
});
