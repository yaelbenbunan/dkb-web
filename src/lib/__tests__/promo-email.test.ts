// src/lib/__tests__/promo-email.test.ts
import { describe, expect, test } from "vitest";
import { buildPromoEmail } from "../promo-email";
import { PROMO } from "../promo-config";

describe("buildPromoEmail", () => {
  const out = buildPromoEmail();

  test("subject mentions the 50% summer offer", () => {
    expect(out.subject).toContain("50");
    expect(out.subject.toLowerCase()).toContain("verano");
  });

  test("CTA goes to WhatsApp and phone, not the questionnaire", () => {
    expect(out.html).toContain(`https://wa.me/${PROMO.whatsappNumber}`);
    expect(out.html).toContain(`tel:${PROMO.phoneNumber}`);
    expect(out.html).not.toContain("/promo-verano/cuestionario");
    expect(out.text).toContain(`https://wa.me/${PROMO.whatsappNumber}`);
    expect(out.text).toContain(PROMO.phoneDisplay);
  });

  test("includes the deadline and a commercial-comms disclaimer", () => {
    expect(out.html).toContain("agosto");
    expect(out.html.toLowerCase()).toContain("comunicaciones comerciales");
  });
});
