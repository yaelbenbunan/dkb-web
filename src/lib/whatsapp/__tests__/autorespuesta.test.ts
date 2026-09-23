import { describe, expect, it } from "vitest";
import { textoAutorespuesta } from "../autorespuesta";

describe("textoAutorespuesta", () => {
  it("menciona el anuncio cuando Meta manda el titular", () => {
    const texto = textoAutorespuesta({ titularAnuncio: "Tu web en 7 días" });
    expect(texto).toContain("«Tu web en 7 días»");
    expect(texto).toContain("¿qué necesitas");
  });

  it("funciona sin titular", () => {
    const texto = textoAutorespuesta({ titularAnuncio: null });
    expect(texto).toContain("Gracias por escribirnos.");
    expect(texto).not.toContain("«");
  });

  it("nunca pasa del límite de WhatsApp", () => {
    const largo = "x".repeat(2000);
    expect(textoAutorespuesta({ titularAnuncio: largo }).length).toBeLessThanOrEqual(1024);
  });
});
