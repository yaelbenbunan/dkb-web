import { describe, it, expect } from "vitest";
import { generateLeadId, isLeadIdShape } from "@/lib/preview-lead-id";

describe("preview-lead-id", () => {
  it("returns a string in the form 'xxxx-xxxx'", () => {
    const id = generateLeadId();
    expect(id).toMatch(/^[a-z0-9]{4,}-[a-z0-9]{4}$/);
  });

  it("returns distinct ids on repeated calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateLeadId()));
    expect(ids.size).toBe(50);
  });

  it("isLeadIdShape accepts valid ids and rejects garbage", () => {
    expect(isLeadIdShape(generateLeadId())).toBe(true);
    expect(isLeadIdShape("bad id with spaces")).toBe(false);
    expect(isLeadIdShape("")).toBe(false);
    expect(isLeadIdShape("abcd")).toBe(false);
  });
});
