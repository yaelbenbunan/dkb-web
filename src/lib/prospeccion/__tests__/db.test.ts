import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import {
  emailsDeLeads,
  enviadosDesde,
  guardarProspectos,
  listarSuprimidos,
  marcarEstado,
  marcarPorResendId,
  reclamarParaEnvio,
} from "../db";

/** Cadena de supabase-js de mentira: cada método devuelve la misma cadena y
 *  al hacer `await` resuelve con `resultado`. */
function cadena(resultado: { data?: unknown; error?: { message: string } | null; count?: number }) {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "upsert", "insert", "select", "eq", "in", "gte", "order", "limit", "range", "ilike", "not"]) {
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

describe("marcarPorResendId", () => {
  test("devuelve el email y solo cambia filas que siguen en «enviado»", async () => {
    const lectura = cadena({ data: [{ email: "info@bar.es" }] });
    const escritura = cadena({});
    fromMock.mockReturnValueOnce(lectura).mockReturnValueOnce(escritura);
    expect(await marcarPorResendId("r1", "rebotado")).toBe("info@bar.es");
    expect(lectura.select).toHaveBeenCalledWith("email");
    expect(lectura.eq).toHaveBeenCalledWith("resend_id", "r1");
    expect(escritura.update).toHaveBeenCalledWith({ status: "rebotado" });
    expect(escritura.eq).toHaveBeenCalledWith("resend_id", "r1");
    expect(escritura.eq).toHaveBeenCalledWith("status", "enviado");
  });

  test("devuelve null y no actualiza si ningún prospecto tiene ese id", async () => {
    const lectura = cadena({ data: [] });
    fromMock.mockReturnValueOnce(lectura);
    expect(await marcarPorResendId("nada", "baja")).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(lectura.update).not.toHaveBeenCalled();
  });
});

describe("marcarEstado", () => {
  test("con `desde` solo cambia las filas que están en esos estados", async () => {
    const c = cadena({});
    fromMock.mockReturnValue(c);
    await marcarEstado(["a", "b"], "descartado", ["listo", "nuevo"]);
    expect(c.in).toHaveBeenCalledWith("id", ["a", "b"]);
    expect(c.in).toHaveBeenCalledWith("status", ["listo", "nuevo"]);
  });

  test("sin `desde` el filtro es solo por ids", async () => {
    const c = cadena({});
    fromMock.mockReturnValue(c);
    await marcarEstado(["a"], "baja");
    expect(c.in).toHaveBeenCalledTimes(1);
    expect(c.in).toHaveBeenCalledWith("id", ["a"]);
  });
});

describe("lecturas que fallan en cerrado", () => {
  test("listarSuprimidos lee todas las páginas, en minúsculas", async () => {
    const llena = Array.from({ length: 1000 }, (_, i) => ({ value: `x${i}@a.es` }));
    fromMock
      .mockReturnValueOnce(cadena({ data: llena }))
      .mockReturnValueOnce(cadena({ data: [{ value: "Ultimo@B.es" }] }));
    const r = await listarSuprimidos();
    expect(r?.size).toBe(1001);
    expect(r?.has("ultimo@b.es")).toBe(true);
  });

  test("devuelven null si la consulta falla", async () => {
    fromMock.mockReturnValue(cadena({ error: { message: "boom" } }));
    expect(await listarSuprimidos()).toBeNull();
    expect(await emailsDeLeads()).toBeNull();
    expect(await enviadosDesde(new Date())).toBeNull();
  });
});
