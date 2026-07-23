import { describe, expect, test } from "vitest";
import { buildKitDigital2026Email } from "../kit-digital-2026-email";

describe("buildKitDigital2026Email", () => {
  test("personaliza con el nombre de pila en html y texto", () => {
    const { subject, html, text } = buildKitDigital2026Email({
      name: "Yael Ben Bunan",
    });
    expect(subject).toContain("Kit Digital");
    expect(html).toContain("¡Gracias, Yael!");
    expect(text).toContain("Hola Yael,");
    // Marca: logo y web
    expect(html).toContain("dinkbit-email.png");
    expect(html).toContain("www.dinkbit.es");
    // Los pasos aparecen en ambos formatos
    expect(html).toContain("Nos encargamos de toda la tramitación");
    expect(text).toContain("Nos encargamos de toda la tramitación");
  });

  test("escapa HTML del nombre para evitar inyección", () => {
    const { html } = buildKitDigital2026Email({
      name: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("nombre vacío usa un saludo por defecto", () => {
    const { html, text } = buildKitDigital2026Email({ name: "" });
    expect(html).toContain("¡Gracias, hola!");
    expect(text).toContain("Hola hola,");
  });
});
