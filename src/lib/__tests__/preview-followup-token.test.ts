import { describe, it, expect } from "vitest";
// A signing secret is required now (no hardcoded fallback). secret() reads the
// env at call time, so setting it here before any mint/verify is enough.
process.env.PREVIEW_FOLLOWUP_SECRET = "test-signing-secret-32-bytes-long!!";
// The token module imports "server-only", aliased to an empty stub in
// vitest.config.ts so it loads here.
import {
  mintFollowupToken,
  verifyFollowupToken,
} from "@/lib/preview-followup-token";

describe("preview follow-up token", () => {
  const leadId = "abcd1234-ef56";
  const email = "user@example.com";

  it("verifies a freshly minted token", () => {
    const token = mintFollowupToken(leadId, email);
    expect(verifyFollowupToken(leadId, email, token)).toBe(true);
  });

  it("is case-insensitive on the email", () => {
    const token = mintFollowupToken(leadId, "User@Example.com");
    expect(verifyFollowupToken(leadId, "user@example.com", token)).toBe(true);
  });

  it("rejects a token for a different email", () => {
    const token = mintFollowupToken(leadId, email);
    expect(verifyFollowupToken(leadId, "other@example.com", token)).toBe(false);
  });

  it("rejects a token for a different lead", () => {
    const token = mintFollowupToken(leadId, email);
    expect(verifyFollowupToken("zzzz9999-0000", email, token)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = mintFollowupToken(leadId, email);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifyFollowupToken(leadId, email, tampered)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = mintFollowupToken(leadId, email);
    const expired = "1000000000000." + token.slice(token.indexOf(".") + 1);
    expect(verifyFollowupToken(leadId, email, expired)).toBe(false);
  });

  it("rejects garbage", () => {
    expect(verifyFollowupToken(leadId, email, "not-a-token")).toBe(false);
    expect(verifyFollowupToken(leadId, email, "")).toBe(false);
  });
});
