import { describe, expect, it } from "vitest";
import { botonesDePayload, etiquetaOrigen, etiquetaVentana, extracto, nombreConversacion, ordenarBandeja } from "../bandeja";

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

describe("etiquetaOrigen", () => {
  it("rotula móvil, historial y bot; el resto no lleva etiqueta", () => {
    expect(etiquetaOrigen("movil")).toBe("Desde el móvil");
    expect(etiquetaOrigen("historial")).toBe("Importado");
    expect(etiquetaOrigen("bot")).toBe("Bot");
    expect(etiquetaOrigen("panel")).toBeNull();
    expect(etiquetaOrigen("cliente")).toBeNull();
    expect(etiquetaOrigen(null)).toBeNull();
    expect(etiquetaOrigen(undefined)).toBeNull();
  });
});

describe("nombreConversacion", () => {
  const nombres = new Map([["l1", "Hydrup SL"]]);
  it("prefiere el nombre del lead, también con el teléfono al lado", () => {
    expect(nombreConversacion("34600111222", "l1", nombres, "Ana")).toBe("Hydrup SL (600111222)");
  });
  it("sin lead usa el nombre de contacto", () => {
    expect(nombreConversacion("34600111222", null, nombres, "Ana")).toBe("Ana (600111222)");
  });
  it("no repite el teléfono si el nombre ya lo lleva", () => {
    expect(nombreConversacion("447710173736", null, nombres, "Lead de WhatsApp (447710173736)")).toBe(
      "Lead de WhatsApp (447710173736)",
    );
  });
  it("sin lead ni nombre usa el teléfono", () => {
    expect(nombreConversacion("34600111222", null, nombres, null)).toBe("600111222");
    expect(nombreConversacion("34600111222", "otro", nombres)).toBe("600111222");
  });
});

describe("ordenarBandeja", () => {
  const ahora = new Date("2026-10-21T12:00:00Z");
  const c = (id: string, ventana_hasta: string | null) => ({ id, ventana_hasta });
  it("pone primero las de ventana abierta y conserva el orden dentro de cada grupo", () => {
    const entrada = [
      c("a", "2026-10-20T12:00:00Z"),
      c("b", "2026-10-22T12:00:00Z"),
      c("c", null),
      c("d", "2026-10-21T13:00:00Z"),
    ];
    expect(ordenarBandeja(entrada, ahora).map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
    expect(entrada.map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
});
