import { describe, expect, it } from "vitest";
import { VERTICAL_POR_ANUNCIO, textoAutorespuesta, verticalDeAnuncio } from "../autorespuesta";

describe("verticalDeAnuncio", () => {
  it("reconoce los anuncios mapeados", () => {
    for (const [anuncio, vertical] of Object.entries(VERTICAL_POR_ANUNCIO)) {
      expect(verticalDeAnuncio(anuncio)).toBe(vertical);
    }
  });

  it("cae a la pregunta común con un anuncio que no conocemos", () => {
    // Lo normal al estrenar una campaña: el anuncio existe antes de que nadie
    // lo haya mapeado aquí. No puede costar el primer impacto.
    expect(verticalDeAnuncio("120200000000000")).toBe("generico");
    expect(verticalDeAnuncio(null)).toBe("generico");
  });
});

describe("textoAutorespuesta", () => {
  it("menciona el anuncio cuando Meta manda el titular", () => {
    const texto = textoAutorespuesta({ titularAnuncio: "Llenamos los huecos de tu agenda", anuncio: null });
    expect(texto).toContain("«Llenamos los huecos de tu agenda»");
  });

  it("funciona sin titular", () => {
    const texto = textoAutorespuesta({ titularAnuncio: null, anuncio: null });
    expect(texto).toContain("Gracias por escribirnos.");
    expect(texto).not.toContain("«");
  });

  it("se presenta, explica qué es Escala y ofrece opciones numeradas", () => {
    // Las opciones van numeradas y no como botones de WhatsApp porque todavía
    // no sabemos procesar una pulsación: llegaría como mensaje interactivo y
    // se perdería la respuesta. Con números llega como texto y queda guardada.
    const texto = textoAutorespuesta({ titularAnuncio: null, anuncio: null });
    expect(texto).toContain("Escala");
    expect(texto).toContain("1.");
    expect(texto).toContain("2.");
    expect(texto).toContain("3.");
    expect(texto).toMatch(/responde con el número/i);
  });

  it("pregunta por pacientes, no por webs", () => {
    // La autorespuesta solo se dispara con clics de anuncio, y todos los
    // anuncios son de captación de pacientes para clínicas. Preguntar por la
    // web —como hacía la primera versión— descolocaba al lead.
    const texto = textoAutorespuesta({ titularAnuncio: null, anuncio: null }).toLowerCase();
    expect(texto).toContain("pacientes");
    expect(texto).not.toContain("web");
  });

  it("nunca pasa del límite de WhatsApp", () => {
    const largo = "x".repeat(2000);
    expect(textoAutorespuesta({ titularAnuncio: largo, anuncio: null }).length).toBeLessThanOrEqual(1024);
  });
});
