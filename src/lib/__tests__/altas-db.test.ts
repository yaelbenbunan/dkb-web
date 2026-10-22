import { beforeEach, describe, expect, test, vi } from "vitest";

/** Cliente de Supabase de mentira: cada consulta apunta sus filtros y devuelve la siguiente respuesta de la cola. */
const s = vi.hoisted(() => ({
  respuestas: [] as unknown[],
  consultas: [] as { op: string; valores?: unknown; filtros: [string, string, unknown][] }[],
  info: vi.fn(),
  list: vi.fn(),
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
    storage: { from: () => ({ info: s.info, list: s.list }) },
  }),
}));

import { guardarEnvioAlta, infoArchivo, modificarPendientes, usoAlta } from "@/lib/altas/db";

beforeEach(() => {
  s.respuestas = [];
  s.consultas = [];
  s.info.mockReset();
  s.list.mockReset();
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

  test("escribe con la revisión siguiente, condicionado a la leída (sin la lista en el filtro)", async () => {
    s.respuestas = [{ data: { subidas_pendientes: [entrada], pendientes_rev: 7 }, error: null }, { data: [{ id: "a" }], error: null }];
    const r = await modificarPendientes("a", (l) => ({ ok: true, pendientes: [...l, { ...entrada, ruta: "r2" }] }));
    expect(r).toEqual({ estado: "ok" });
    const escritura = s.consultas[1];
    expect(escritura.op).toBe("update");
    expect(escritura.valores).toEqual({ subidas_pendientes: [entrada, { ...entrada, ruta: "r2" }], pendientes_rev: 8 });
    expect(escritura.filtros).toEqual([["eq", "id", "a"], ["eq", "pendientes_rev", 7]]);
  });

  test("si otra petición se adelantó, vuelve a leer y reintenta una sola vez", async () => {
    s.respuestas = [
      { data: { subidas_pendientes: [], pendientes_rev: 0 }, error: null },
      { data: [], error: null },
      { data: { subidas_pendientes: [entrada], pendientes_rev: 1 }, error: null },
      { data: [{ id: "a" }], error: null },
    ];
    const vistas: unknown[] = [];
    expect(await modificarPendientes("a", (l) => (vistas.push(l), { ok: true, pendientes: l }))).toEqual({ estado: "ok" });
    expect(vistas).toEqual([[], [entrada]]);
    expect(s.consultas[3].filtros).toContainEqual(["eq", "pendientes_rev", 1]);

    s.respuestas = [
      { data: { subidas_pendientes: [], pendientes_rev: 0 }, error: null },
      { data: [], error: null },
      { data: { subidas_pendientes: [], pendientes_rev: 1 }, error: null },
      { data: [], error: null },
    ];
    s.consultas = [];
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "error" });
    expect(s.consultas).toHaveLength(4);
  });

  test("un rechazo del cambio no escribe nada", async () => {
    s.respuestas = [{ data: { subidas_pendientes: [], pendientes_rev: 0 }, error: null }];
    expect(await modificarPendientes("a", () => ({ ok: false, error: "no" }))).toEqual({ estado: "rechazo", error: "no" });
    expect(s.consultas).toHaveLength(1);
  });

  test("revisión ilegible: error, sin escribir", async () => {
    s.respuestas = [{ data: { subidas_pendientes: [] }, error: null }];
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "error" });
    expect(s.consultas).toHaveLength(1);
  });

  test("sin las columnas: sin_columna, avisando una sola vez", async () => {
    const aviso = vi.mocked(console.error);
    s.respuestas = [{ data: null, error: { code: "42703", message: "column pendientes_rev does not exist" } }, { data: null, error: { code: "42703", message: "column does not exist" } }];
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "sin_columna" });
    expect(await modificarPendientes("a", (l) => ({ ok: true, pendientes: l }))).toEqual({ estado: "sin_columna" });
    expect(aviso.mock.calls.filter((c) => String(c[0]).includes("pendientes_rev"))).toHaveLength(1);
  });
});

describe("usoAlta", () => {
  const ID = "11111111-2222-4333-8444-555555555555";

  test("cuenta los objetos del bucket con su ruta completa y su tamaño real", async () => {
    s.list.mockResolvedValue({
      data: [
        { id: "o1", name: "u1-logo.svg", metadata: { size: 100 } },
        { id: null, name: "subcarpeta" },
        { id: "o2", name: "u2-foto.jpg", metadata: { size: 50 } },
      ],
      error: null,
    });
    expect(await usoAlta({ id: ID, archivos: [] })).toEqual({ archivos: 2, bytes: 150, rutas: [`${ID}/diseno/u1-logo.svg`, `${ID}/diseno/u2-foto.jpg`] });
    expect(s.list).toHaveBeenCalledWith(`${ID}/diseno`, { limit: 1000 });
  });

  test("si el listado falla, cuenta lo guardado", async () => {
    s.list.mockResolvedValue({ data: null, error: { message: "caído" } });
    const guardado = { campo: "logo" as const, ruta: `${ID}/diseno/x.svg`, nombre: "x.svg", tamano: 7, tipo: "" };
    expect(await usoAlta({ id: ID, archivos: [guardado] })).toEqual({ archivos: 1, bytes: 7, rutas: [guardado.ruta] });
  });
});
