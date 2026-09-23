import { describe, expect, it } from "vitest";
import { etiquetaVentana, extracto } from "../bandeja";

describe("extracto", () => {
  it("deja pasar los textos cortos", () => {
    expect(extracto("hola qué tal")).toBe("hola qué tal");
  });

  it("recorta sin partir palabras", () => {
    const largo = "palabra ".repeat(20).trim();
    const res = extracto(largo);
    expect(res.length).toBeLessThanOrEqual(81);
    expect(res.endsWith("…")).toBe(true);
    expect(res).not.toMatch(/palabr…$/);
  });

  it("describe los mensajes sin texto", () => {
    expect(extracto(null)).toBe("(sin texto)");
  });
});

describe("etiquetaVentana", () => {
  const ahora = new Date("2026-09-23T10:00:00Z");

  it("dice cuánto queda mientras está abierta", () => {
    expect(etiquetaVentana("2026-09-23T13:30:00Z", ahora)).toBe("Abierta · quedan 3 h");
  });

  it("redondea a minutos cuando queda menos de una hora", () => {
    expect(etiquetaVentana("2026-09-23T10:20:00Z", ahora)).toBe("Abierta · quedan 20 min");
  });

  it("avisa de que hace falta plantilla si está cerrada", () => {
    expect(etiquetaVentana("2026-09-23T09:00:00Z", ahora)).toBe("Cerrada, hace falta plantilla");
    expect(etiquetaVentana(null, ahora)).toBe("Cerrada, hace falta plantilla");
  });
});
