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

  test("shows the promo prices (struck + offer)", () => {
    expect(out.html).toContain("Precios con la promo");
    expect(out.html).toContain("1.000€"); // precio tachado one page
    expect(out.html).toContain("500€"); // precio con promo one page
    expect(out.html).toContain("1.500€"); // ecommerce con promo
    expect(out.text).toContain("500€");
  });

  test("greets the lead by first name in HTML and text", () => {
    const named = buildPromoEmail({ name: "Ana Pérez Gil" });
    expect(named.html).toContain("Hola Ana,");
    expect(named.text).toContain("Hola Ana,");
  });

  test("falls back to a generic greeting without a name", () => {
    expect(out.html).toContain("Hola,");
    expect(out.text).toContain("Hola,");
  });

  test("escapes HTML in the name", () => {
    const evil = buildPromoEmail({ name: "<img src=x onerror=alert(1)>" });
    expect(evil.html).not.toContain("<img src=x");
    expect(evil.html).toContain("&lt;img");
  });
});
