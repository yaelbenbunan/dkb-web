import { beforeEach, describe, expect, test, vi } from "vitest";

/** Base simulada: cada consulta apunta sus llamadas y contesta con la siguiente respuesta de la cola. */
type Llamada = { tabla: string; metodos: [string, unknown[]][] };
const estado: { llamadas: Llamada[]; respuestas: { data?: unknown; error?: { message: string; code?: string } | null }[] } = {
  llamadas: [],
  respuestas: [],
};

function consulta(tabla: string) {
  const llamada: Llamada = { tabla, metodos: [] };
  estado.llamadas.push(llamada);
  const responder = () => {
    const r = estado.respuestas.shift() ?? { data: [], error: null };
    return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
  };
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "or", "order", "limit", "lte"]) {
    builder[m] = (...args: unknown[]) => {
      llamada.metodos.push([m, args]);
      return builder;
    };
  }
  builder.single = () => {
    llamada.metodos.push(["single", []]);
    return responder();
  };
  builder.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => responder().then(ok, ko);
  return builder;
}

const { getAdminMock } = vi.hoisted(() => ({ getAdminMock: vi.fn() }));
vi.mock("../supabase-admin", () => ({ getSupabaseAdmin: getAdminMock }));
vi.mock("server-only", () => ({}));

import { crearCampanaDeMarca, listCampaigns, listEmailTemplates, saveEmailTemplate } from "../campaigns";

const metodos = (i: number) => estado.llamadas[i].metodos;
const sinColumna = { message: 'column campaigns.marca_id does not exist', code: "42703" };

beforeEach(() => {
  estado.llamadas = [];
  estado.respuestas = [];
  getAdminMock.mockReset().mockReturnValue({ from: consulta });
});

describe("crearCampanaDeMarca", () => {
  test("crea el borrador con la marca", async () => {
    estado.respuestas.push({ data: { id: "c1" } });
    const r = await crearCampanaDeMarca({ marcaId: "m-hyd", sinMarcaSiFalta: false });
    expect(r).toEqual({ ok: true, id: "c1" });
    expect(metodos(0)[0]).toEqual(["insert", [{ name: null, concept: null, status: "draft", marca_id: "m-hyd" }]]);
  });

  test("sin la columna, una marca cliente NO crea una campaña sin marca (sería de dinkbit)", async () => {
    estado.respuestas.push({ error: sinColumna });
    const r = await crearCampanaDeMarca({ marcaId: "m-hyd", sinMarcaSiFalta: false });
    expect(r).toEqual({ ok: false, error: "missing_migration" });
    expect(estado.llamadas).toHaveLength(1);
  });

  test("sin la columna, dinkbit la crea sin marca (es lo mismo que de dinkbit)", async () => {
    estado.respuestas.push({ error: sinColumna }, { data: { id: "c2" } });
    const r = await crearCampanaDeMarca({ marcaId: "m-dink", sinMarcaSiFalta: true });
    expect(r).toEqual({ ok: true, id: "c2" });
    expect(metodos(1)[0]).toEqual(["insert", [{ name: null, concept: null, status: "draft" }]]);
  });
});

describe("listCampaigns por marca", () => {
  test("una marca cliente solo ve las suyas", async () => {
    estado.respuestas.push({ data: [{ id: "c1" }] });
    expect(await listCampaigns(200, { marcaId: "m-hyd", incluirSinMarca: false })).toEqual([{ id: "c1" }]);
    expect(metodos(0)).toContainEqual(["eq", ["marca_id", "m-hyd"]]);
  });

  test("dinkbit ve las suyas y las que no tienen marca", async () => {
    estado.respuestas.push({ data: [] });
    await listCampaigns(200, { marcaId: "m-dink", incluirSinMarca: true });
    expect(metodos(0)).toContainEqual(["or", ["marca_id.eq.m-dink,marca_id.is.null"]]);
  });

  test("sin la columna: dinkbit ve todo como antes, otra marca nada", async () => {
    estado.respuestas.push({ error: sinColumna }, { data: [{ id: "vieja" }] });
    expect(await listCampaigns(200, { marcaId: "m-dink", incluirSinMarca: true })).toEqual([{ id: "vieja" }]);
    estado.respuestas.push({ error: sinColumna });
    expect(await listCampaigns(200, { marcaId: "m-hyd", incluirSinMarca: false })).toEqual([]);
  });

  test("sin ámbito, sin filtro (lo de siempre)", async () => {
    estado.respuestas.push({ data: [] });
    await listCampaigns();
    expect(metodos(0).map(([m]) => m)).not.toContain("or");
    expect(metodos(0).map(([m]) => m)).not.toContain("eq");
  });
});

describe("plantillas por marca", () => {
  test("la marca ve las predefinidas y las suyas", async () => {
    estado.respuestas.push({ data: [] });
    await listEmailTemplates({ marcaId: "m-hyd", incluirSinMarca: false });
    expect(metodos(0)).toContainEqual(["or", ["is_builtin.eq.true,marca_id.eq.m-hyd"]]);
  });

  test("sin la columna, otra marca solo ve las predefinidas", async () => {
    estado.respuestas.push({ error: { message: "column email_templates.marca_id does not exist", code: "42703" } }, { data: [{ id: "b" }] });
    expect(await listEmailTemplates({ marcaId: "m-hyd", incluirSinMarca: false })).toEqual([{ id: "b" }]);
    expect(metodos(1)).toContainEqual(["eq", ["is_builtin", true]]);
  });

  test("guardar plantilla con marca; sin la columna, una marca cliente no la guarda", async () => {
    estado.respuestas.push({ data: { id: "t1" } });
    expect(await saveEmailTemplate({ name: "A", blocks: [], marcaId: "m-hyd" })).toEqual({ id: "t1" });
    expect(metodos(0)[0][1]).toEqual([expect.objectContaining({ marca_id: "m-hyd", is_builtin: false })]);

    estado.respuestas.push({ error: { message: "marca_id", code: "PGRST204" } });
    expect(await saveEmailTemplate({ name: "A", blocks: [], marcaId: "m-hyd" })).toBeNull();
  });
});
