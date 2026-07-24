import { describe, expect, test } from "vitest";
import { buildKitDigital2026Email } from "../kit-digital-2026-email";

describe("buildKitDigital2026Email (casi has terminado)", () => {
  test("copy de 'un paso más' y CTA a la landing con el email prefilled", () => {
    const { subject, html, text } = buildKitDigital2026Email({
      name: "Yael Ben Bunan",
      email: "yael@example.com",
    });
    expect(subject.toLowerCase()).toContain("paso");
    expect(html).toContain("Yael");
    expect(html.toLowerCase()).toContain("un paso");
    // CTA lleva a la landing con el email prefilled para el match.
    expect(html).toContain("/kit-digital-2026?email=yael%40example.com");
    // Marca intacta
    expect(html).toContain("dinkbit-email.png");
    expect(html).toContain("www.dinkbit.es");
    expect(text).toContain("Yael");
  });

  test("sin email → CTA a la landing sin querystring", () => {
    const { html } = buildKitDigital2026Email({ name: "Ana" });
    expect(html).toContain("/kit-digital-2026");
    expect(html).not.toContain("?email=");
  });

  test("escapa HTML del nombre para evitar inyección", () => {
    const { html } = buildKitDigital2026Email({ name: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("nombre vacío usa saludo por defecto", () => {
    const { html } = buildKitDigital2026Email({ name: "" });
    expect(html).toContain("hola");
  });
});
