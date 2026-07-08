import { describe, expect, test } from "vitest";
import { PROMO, isPromoActive, promoDeadlineLabel } from "../promo-config";

describe("promo-config", () => {
  const deadline = Date.parse(PROMO.deadlineISO);

  test("promo is active before the deadline and inactive after", () => {
    expect(isPromoActive(deadline - 1000)).toBe(true);
    expect(isPromoActive(deadline + 1000)).toBe(false);
  });

  test("campaign label is the single reporting tag", () => {
    expect(PROMO.campaign).toBe("promo-verano-2026");
    expect(PROMO.mailchimpTag).toBe("promo-verano-2026");
  });

  test("deadline label is a human Spanish date", () => {
    expect(promoDeadlineLabel()).toContain("agosto");
    expect(promoDeadlineLabel()).toContain("2026");
  });
});
