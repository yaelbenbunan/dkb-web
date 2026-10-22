import { beforeEach, describe, expect, test, vi } from "vitest";

/** Cliente de Supabase de mentira: cada consulta apunta sus filtros y devuelve la siguiente respuesta de la cola. */
const s = vi.hoisted(() => ({
  respuestas: [] as unknown[],
  consultas: [] as { op: string; valores?: unknown; filtros: [string, string, unknown][] }[],
  info: vi.fn(),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const q = { op: "select", valores: undefined as unknown, filtros: [] as [string, string, unknown][] };
      s.consultas.push(q);
      const cadena: Record<string, unknown> = {};
      const fin = () => Promise.resolve(s.respuestas.shift());
      Object.assign(cadena, {
        select: () => cadena,
        update: (v: unknown) => ((q.op = "update"), (q.valores = v), cadena),
        eq: (c: string, v: unknown) => (q.filtros.push(["eq", c, v]), cadena),
        is: (c: string, v: unknown) => (q.filtros.push(["is", c, v]), cadena),
        maybeSingle: fin,
        then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => fin().then(ok, ko),
      });
      return cadena;
    },
    storage: { from: () => ({ info: s.info }) },
  }),
}));

import { guardarEnvioAlta, infoArchivo, modificarPendientes } from "@/lib/altas/db";

beforeEach(() => {
  s.respuestas = [];
  s.consultas = [];
  s.info.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("infoArchivo", () => {
  test("existe: tamaño y tipo reales", async () => {
    s.info.mockResolvedValue({ data: { size: 123, contentType: "image/png" }, error: null });
    expect(await infoArchivo("r")).toEqual({ estado: "ok", tamano: 123, tipo: "image/png" });
  });

  test("solo un «no existe» cuenta como no subido", async () => {
    s.info.mockResolvedValueOnce({ data: null, error: { message: "Object not found", status: 400, statusCode: "404" } });
    expect(await infoArchivo("r")).toEqual({ estado: "no_existe" });
    s.info.mockResolvedValueOnce({ data: null, error: { message: "x", status: 404 } });
    expect(await infoArchivo("r")).toEqual({ estado: "no_existe" });
  });

  test("otros fallos (red, permisos, 500) no se confunden con «no existe»", async () => {
    s.info.mockResolvedValueOnce({ data: null, error: { message: "Internal Server Error", status: 500, statusCode: "500" } });
    expect(await infoArchivo("r")).toEqual({ estado: "error" });
    s.info.mockResolvedValueOnce({ data: null, error: { message: "fetch failed" } });
    expect(await infoArchivo("r")).toEqual({ estado: "error" });
  });
});

describe("guardarEnvioAlta", () => {
  test("condiciona al enviada_en leído (null → is null) y a que siga activa", async () => {
    s.respuestas = [{ data: [{ id: "a" }], error: null }];
    expect(await guardarEnvioAlta("a", { respuestas: {}, archivos: [] }, null)).toEqual({ ok: true });
    expect(s.consultas[0].filtros).toEqual([["eq", "id", "a"], ["eq", "activa", true], ["is", "enviada_en", null]]);
    s.respuestas = [{ data: [{ id: "a" }], error: null }];
    await guardarEnvioAlta("a", { respuestas: {}, archivos: [] }, "T1");
    expect(s.consultas[1].filtros).toContainEqual(["eq", "enviada_en", "T1"]);
  });

  test("ninguna fila: conflicto", async () => {
    s.respuestas = [{ data: [], error: null }];
    expect(await guardarEnvioAlta("a", { respuestas: {}, archivos: [] }, "T1")).toMatchObject({ ok: false, conflicto: true });
  });
});

describe("modificarPendientes", () => {
  const entrada = { ruta: "r1", firmada: "2026-10-22T12:00:00.000Z", expira: "2026-10-22T14:00:00.000Z" };

  test("escribe condicionado al valor leído", async () => {
    s.respuestas = [{ data: { subidas_pendientes: [entrada] }, error: null }, { data: [{ id: "a" }], error: null }];
    const r = await modificarPendientes("a", (l) => ({ ok: true, pendientes: [...l, { ...entrada, ruta: "r2" }] }));
    expect(r).toEqual({ estado: "ok" });
    const escritura = s.consultas[1];
    expect(escritura.op).toBe("update");
    expect(escritura.valores).toEqual({ subidas_pendientes: [entrada, { ...entrada, ruta: "r2" }] });
    expect(escritura.filtros).toContainEqual(["eq", "subidas_pendientes", JSON.stringify([entrada])]);
  });

  test("si otra petición se adelantó, vuelve a leer y reintenta (hasta 3)", async () => {
    s.respuestas = [
      { data: { subidas_pendientes: [] }, error: null },
      { data: [], error: null },
      { data: { subidas_pendientes: [entrada] }, error: null },
      { data: [{ id: "a" }], error: null },
    ];
    const vistas: unknown[] = [];
    const r = await modificarPendientes("a", (l) => (vistas.push(l), { ok: true, pendientes: l }));
    expect(r).toEqual({ estado: "ok" });
    expect(vistas).toEqual([[], [entrada]]);
    s.respuestas = Array.from({ length: 3 }, () => [{ data: { subidas_pendientes: [] }, error: null }, { data: [], error: null }]).flat();
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "error" });
  });

  test("un rechazo del cambio no escribe nada", async () => {
    s.respuestas = [{ data: { subidas_pendientes: [] }, error: null }];
    expect(await modificarPendientes("a", () => ({ ok: false, error: "no" }))).toEqual({ estado: "rechazo", error: "no" });
    expect(s.consultas).toHaveLength(1);
  });

  test("sin la columna: sin_columna, avisando una sola vez", async () => {
    const aviso = vi.mocked(console.error);
    s.respuestas = [{ data: null, error: { code: "42703", message: "column does not exist" } }, { data: null, error: { code: "42703", message: "column does not exist" } }];
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "sin_columna" });
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "sin_columna" });
    expect(aviso.mock.calls.filter((c) => String(c[0]).includes("subidas_pendientes"))).toHaveLength(1);
  });
});
