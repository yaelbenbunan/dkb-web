import { describe, expect, test, vi } from "vitest";

vi.mock("../../fetch-seguro", () => ({ leerPaginaSegura: vi.fn() }));

import { enriquecerWeb, type LectorPagina } from "../enriquecer";

/** Lector de mentira: un mapa de URL → HTML. */
function lector(paginas: Record<string, string>): LectorPagina & { mock: { calls: unknown[][] } } {
  return vi.fn(async (url: URL) => {
    const html = paginas[url.toString()];
    return html === undefined ? null : { urlFinal: url, html };
  }) as never;
}

describe("enriquecerWeb", () => {
  test("sin web no hay nada que leer", async () => {
    const leer = lector({});
    expect(await enriquecerWeb(null, leer)).toEqual({ email: null, tipo: null, nota: "Sin web." });
    expect(leer).not.toHaveBeenCalled();
  });

  test("si la portada ya trae un buzón genérico, no lee más páginas", async () => {
    const leer = lector({
      "https://bar.es/": `<a href="/contacto">Contacto</a> info@bar.es`,
      "https://bar.es/contacto": "otra@bar.es",
    });
    expect(await enriquecerWeb("bar.es", leer)).toEqual({ email: "info@bar.es", tipo: "generica", nota: null });
    expect(leer).toHaveBeenCalledTimes(1);
  });

  test("si la portada no lo trae, busca en contacto y aviso legal", async () => {
    const leer = lector({
      "https://bar.es/": `<a href="/contacto">Contacto</a><a href="/aviso-legal">Aviso legal</a>`,
      "https://bar.es/contacto": "<p>Llámanos</p>",
      "https://bar.es/aviso-legal": "<p>Titular: Bar SL, reservas@bar.es</p>",
    });
    expect(await enriquecerWeb("https://bar.es", leer)).toEqual({
      email: "reservas@bar.es",
      tipo: "generica",
      nota: null,
    });
    expect(leer).toHaveBeenCalledTimes(3);
  });

  test("prefiere un genérico de la página de contacto a un personal de la portada", async () => {
    const leer = lector({
      "https://bar.es/": `juan.perez@bar.es <a href="/contacto">Contacto</a>`,
      "https://bar.es/contacto": "info@bar.es",
    });
    expect((await enriquecerWeb("bar.es", leer)).email).toBe("info@bar.es");
  });

  test("compara con el dominio final tras una redirección", async () => {
    const leer: LectorPagina = async () => ({
      urlFinal: new URL("https://www.barpepe.com/"),
      html: "info@barpepe.com",
    });
    expect((await enriquecerWeb("bar.es", leer)).email).toBe("info@barpepe.com");
  });

  test("web que no responde", async () => {
    expect(await enriquecerWeb("bar.es", lector({}))).toEqual({
      email: null,
      tipo: null,
      nota: "La web no responde.",
    });
  });

  test("web sin email publicado", async () => {
    expect(await enriquecerWeb("bar.es", lector({ "https://bar.es/": "<p>Hola</p>" }))).toEqual({
      email: null,
      tipo: null,
      nota: "La web no publica ningún email.",
    });
  });

  test("una URL inválida o interna no se intenta", async () => {
    const leer = lector({});
    expect((await enriquecerWeb("javascript:alert(1)", leer)).nota).toBe("La web no responde.");
    expect((await enriquecerWeb("http://localhost/admin", leer)).nota).toBe("La web no responde.");
    expect(leer).not.toHaveBeenCalled();
  });
});
