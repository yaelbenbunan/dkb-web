import { describe, expect, it } from "vitest";
import {
  VERTICAL_POR_ANUNCIO,
  opcionesAutorespuesta,
  textoAutorespuesta,
  verticalDeAnuncio,
} from "../autorespuesta";

describe("verticalDeAnuncio", () => {
  it("reconoce los anuncios mapeados", () => {
    for (const [anuncio, vertical] of Object.entries(VERTICAL_POR_ANUNCIO)) {
      expect(verticalDeAnuncio(anuncio)).toBe(vertical);
    }
  });

  it("el anuncio de la campaña de psicología manda el texto de psicología", () => {
    const anuncio = "120252112386740343";
    expect(verticalDeAnuncio(anuncio)).toBe("psicologia");
    expect(textoAutorespuesta({ anuncio })).toContain("llenar la agenda de tu consulta");
    expect(opcionesAutorespuesta(anuncio)).toContain("Huecos en la agenda");
  });

  it("cae a la pregunta común con un anuncio que no conocemos", () => {
    // Lo normal al estrenar una campaña: el anuncio existe antes de que nadie
    // lo haya mapeado aquí. No puede costar el primer impacto.
    expect(verticalDeAnuncio("120200000000000")).toBe("generico");
    expect(verticalDeAnuncio(null)).toBe("generico");
  });
});

describe("textoAutorespuesta", () => {
  it("no repite el titular del anuncio: quedaba pesado", () => {
    const texto = textoAutorespuesta({ anuncio: null });
    expect(texto).not.toContain("Llenamos los huecos de tu agenda");
    expect(texto).toMatch(/gracias por interesarte/i);
    expect(texto).toContain("Growth");
  });

  it("va directo a la pregunta, sin presentación larga", () => {
    const texto = textoAutorespuesta({ anuncio: null });
    expect(texto).toMatch(/para poder ofrecerte la mejor solución/i);
  });

  it("se presenta y explica qué es Growth", () => {
    const texto = textoAutorespuesta({ anuncio: null });
    expect(texto).toContain("Growth");
    expect(texto).toContain("Paula");
  });

  it("habla de pacientes, no de webs", () => {
    // La autorespuesta solo se dispara con clics de anuncio, y todos los
    // anuncios son de captación de pacientes para clínicas. Preguntar por la
    // web —como hacía la primera versión— descolocaba al lead.
    const texto = textoAutorespuesta({ anuncio: null }).toLowerCase();
    expect(texto).toContain("paciente");
    expect(texto).not.toContain("web");
  });

  it("las opciones caben en un botón de WhatsApp", () => {
    // 20 caracteres es el límite duro. Pasarse no da un error bonito: Meta
    // rechaza el mensaje entero y el lead no recibe nada.
    for (const anuncio of [null, "120200000000000"]) {
      const opciones = opcionesAutorespuesta(anuncio);
      expect(opciones).toHaveLength(3);
      for (const o of opciones) expect(o.length).toBeLessThanOrEqual(20);
    }
  });

  it("nunca pasa del límite de WhatsApp", () => {
    
    expect(textoAutorespuesta({ anuncio: null }).length).toBeLessThanOrEqual(1024);
  });
});
