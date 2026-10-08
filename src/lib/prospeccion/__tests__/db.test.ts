import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { guardarProspectos, reclamarParaEnvio } from "../db";

/** Cadena de supabase-js de mentira: cada método devuelve la misma cadena y
 *  al hacer `await` resuelve con `resultado`. */
function cadena(resultado: { data?: unknown; error?: { message: string } | null; count?: number }) {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "upsert", "insert", "select", "eq", "in", "gte", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: null, ...resultado }).then(ok);
  return c as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => fromMock.mockReset());

describe("reclamarParaEnvio", () => {
  test("reclama solo si la fila sigue en «listo»", async () => {
    const c = cadena({ data: [{ id: "p1" }] });
    fromMock.mockReturnValue(c);
    expect(await reclamarParaEnvio("p1")).toBe(true);
    expect(c.eq).toHaveBeenCalledWith("id", "p1");
    expect(c.eq).toHaveBeenCalledWith("status", "listo");
    expect(c.update).toHaveBeenCalledWith(expect.objectContaining({ status: "enviado" }));
  });

  test("devuelve false si otra petición ya se la llevó", async () => {
    fromMock.mockReturnValue(cadena({ data: [] }));
    expect(await reclamarParaEnvio("p1")).toBe(false);
  });
});

describe("guardarProspectos", () => {
  test("ignora las empresas que ya existían y cuenta solo las nuevas", async () => {
    const c = cadena({ data: [{ id: "a" }] });
    fromMock.mockReturnValue(c);
    const nuevos = await guardarProspectos("s1", [
      { source: "places", external_id: "x", name: "Uno", sector: null, address: null, city: null, province: null, phone: null, website: null, rating: null, reviews: null },
      { source: "places", external_id: "y", name: "Dos", sector: null, address: null, city: null, province: null, phone: null, website: null, rating: null, reviews: null },
    ]);
    expect(nuevos).toBe(1);
    expect(c.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ search_id: "s1", external_id: "x", status: "nuevo" })]),
      { onConflict: "source,external_id", ignoreDuplicates: true },
    );
  });

  test("sin filas no toca la base", async () => {
    expect(await guardarProspectos("s1", [])).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
