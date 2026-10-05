import { describe, expect, it } from "vitest";
import { botonesDePayload, etiquetaVentana, extracto } from "../bandeja";

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

  it("corta en seco cuando no hay ningún espacio que respetar", () => {
    const url = `https://ejemplo.com/${"a".repeat(90)}`;
    const res = extracto(url);
    expect(res.length).toBe(81);
    expect(res.endsWith("…")).toBe(true);
    expect(res.slice(0, -1)).toBe(url.slice(0, 80));
  });
});

describe("botonesDePayload", () => {
  it("devuelve los rótulos que se guardaron con el saliente", () => {
    expect(botonesDePayload({ botones: ["Faltan pacientes", "No vuelven"] })).toEqual(["Faltan pacientes", "No vuelven"]);
  });

  it("sin botones, o con un payload que no es el nuestro, no pinta nada", () => {
    // Los entrantes guardan aquí el mensaje crudo de Meta y los salientes
    // antiguos no guardaron nada: ninguno de los dos tiene `botones`.
    for (const payload of [null, undefined, {}, "x", [], { botones: "x" }, { botones: [1, null] }, { type: "text" }]) {
      expect(botonesDePayload(payload)).toEqual([]);
    }
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

  it("no dice 'quedan 0 min' en los últimos segundos", () => {
    expect(etiquetaVentana("2026-09-23T10:00:30Z", ahora)).toBe("Abierta · menos de 1 min");
  });

  it("avisa de que hace falta plantilla si está cerrada", () => {
    expect(etiquetaVentana("2026-09-23T09:00:00Z", ahora)).toBe("Cerrada, hace falta plantilla");
    expect(etiquetaVentana(null, ahora)).toBe("Cerrada, hace falta plantilla");
  });
});
