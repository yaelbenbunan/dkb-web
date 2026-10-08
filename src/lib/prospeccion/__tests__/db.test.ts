import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("../../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import {
  borrarPlantilla,
  darDeBaja,
  emailsDeLeads,
  enlazarLead,
  enviadosDesde,
  guardarProspectos,
  listarProspectos,
  listarSuprimidos,
  marcarEstado,
  marcarPorResendId,
  prospectosPorIds,
  reclamarParaEnvio,
} from "../db";

/** Cadena de supabase-js de mentira: cada método devuelve la misma cadena y
 *  al hacer `await` resuelve con `resultado`. */
function cadena(resultado: { data?: unknown; error?: { message: string } | null; count?: number }) {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "upsert", "insert", "delete", "select", "eq", "in", "gte", "order", "limit", "range", "ilike", "not"]) {
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

  test("si la inserción falla devuelve null, no un cero que parecería «todas repetidas»", async () => {
    fromMock.mockReturnValue(cadena({ data: null, error: { message: "relation does not exist" } }));
    const fila = { source: "places" as const, external_id: "x", name: "Uno", sector: null, address: null, city: null, province: null, phone: null, website: null, rating: null, reviews: null };
    expect(await guardarProspectos("s1", [fila])).toBeNull();
  });
});

describe("prospectosPorIds", () => {
  test("pide los ids de 100 en 100 y junta las filas", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `p${i}`);
    const cadenas = [cadena({ data: [{ id: "a" }] }), cadena({ data: [{ id: "b" }] }), cadena({ data: [{ id: "c" }] })];
    for (const c of cadenas) fromMock.mockReturnValueOnce(c);
    expect((await prospectosPorIds(ids)).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(fromMock).toHaveBeenCalledTimes(3);
    expect(cadenas[0].in).toHaveBeenCalledWith("id", ids.slice(0, 100));
    expect(cadenas[2].in).toHaveBeenCalledWith("id", ids.slice(200));
  });
});

describe("listarProspectos", () => {
  const pagina = (n: number, desde: number) => Array.from({ length: n }, (_, i) => ({ id: `p${desde + i}` }));

  test("lee de 1000 en 1000, las más recientes primero y en orden estable", async () => {
    const cadenas = [cadena({ data: pagina(1000, 0) }), cadena({ data: pagina(200, 1000) }), cadena({ data: [] })];
    for (const c of cadenas) fromMock.mockReturnValueOnce(c);
    expect(await listarProspectos()).toHaveLength(1200);
    expect(cadenas[0].order).toHaveBeenNthCalledWith(1, "created_at", { ascending: false });
    expect(cadenas[0].order).toHaveBeenNthCalledWith(2, "id");
    expect(cadenas[0].range).toHaveBeenCalledWith(0, 999);
    expect(cadenas[1].range).toHaveBeenCalledWith(1000, 1999);
    expect(cadenas[2].range).toHaveBeenCalledWith(1200, 2199);
  });

  test("se detiene en 5000 filas", async () => {
    fromMock.mockImplementation(() => cadena({ data: pagina(1000, 0) }));
    expect(await listarProspectos()).toHaveLength(5000);
    expect(fromMock).toHaveBeenCalledTimes(5);
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

  test("devuelve cuántas filas cambió de verdad", async () => {
    const c = cadena({ data: [{ id: "a" }] });
    fromMock.mockReturnValue(c);
    expect(await marcarEstado(["a", "b"], "descartado", ["listo"])).toBe(1);
    expect(c.select).toHaveBeenCalledWith("id");
  });

  test("parte 250 ids en 3 llamadas y suma lo cambiado", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `p${i}`);
    const filas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `x${i}` }));
    const cadenas = [cadena({ data: filas(100) }), cadena({ data: filas(70) }), cadena({ data: filas(50) })];
    for (const c of cadenas) fromMock.mockReturnValueOnce(c);
    expect(await marcarEstado(ids, "descartado", ["listo"])).toBe(220);
    expect(fromMock).toHaveBeenCalledTimes(3);
    expect(cadenas[0].in).toHaveBeenCalledWith("id", ids.slice(0, 100));
    expect(cadenas[1].in).toHaveBeenCalledWith("id", ids.slice(100, 200));
    expect(cadenas[2].in).toHaveBeenCalledWith("id", ids.slice(200));
    for (const c of cadenas) expect(c.in).toHaveBeenCalledWith("status", ["listo"]);
  });

  test("devuelve null si un trozo falla", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `p${i}`);
    fromMock
      .mockReturnValueOnce(cadena({ data: [{ id: "a" }] }))
      .mockReturnValueOnce(cadena({ data: null, error: { message: "boom" } }))
      .mockReturnValueOnce(cadena({ data: [{ id: "c" }] }));
    expect(await marcarEstado(ids, "descartado")).toBeNull();
  });

  test("sin ids no toca la base", async () => {
    expect(await marcarEstado([], "descartado")).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("enlazarLead", () => {
  test("solo enlaza una fila a la que ya se le escribió", async () => {
    const c = cadena({});
    fromMock.mockReturnValue(c);
    await enlazarLead("p1", "lead1");
    expect(c.update).toHaveBeenCalledWith({ lead_id: "lead1", status: "respondido" });
    expect(c.eq).toHaveBeenCalledWith("id", "p1");
    expect(c.in).toHaveBeenCalledWith("status", ["enviado", "respondido"]);
  });
});

describe("borrarPlantilla", () => {
  test("dice si se pudo borrar", async () => {
    fromMock.mockReturnValueOnce(cadena({}));
    expect(await borrarPlantilla("t1")).toBe(true);
    fromMock.mockReturnValueOnce(cadena({ error: { message: "boom" } }));
    expect(await borrarPlantilla("t1")).toBe(false);
  });
});

describe("lecturas que fallan en cerrado", () => {
  test("listarSuprimidos lee todas las páginas, en minúsculas", async () => {
    const llena = Array.from({ length: 1000 }, (_, i) => ({ value: `x${i}@a.es` }));
    const cadenas = [cadena({ data: llena }), cadena({ data: [{ value: "Ultimo@B.es" }] }), cadena({ data: [] })];
    for (const c of cadenas) fromMock.mockReturnValueOnce(c);
    const r = await listarSuprimidos();
    expect(r?.size).toBe(1001);
    expect(r?.has("ultimo@b.es")).toBe(true);
    expect(fromMock).toHaveBeenCalledTimes(3);
    expect(cadenas[2].range).toHaveBeenCalledWith(1001, 2000);
  });

  // Si el servidor recorta las páginas por debajo de 1000, una página corta no
  // es la última: parar ahí dejaría fuera parte de la lista de bajas.
  test("una página corta no es el final: sigue hasta una vacía, sin saltarse filas", async () => {
    const corta = (desde: number) => Array.from({ length: 500 }, (_, i) => ({ value: `x${desde + i}@a.es` }));
    const cadenas = [cadena({ data: corta(0) }), cadena({ data: corta(500) }), cadena({ data: [{ value: "fin@a.es" }] }), cadena({ data: [] })];
    for (const c of cadenas) fromMock.mockReturnValueOnce(c);
    const r = await listarSuprimidos();
    expect(r?.size).toBe(1001);
    expect(r?.has("fin@a.es")).toBe(true);
    expect(cadenas[1].range).toHaveBeenCalledWith(500, 1499);
    expect(cadenas[2].range).toHaveBeenCalledWith(1000, 1999);
  });

  test("si falla una página posterior, no devuelve una lista a medias", async () => {
    const llena = Array.from({ length: 1000 }, (_, i) => ({ value: `x${i}@a.es` }));
    fromMock
      .mockReturnValueOnce(cadena({ data: llena }))
      .mockReturnValueOnce(cadena({ data: null, error: { message: "boom" } }));
    expect(await listarSuprimidos()).toBeNull();
  });

  test("devuelven null si la consulta falla", async () => {
    fromMock.mockReturnValue(cadena({ error: { message: "boom" } }));
    expect(await listarSuprimidos()).toBeNull();
    expect(await emailsDeLeads()).toBeNull();
    expect(await enviadosDesde(new Date())).toBeNull();
  });
});

describe("darDeBaja", () => {
  test("marca la baja y veta el email", async () => {
    const leer = cadena({ data: [{ email: "Info@Bar.es" }] });
    const marcar = cadena({});
    const vetar = cadena({});
    fromMock.mockReturnValueOnce(leer).mockReturnValueOnce(marcar).mockReturnValueOnce(vetar);
    expect(await darDeBaja("p1")).toBe(true);
    expect(marcar.update).toHaveBeenCalledWith({ status: "baja" });
    expect(marcar.eq).toHaveBeenCalledWith("id", "p1");
    expect(vetar.upsert).toHaveBeenCalledWith(
      [{ value: "info@bar.es", kind: "email", reason: "baja" }],
      expect.anything(),
    );
  });

  test("un prospecto que ya no existe cuenta como baja hecha", async () => {
    fromMock.mockReturnValueOnce(cadena({ data: [] }));
    expect(await darDeBaja("p1")).toBe(true);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  test("si no se puede leer, marcar o vetar, devuelve false", async () => {
    const fallo = { error: { message: "caída" } };
    fromMock.mockReturnValueOnce(cadena(fallo));
    expect(await darDeBaja("p1")).toBe(false);

    fromMock.mockReset();
    fromMock.mockReturnValueOnce(cadena({ data: [{ email: "a@b.es" }] })).mockReturnValueOnce(cadena(fallo));
    expect(await darDeBaja("p1")).toBe(false);

    fromMock.mockReset();
    fromMock
      .mockReturnValueOnce(cadena({ data: [{ email: "a@b.es" }] }))
      .mockReturnValueOnce(cadena({}))
      .mockReturnValueOnce(cadena(fallo));
    expect(await darDeBaja("p1")).toBe(false);
  });
});
