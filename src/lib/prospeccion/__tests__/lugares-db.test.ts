import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { buscarLugares, huellasDeProspectos } from "../lugares-db";

function cadena(resultados: Array<{ data?: unknown; error?: { message: string } | null }>) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "contains", "eq", "order", "limit", "range"]) c[m] = vi.fn(() => c);
  let i = 0;
  c.then = (ok: (v: unknown) => unknown) =>
    Promise.resolve({ error: null, ...resultados[Math.min(i++, resultados.length - 1)] }).then(ok);
  return c as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => fromMock.mockReset());

describe("buscarLugares", () => {
  test("filtra por categoría y municipio, los de más confianza primero", async () => {
    const c = cadena([{ data: [{ id: "a" }] }]);
    fromMock.mockReturnValue(c);
    expect(await buscarLugares({ clave: "dentistas", municipio: "getafe" })).toEqual([{ id: "a" }]);
    expect(fromMock).toHaveBeenCalledWith("prospect_lugares");
    expect(c.contains).toHaveBeenCalledWith("categorias", ["dentistas"]);
    expect(c.eq).toHaveBeenCalledWith("municipio_clave", "getafe");
    expect(c.order).toHaveBeenCalledWith("confianza", { ascending: false });
  });

  test("o por provincia", async () => {
    const c = cadena([{ data: [] }]);
    fromMock.mockReturnValue(c);
    await buscarLugares({ clave: "dentistas", provincia: "Bizkaia" });
    expect(c.eq).toHaveBeenCalledWith("provincia", "Bizkaia");
  });

  test("si la tabla no existe devuelve null (la búsqueda vuelve a OSM)", async () => {
    fromMock.mockReturnValue(cadena([{ data: null, error: { message: 'relation "prospect_lugares" does not exist' } }]));
    expect(await buscarLugares({ clave: "dentistas", municipio: "getafe" })).toBeNull();
  });
});

describe("huellasDeProspectos", () => {
  test("lee por páginas hasta una vacía", async () => {
    const c = cadena([
      { data: [{ source: "osm", external_id: "node/1", city: "Getafe", phone: "910", website: null }] },
      { data: [] },
    ]);
    fromMock.mockReturnValue(c);
    const h = await huellasDeProspectos();
    expect([...(h?.ids ?? [])]).toEqual(["osm:node/1"]);
    expect(h?.fichas).toEqual([{ city: "Getafe", phone: "910", website: null }]);
    expect(c.range).toHaveBeenCalledTimes(2);
  });

  test("null si falla", async () => {
    fromMock.mockReturnValue(cadena([{ data: null, error: { message: "x" } }]));
    expect(await huellasDeProspectos()).toBeNull();
  });
});
