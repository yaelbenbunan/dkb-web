import { beforeEach, describe, expect, test } from "vitest";
import { mintUnsubscribeToken, verifyUnsubscribeToken } from "../unsubscribe-token";

beforeEach(() => {
  process.env.PROMO_TOKEN_SECRET = "test-secret";
});

describe("unsubscribe-token", () => {
  test("válido para el mismo lead", () => {
    const t = mintUnsubscribeToken("lead-1");
    expect(verifyUnsubscribeToken("lead-1", t)).toBe(true);
  });

  test("inválido para otro lead", () => {
    const t = mintUnsubscribeToken("lead-1");
    expect(verifyUnsubscribeToken("lead-2", t)).toBe(false);
  });

  test("token manipulado → inválido", () => {
    const t = mintUnsubscribeToken("lead-1");
    expect(verifyUnsubscribeToken("lead-1", t + "x")).toBe(false);
  });
});
