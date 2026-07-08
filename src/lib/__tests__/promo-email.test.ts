// src/lib/__tests__/promo-email.test.ts
import { describe, expect, test } from "vitest";
import { buildPromoEmail } from "../promo-email";
import { PROMO } from "../promo-config";

describe("buildPromoEmail", () => {
  const out = buildPromoEmail({ email: "lead@example.com", leadId: "lead-9", token: "tok-123" });

  test("subject mentions the 50% summer offer", () => {
    expect(out.subject).toContain("50");
    expect(out.subject.toLowerCase()).toContain("verano");
  });

  test("CTA links to the questionnaire with token, leadId and email", () => {
    const href = `${PROMO.siteUrl}${PROMO.questionnairePath}?t=tok-123&lid=lead-9&em=lead%40example.com`;
    expect(out.html).toContain(href);
    expect(out.text).toContain(href);
  });

  test("includes the deadline and a commercial-comms disclaimer", () => {
    expect(out.html).toContain("agosto");
    expect(out.html.toLowerCase()).toContain("comunicaciones comerciales");
  });

  test("url-encodes the token", () => {
    const dirty = buildPromoEmail({ email: "a@b.com", leadId: "l1", token: "a b&c" });
    expect(dirty.html).toContain("t=a%20b%26c");
  });
});
