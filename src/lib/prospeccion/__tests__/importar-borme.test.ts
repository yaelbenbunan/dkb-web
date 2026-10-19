import { describe, expect, test, vi } from "vitest";
import { importarBorme, rangoDias } from "../importar-borme";

vi.mock("../borme", () => ({
  documentosSeccionA: () => [{ urlXml: "https://boe/xml/28", provincia: "Madrid" }],
  parsearConstituciones: (_xml: string, d: { fecha: string }) => [
    { id: "2026-1", nombre: "UNO SL", fecha_publicacion: d.fecha },
    { id: "2026-1", nombre: "UNO SL", fecha_publicacion: d.fecha },
  ],
}));

describe("importarBorme", () => {
  test("rangoDias incluye hoy y va hacia atrás", () => {
    expect(rangoDias(new Date("2026-10-19T08:00:00Z"), 3)).toEqual(["2026-10-17", "2026-10-18", "2026-10-19"]);
  });

  test("salta los días sin BORME, quita repetidas y guarda", async () => {
    const leer = vi.fn(async (url: string) => (url.endsWith("20261018") ? null : url.includes("sumario") ? "{}" : "<xml/>"));
    const guardar = vi.fn(async () => null);
    const r = await importarBorme({ dias: 2, hoy: new Date("2026-10-19T00:00:00Z") }, { leer, guardar });
    expect(r).toEqual({ ok: true, dias: 2, constituciones: 1 });
    expect(guardar).toHaveBeenCalledWith([expect.objectContaining({ id: "2026-1" })]);
  });

  test("si el BOE falla o no se puede guardar, lo dice sin lanzar", async () => {
    const malBoe = await importarBorme({ dias: 1 }, { leer: async () => { throw new Error("caído"); }, guardar: async () => null });
    expect(malBoe).toMatchObject({ ok: false, error: expect.stringContaining("caído") });
    const malDb = await importarBorme({ dias: 1 }, { leer: async (u) => (u.includes("sumario") ? "{}" : "<x/>"), guardar: async () => "sin tabla" });
    expect(malDb).toMatchObject({ ok: false, error: expect.stringContaining("sin tabla") });
  });
});
