// src/lib/__tests__/promo-email.test.ts
import { describe, expect, test } from "vitest";
import { buildPromoEmail } from "../promo-email";
import { PROMO } from "../promo-config";

describe("buildPromoEmail", () => {
  const out = buildPromoEmail();

  test("el asunto lleva la fecha límite personal, que es el gancho de urgencia", () => {
    // El asunto ya no anuncia el descuento: la urgencia convierte mejor que la
    // cifra, que además va en el cuerpo y en el preheader.
    expect(out.subject.toLowerCase()).toContain("reservado");
    expect(out.subject).toMatch(/\d/);
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

  test("muestra las tres soluciones con precio tachado y precio de promo", () => {
    expect(out.html).toContain("Precios con la promo");
    for (const label of ["One page", "Sitio web", "Ecommerce"]) {
      expect(out.html).toContain(label);
    }
    expect(out.html).toContain("1.000€"); // tachado de One page
    expect(out.html).toContain("500€"); // One page con promo
    expect(out.html).toContain("2.000€"); // tachado de Sitio web y Ecommerce
    expect(out.text).toContain("500€");
  });

  test("reserva el precio con una fecha concreta, no con una cuenta atrás", () => {
    // En un correo no hay JS y las imágenes suelen venir bloqueadas: la fecha
    // se calcula al enviar y se imprime, que es lo único que se lee siempre.
    const out5 = buildPromoEmail({ sentAt: Date.parse("2026-07-01T10:00:00+02:00") });
    expect(out5.subject).toContain("6 de julio");
    expect(out5.html).toContain("6 de julio");
    expect(out5.text).toContain("6 de julio");
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
