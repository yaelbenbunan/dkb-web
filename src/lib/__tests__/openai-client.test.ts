// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getOpenAIClient } from "@/lib/openai-client";

describe("openai-client", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns null when OPENAI_API_KEY is missing", () => {
    expect(getOpenAIClient()).toBeNull();
  });

  it("returns null when OPENAI_API_KEY is empty string", () => {
    process.env.OPENAI_API_KEY = "";
    expect(getOpenAIClient()).toBeNull();
  });

  it("returns a client instance when key is present", () => {
    process.env.OPENAI_API_KEY = "sk-test-123";
    const c = getOpenAIClient();
    expect(c).not.toBeNull();
    expect(typeof c?.chat?.completions?.create).toBe("function");
  });
});
