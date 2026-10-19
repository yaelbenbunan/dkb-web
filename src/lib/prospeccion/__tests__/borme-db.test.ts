import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { buscarConstituciones, patronObjeto } from "../borme-db";

function cadena(resultado: { data?: unknown; error?: { message: string } | null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "ilike", "order", "limit"]) c[m] = vi.fn(() => c);
  c.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: null, ...resultado }).then(ok);
  return c as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => fromMock.mockReset());

describe("buscarConstituciones", () => {
  test("por municipio y desde una fecha, las más recientes primero", async () => {
    const c = cadena({ data: [{ id: "2026-1" }] });
    fromMock.mockReturnValue(c);
    expect(await buscarConstituciones({ municipio: "getafe", desde: "2026-09-19" })).toEqual([{ id: "2026-1" }]);
    expect(fromMock).toHaveBeenCalledWith("prospect_borme");
    expect(c.eq).toHaveBeenCalledWith("municipio_clave", "getafe");
    expect(c.gte).toHaveBeenCalledWith("fecha_publicacion", "2026-09-19");
    expect(c.order).toHaveBeenCalledWith("fecha_publicacion", { ascending: false });
    expect(c.ilike).not.toHaveBeenCalled();
  });

  test("por provincia y con palabra del objeto social", async () => {
    const c = cadena({ data: [] });
    fromMock.mockReturnValue(c);
    await buscarConstituciones({ provincia: "Madrid", desde: "2026-07-21", objeto: "estética" });
    expect(c.eq).toHaveBeenCalledWith("provincia", "Madrid");
    expect(c.ilike).toHaveBeenCalledWith("objeto", "%_st_t_c_%");
  });

  test("sin municipio ni provincia, nada", async () => {
    expect(await buscarConstituciones({ desde: "2026-09-19" })).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  test("si la tabla no existe devuelve null", async () => {
    fromMock.mockReturnValue(cadena({ data: null, error: { message: 'relation "prospect_borme" does not exist' } }));
    expect(await buscarConstituciones({ municipio: "getafe", desde: "2026-09-19" })).toBeNull();
  });
});

describe("patronObjeto", () => {
  test("las vocales valen con o sin tilde y los comodines del usuario no cuentan", () => {
    expect(patronObjeto("Peluquería")).toBe("%p_l_q__r__%");
    expect(patronObjeto("50%_x\\")).toBe("%50x%");
    expect(patronObjeto("   ")).toBeNull();
  });
});
