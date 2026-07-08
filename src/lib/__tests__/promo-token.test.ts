import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mintPromoToken, verifyPromoToken } from "../promo-token";

describe("promo-token", () => {
  beforeEach(() => { process.env.PROMO_TOKEN_SECRET = "test-secret-123"; });
  afterEach(() => { delete process.env.PROMO_TOKEN_SECRET; });

  test("a freshly minted token verifies for the same lead+email", () => {
    const t = mintPromoToken("lead-1", "User@Example.com");
    expect(t).not.toBe("");
    expect(verifyPromoToken("lead-1", "user@example.com", t)).toBe(true);
  });

  test("rejects a token for a different lead or email", () => {
    const t = mintPromoToken("lead-1", "a@example.com");
    expect(verifyPromoToken("lead-2", "a@example.com", t)).toBe(false);
    expect(verifyPromoToken("lead-1", "b@example.com", t)).toBe(false);
  });

  test("rejects garbage and expired tokens", () => {
    expect(verifyPromoToken("lead-1", "a@example.com", "not-a-token")).toBe(false);
    const expired = `${Date.now() - 1000}.deadbeef`;
    expect(verifyPromoToken("lead-1", "a@example.com", expired)).toBe(false);
  });

  test("without a secret configured it refuses to mint", () => {
    delete process.env.PROMO_TOKEN_SECRET;
    const prevResend = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    expect(mintPromoToken("lead-1", "a@example.com")).toBe("");
    if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
  });
});
