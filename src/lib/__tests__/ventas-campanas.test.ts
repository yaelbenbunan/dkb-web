import { describe, expect, test } from "vitest";
import { campanaEsDeMarca, conModulo, leerModulos, MODULO_CAMPANAS, remitentesDeMarca, tieneModulo } from "../ventas/campanas";

const dinkbit = { id: "m-dink", slug: "dinkbit" };
const hydrup = { id: "m-hyd", slug: "hydrup" };

describe("tieneModulo", () => {
  test("con la migración, manda la lista de módulos de la marca", () => {
    expect(tieneModulo({ ...hydrup, modulos: ["campanas"] }, MODULO_CAMPANAS)).toBe(true);
    expect(tieneModulo({ ...hydrup, modulos: [] }, MODULO_CAMPANAS)).toBe(false);
    // Un admin puede apagárselo también a dinkbit.
    expect(tieneModulo({ ...dinkbit, modulos: [] }, MODULO_CAMPANAS)).toBe(false);
  });

  test("sin la migración (no viene la columna) solo dinkbit lo tiene", () => {
    expect(tieneModulo(dinkbit, MODULO_CAMPANAS)).toBe(true);
    expect(tieneModulo(hydrup, MODULO_CAMPANAS)).toBe(false);
    expect(tieneModulo({ ...dinkbit, modulos: null }, MODULO_CAMPANAS)).toBe(true);
  });
});

describe("campanaEsDeMarca", () => {
  test("la campaña es de la marca que guarda", () => {
    expect(campanaEsDeMarca({ marca_id: "m-hyd" }, hydrup)).toBe(true);
    expect(campanaEsDeMarca({ marca_id: "m-hyd" }, dinkbit)).toBe(false);
    expect(campanaEsDeMarca({ marca_id: "m-dink" }, hydrup)).toBe(false);
  });

  test("sin marca (o sin la columna) es de dinkbit y de nadie más", () => {
    expect(campanaEsDeMarca({ marca_id: null }, dinkbit)).toBe(true);
    expect(campanaEsDeMarca({}, dinkbit)).toBe(true);
    expect(campanaEsDeMarca({ marca_id: null }, hydrup)).toBe(false);
    expect(campanaEsDeMarca({}, hydrup)).toBe(false);
  });
});

describe("remitentesDeMarca", () => {
  const global = ["hola@dinkbit.es"];

  test("los de la marca si los tiene, limpios y en minúsculas", () => {
    expect(remitentesDeMarca({ campanas_remitentes: [" Hola@Hydrup.es ", ""] }, global)).toEqual(["hola@hydrup.es"]);
  });

  test("sin remitentes propios (o sin la columna), la lista global", () => {
    expect(remitentesDeMarca({ campanas_remitentes: [] }, global)).toEqual(global);
    expect(remitentesDeMarca({}, global)).toEqual(global);
    expect(remitentesDeMarca({ campanas_remitentes: null }, global)).toEqual(global);
  });
});

describe("conModulo", () => {
  test("enciende y apaga sin tocar los demás ni repetir", () => {
    expect(conModulo(["otro"], MODULO_CAMPANAS, true)).toEqual(["otro", "campanas"]);
    expect(conModulo(["campanas", "otro"], MODULO_CAMPANAS, true)).toEqual(["otro", "campanas"]);
    expect(conModulo(["campanas", "otro"], MODULO_CAMPANAS, false)).toEqual(["otro"]);
    expect(conModulo(undefined, MODULO_CAMPANAS, true)).toEqual(["campanas"]);
  });
});

describe("leerModulos", () => {
  function fd(campos: [string, string][]) {
    const f = new FormData();
    campos.forEach(([k, v]) => f.append(k, v));
    return f;
  }

  test("casilla de campañas y remitentes separados por comas o líneas", () => {
    const r = leerModulos(fd([["campanas", "on"], ["remitentes", "hola@hydrup.es, Info@Hydrup.es\nhola@hydrup.es"]]));
    expect(r).toEqual({ ok: true, datos: { campanas: true, remitentes: ["hola@hydrup.es", "info@hydrup.es"] } });
  });

  test("sin casilla = apagado; remitentes vacíos = lista global", () => {
    expect(leerModulos(fd([["remitentes", "  "]]))).toEqual({ ok: true, datos: { campanas: false, remitentes: [] } });
  });

  test("rechaza un remitente que no es un email", () => {
    const r = leerModulos(fd([["campanas", "on"], ["remitentes", "hola@hydrup.es, Hydrup"]]));
    expect(r.ok).toBe(false);
  });
});
