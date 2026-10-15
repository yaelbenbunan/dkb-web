import { beforeEach, describe, expect, test, vi } from "vitest";

const { rpcMock, fromMock, authAdmin } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  authAdmin: { createUser: vi.fn(), deleteUser: vi.fn(), updateUserById: vi.fn(), listUsers: vi.fn() },
}));

vi.mock("../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock, from: fromMock, auth: { admin: authAdmin } }),
}));

import { crearLeadWeb, buscarLeadWeb, actualizarLeadWeb, listarLeadsEmailables, actualizarEmailPorMensaje, crearLeads, registrarActividad, crearUsuariaCompleta, listLeads, listSecuencias, listUltimasNotas, actualizarTarea, crearTarea, listSeguimientosUsuaria, listTareasUsuaria } from "../ventas/db";

const LEAD = { negocio: "Gym", tipo_negocio: null, contacto: "", telefono: "600111222", email: "", ciudad: "", cif: "", web: "", excluido: false };

describe("crearLeads", () => {
  beforeEach(() => rpcMock.mockReset());

  test("llama a la RPC con los nombres de parámetro de la migración", async () => {
    rpcMock.mockResolvedValue({ data: 1, error: null });
    const r = await crearLeads({ marcaId: "m1", usuariaId: "u1", origen: "lista", origenDetalle: "Gimnasios", leads: [LEAD] });
    expect(r).toEqual({ ok: true, creados: 1 });
    expect(rpcMock).toHaveBeenCalledWith("ventas_crear_leads", {
      p_marca_id: "m1",
      p_usuaria_id: "u1",
      p_origen: "lista",
      p_origen_detalle: "Gimnasios",
      p_leads: [LEAD],
    });
  });

  test("un error de la RPC no se da por bueno", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await crearLeads({ marcaId: "m1", usuariaId: null, origen: "anuncio", origenDetalle: null, leads: [LEAD] })).toEqual({ ok: false, error: "boom" });
  });
});

describe("registrarActividad", () => {
  beforeEach(() => rpcMock.mockReset().mockResolvedValue({ data: "contactado", error: null }));

  test("sin proximoSeguimiento no toca el seguimiento", async () => {
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "nota", nota: "Hola" });
    expect(rpcMock).toHaveBeenCalledWith("ventas_registrar_actividad", {
      p_lead_id: "l1",
      p_usuaria_id: "u1",
      p_tipo: "nota",
      p_resultado: null,
      p_nota: "Hola",
      p_fase_nueva: null,
      p_cambiar_seguimiento: false,
      p_proximo_seguimiento: null,
    });
  });

  test("la hora viaja con la fecha y se borra con ella", async () => {
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "nota", nota: "x", proximoSeguimiento: "2026-10-20", proximoSeguimientoHora: "16:30" });
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_cambiar_seguimiento: true, p_proximo_seguimiento: "2026-10-20", p_proximo_seguimiento_hora: "16:30" });
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "nota", nota: "x", proximoSeguimiento: null });
    // Al borrar el seguimiento la hora no se manda: el `default null` de la función la borra.
    expect(rpcMock.mock.calls[1][1]).toMatchObject({ p_proximo_seguimiento: null });
    expect(rpcMock.mock.calls[1][1]).not.toHaveProperty("p_proximo_seguimiento_hora");
  });

  test("sin hora no manda el parámetro nuevo: vale también con la función de ocho parámetros", async () => {
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "llamada", nota: "", proximoSeguimiento: "2026-10-20" });
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_cambiar_seguimiento: true, p_proximo_seguimiento: "2026-10-20" });
    expect(rpcMock.mock.calls[0][1]).not.toHaveProperty("p_proximo_seguimiento_hora");
  });

  test("proximoSeguimiento null borra el seguimiento", async () => {
    await registrarActividad({ leadId: "l1", usuariaId: "u1", tipo: "llamada", resultado: "no_interesa", faseNueva: "no_interesa", proximoSeguimiento: null });
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_cambiar_seguimiento: true, p_proximo_seguimiento: null, p_fase_nueva: "no_interesa" });
  });
});

describe("crearUsuariaCompleta", () => {
  beforeEach(() => {
    authAdmin.createUser.mockReset();
    authAdmin.deleteUser.mockReset().mockResolvedValue({ error: null });
    fromMock.mockReset();
  });

  test("si falla el perfil, borra la cuenta de Auth para no dejarla huérfana", async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: { id: "u9" } }, error: null });
    fromMock.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { message: "dup" } }) });
    const r = await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial", marca_id: null });
    expect(r.ok).toBe(false);
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("u9");
  });

  const YA_EXISTE = { data: { user: null }, error: { message: "A user with this email address has already been registered" } };

  test("email ya usado por un usuario de ventas: mensaje claro", async () => {
    authAdmin.createUser.mockResolvedValue(YA_EXISTE);
    authAdmin.listUsers.mockResolvedValue({ data: { users: [{ id: "u5", email: "p@d.com" }] }, error: null });
    fromMock.mockReturnValue(cadena({ data: { id: "u5" }, error: null }).q);
    expect(await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial", marca_id: null })).toEqual({
      ok: false,
      error: "Ya existe un usuario con ese email.",
    });
    expect(authAdmin.updateUserById).not.toHaveBeenCalled();
  });

  test("login que ya existía sin perfil de ventas (otra herramienta): se le crea el perfil y se le pone la contraseña", async () => {
    authAdmin.createUser.mockResolvedValue(YA_EXISTE);
    authAdmin.listUsers.mockResolvedValue({ data: { users: [{ id: "otro", email: "x@d.com" }, { id: "u7", email: "P@d.com" }] }, error: null });
    authAdmin.updateUserById.mockReset().mockResolvedValue({ error: null });
    const sinPerfil = cadena({ data: null, error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValueOnce(sinPerfil.q).mockReturnValueOnce({ insert });
    expect(await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial", marca_id: null })).toEqual({ ok: true, id: "u7" });
    expect(authAdmin.updateUserById).toHaveBeenCalledWith("u7", { password: "1234567890", email_confirm: true });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id: "u7", email: "p@d.com", rol: "comercial" }));
  });
});

describe("listLeads", () => {
  test("pagina de 1000 en 1000 hasta agotar", async () => {
    const pagina = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
    const range = vi.fn().mockResolvedValueOnce({ data: pagina(1000), error: null }).mockResolvedValueOnce({ data: pagina(3), error: null });
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => ({ range }));
    fromMock.mockReset().mockReturnValue(builder);
    const leads = await listLeads("m1");
    expect(leads).toHaveLength(1003);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});

describe("listSecuencias", () => {
  test("trae los anuncios que sirve cada secuencia", async () => {
    // Sin esta columna, elegirSecuencia no puede distinguir la campaña de
    // psicología de la de dental y todos los leads caerían en la misma.
    const range = vi.fn().mockResolvedValueOnce({ data: [{ id: "s1", anuncios: ["120252112386740343"] }], error: null });
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => ({ range }));
    fromMock.mockReset().mockReturnValue(builder);
    const filas = await listSecuencias("m1");
    expect(filas[0].anuncios).toEqual(["120252112386740343"]);
  });
});

describe("listUltimasNotas", () => {
  test("devuelve un mapa por lead y pagina", async () => {
    const range = vi.fn().mockResolvedValue({
      data: [
        { lead_id: "l1", nota: "Llamar el martes", created_at: "2026-10-05T09:00:00Z" },
        { lead_id: "l2", nota: "Pide catálogo", created_at: "2026-10-06T09:00:00Z" },
      ],
      error: null,
    });
    const order = vi.fn(() => ({ range }));
    rpcMock.mockReset().mockReturnValue({ order });
    const notas = await listUltimasNotas("m1");
    expect(rpcMock).toHaveBeenCalledWith("ventas_ultimas_notas", { p_marca_id: "m1" });
    expect(notas.get("l1")).toEqual({ texto: "Llamar el martes", fecha: "2026-10-05T09:00:00Z" });
    expect(notas.size).toBe(2);
  });
});

describe("actualizarTarea", () => {
  function conUpdate() {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    fromMock.mockReset().mockReturnValue({ update });
    return { update, eq };
  }

  test("marcar hecha escribe cuándo y quién", async () => {
    const { update, eq } = conUpdate();
    expect(await actualizarTarea("t1", { hecha: { por: "u1" } })).toEqual({ ok: true });
    const fila = (update.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(fila.hecha_por).toBe("u1");
    expect(typeof fila.hecha_at).toBe("string");
    expect(fila).not.toHaveProperty("asignada_a");
    expect(eq).toHaveBeenCalledWith("id", "t1");
  });

  test("deshacer pone cuándo y quién a null", async () => {
    const { update } = conUpdate();
    await actualizarTarea("t1", { hecha: null });
    expect(update).toHaveBeenCalledWith({ hecha_at: null, hecha_por: null });
  });

  test("reasignar solo toca asignada_a", async () => {
    const { update } = conUpdate();
    await actualizarTarea("t1", { asignadaA: "u2" });
    expect(update).toHaveBeenCalledWith({ asignada_a: "u2" });
    await actualizarTarea("t1", { asignadaA: null });
    expect(update).toHaveBeenLastCalledWith({ asignada_a: null });
  });
});

describe("orden de «Mi día»", () => {
  // Cada consulta encadena filtros y order; devolvemos un builder que lo apunta todo.
  function builderQueRegistraOrder() {
    const order = vi.fn();
    const b: Record<string, unknown> = {};
    for (const f of ["select", "eq", "lte", "in", "is", "not"]) b[f] = vi.fn(() => b);
    b.order = order.mockImplementation(() => b);
    b.range = vi.fn().mockResolvedValue({ data: [], error: null });
    fromMock.mockReset().mockReturnValue(b);
    return order;
  }

  test("los seguimientos van por fecha y luego por hora, con las sin hora al final", async () => {
    const order = builderQueRegistraOrder();
    await listSeguimientosUsuaria("u1", "2026-10-10");
    expect(order.mock.calls).toEqual([["proximo_seguimiento"], ["proximo_seguimiento_hora", { ascending: true, nullsFirst: false }]]);
  });

  test("las tareas van por fecha y luego por hora, con las sin hora al final", async () => {
    const order = builderQueRegistraOrder();
    await listTareasUsuaria("u1");
    expect(order.mock.calls).toEqual([["vence"], ["vence_hora", { ascending: true, nullsFirst: false }]]);
  });
});

describe("lecturas que dependen de una migración pendiente", () => {
  const FALTA_FUNCION = { message: "Could not find the function public.ventas_ultimas_notas", code: "PGRST202" };
  const FALTA_TABLA = { message: "Could not find the table 'public.ventas_tareas'", code: "PGRST205" };
  const FALTA_COLUMNA = { message: "column ventas_leads.proximo_seguimiento_hora does not exist", code: "42703" };

  /** Consulta encadenable cuyo `range` resuelve lo indicado; guarda las llamadas a `order`. */
  function consulta(resultado: { data: unknown; error: unknown }) {
    const ordenes: unknown[][] = [];
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "lte", "in", "is", "not"]) q[m] = vi.fn(() => q);
    q.order = vi.fn((...args: unknown[]) => {
      ordenes.push(args);
      return q;
    });
    q.range = vi.fn().mockResolvedValue(resultado);
    return { q, ordenes };
  }

  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

  test("sin la función de notas, el tablero se queda sin notas en vez de fallar", async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: FALTA_FUNCION });
    rpcMock.mockReset().mockReturnValue({ order: vi.fn(() => ({ range })) });
    expect((await listUltimasNotas("m1")).size).toBe(0);
  });

  test("un fallo que no es de migración sí se lanza", async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: "timeout", code: "57014" } });
    rpcMock.mockReset().mockReturnValue({ order: vi.fn(() => ({ range })) });
    await expect(listUltimasNotas("m1")).rejects.toThrow("timeout");
  });

  test("sin la tabla de tareas, Mi día no enseña tareas en vez de fallar", async () => {
    fromMock.mockReset().mockReturnValue(consulta({ data: null, error: FALTA_TABLA }).q);
    expect(await listTareasUsuaria("u1")).toEqual([]);
  });

  test("sin la columna de la hora, los seguimientos se leen ordenados solo por fecha", async () => {
    const primera = consulta({ data: null, error: FALTA_COLUMNA });
    const segunda = consulta({ data: [{ id: "l1" }], error: null });
    fromMock.mockReset().mockReturnValueOnce(primera.q).mockReturnValueOnce(segunda.q);
    expect(await listSeguimientosUsuaria("u1", "2026-10-20")).toEqual([{ id: "l1" }]);
    expect(primera.ordenes.map((o) => o[0])).toEqual(["proximo_seguimiento", "proximo_seguimiento_hora"]);
    expect(segunda.ordenes.map((o) => o[0])).toEqual(["proximo_seguimiento"]);
  });
});

describe("crearUsuariaCompleta y la marca", () => {
  function conInsert() {
    const insert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReset().mockReturnValue({ insert });
    authAdmin.createUser.mockReset().mockResolvedValue({ data: { user: { id: "u9" } }, error: null });
    return insert;
  }
  const BASE = { nombre: "Ana", email: "ana@x.es", password: "1234567890ab" };

  test("una comercial se inserta sin la columna de marca", async () => {
    const insert = conInsert();
    await crearUsuariaCompleta({ ...BASE, rol: "comercial", marca_id: null });
    expect(insert.mock.calls[0][0]).not.toHaveProperty("marca_id");
  });

  test("si la base rechaza a la clienta por faltar la migración, se dice y se deshace la cuenta", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "violates check constraint", code: "23514" } });
    fromMock.mockReset().mockReturnValue({ insert });
    authAdmin.createUser.mockReset().mockResolvedValue({ data: { user: { id: "u9" } }, error: null });
    authAdmin.deleteUser.mockReset().mockResolvedValue({ error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await crearUsuariaCompleta({ ...BASE, rol: "cliente", marca_id: "m1" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain("falta ejecutar en Supabase la migración");
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("u9");
  });

  test("una clienta se inserta con su marca", async () => {
    const insert = conInsert();
    await crearUsuariaCompleta({ ...BASE, rol: "cliente", marca_id: "m1" });
    expect(insert.mock.calls[0][0]).toMatchObject({ rol: "cliente", marca_id: "m1" });
  });
});

describe("crearTarea", () => {
  const TAREA = { marcaId: "m1", leadId: null, titulo: "Mandar catálogo", vence: null, venceHora: null, asignadaA: null, creadaPor: "u1" };
  const insert = vi.fn();
  beforeEach(() => {
    insert.mockReset().mockResolvedValue({ error: null });
    fromMock.mockReset().mockReturnValue({ insert });
  });

  test("con notas, las guarda", async () => {
    expect(await crearTarea({ ...TAREA, notas: "El de 2026" })).toEqual({ ok: true });
    expect(insert.mock.calls[0][0]).toMatchObject({ titulo: "Mandar catálogo", notas: "El de 2026" });
  });

  test("sin notas no manda la columna: la tarea se crea aunque falte la migración", async () => {
    await crearTarea({ ...TAREA, notas: null });
    expect(insert.mock.calls[0][0]).not.toHaveProperty("notas");
  });

  test("con notas y sin la columna en la base: dice qué migración falta", async () => {
    insert.mockResolvedValue({ error: { message: "Could not find the 'notas' column", code: "PGRST204" } });
    const r = await crearTarea({ ...TAREA, notas: "x" });
    expect(r).toEqual({ ok: false, error: "Para guardar notas en las tareas falta ejecutar en Supabase docs/sql/2026-10-13-ventas-tareas-notas.sql." });
  });
});

/** Constructor encadenable: cada método devuelve el mismo objeto y el resultado
 *  sale de `maybeSingle`, `range` o de esperar el propio objeto. */
function cadena(resultado: { data: unknown; error: unknown }) {
  const llamadas: [string, unknown[]][] = [];
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "contains", "is", "neq", "in", "not", "or", "order", "update", "limit"]) {
    q[m] = vi.fn((...args: unknown[]) => {
      llamadas.push([m, args]);
      return q;
    });
  }
  q.maybeSingle = vi.fn().mockResolvedValue(resultado);
  q.range = vi.fn().mockResolvedValue(resultado);
  q.then = (ok: (v: unknown) => unknown) => Promise.resolve(resultado).then(ok);
  return { q, llamadas };
}

describe("crearLeadWeb", () => {
  test("llama a ventas_crear_lead con el lead entero y devuelve el id", async () => {
    rpcMock.mockReset().mockResolvedValue({ data: "uuid-1", error: null });
    const r = await crearLeadWeb("m1", { negocio: "Clínica Sol", email: "a@b.es", origen: "web", canal: "Meta", etiquetas: ["kit-digital"] });
    expect(r).toEqual({ ok: true, id: "uuid-1" });
    expect(rpcMock).toHaveBeenCalledWith("ventas_crear_lead", { p_marca_id: "m1", p_lead: expect.objectContaining({ negocio: "Clínica Sol", canal: "Meta", etiquetas: ["kit-digital"] }) });
  });

  test("sin la RPC (migración pendiente) lo dice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpcMock.mockReset().mockResolvedValue({ data: null, error: { message: "not found", code: "PGRST202" } });
    expect(await crearLeadWeb("m1", { negocio: "X", origen: "web" })).toEqual({ ok: false, error: expect.any(String), faltaMigracion: true });
  });

  test("choque con un lead existente: ok false «duplicado»", async () => {
    rpcMock.mockReset().mockResolvedValue({ data: null, error: null });
    expect(await crearLeadWeb("m1", { negocio: "X", origen: "web" })).toEqual({ ok: false, error: "duplicado" });
  });
});

describe("buscarLeadWeb", () => {
  test("un uuid se busca por id; si no está, por id_externo", async () => {
    const porId = cadena({ data: null, error: null });
    const porExterno = cadena({ data: { id: "v1" }, error: null });
    fromMock.mockReset().mockReturnValueOnce(porId.q).mockReturnValueOnce(porExterno.q);
    const uuid = "0b7c3f7e-1d2a-4c55-9a8e-2b2f1c9d0e11";
    expect(await buscarLeadWeb("m1", { id: uuid })).toEqual({ id: "v1" });
    expect(porId.llamadas).toContainEqual(["eq", ["id", uuid]]);
    expect(porExterno.llamadas).toContainEqual(["eq", ["id_externo", uuid]]);
  });

  test("un id viejo (no uuid) no se busca por id; prueba id_externo y luego ids_externos", async () => {
    const porExterno = cadena({ data: null, error: null });
    const porLista = cadena({ data: { id: "v2" }, error: null });
    fromMock.mockReset().mockReturnValueOnce(porExterno.q).mockReturnValueOnce(porLista.q);
    expect(await buscarLeadWeb("m1", { id: "prev-123" })).toEqual({ id: "v2" });
    expect(porLista.llamadas).toContainEqual(["contains", ["ids_externos", ["prev-123"]]]);
  });

  test("por email normalizado y por teléfono normalizado", async () => {
    const porEmail = cadena({ data: null, error: null });
    const porTel = cadena({ data: { id: "v3" }, error: null });
    fromMock.mockReset().mockReturnValueOnce(porEmail.q).mockReturnValueOnce(porTel.q);
    expect(await buscarLeadWeb("m1", { email: " ANA@x.es ", telefono: "+34 600 11 22 33" })).toEqual({ id: "v3" });
    expect(porEmail.llamadas).toContainEqual(["eq", ["email_norm", "ana@x.es"]]);
    expect(porTel.llamadas.some(([m, a]) => m === "eq" && a[0] === "telefono_norm")).toBe(true);
  });

  test("sin la columna id_externo (migración pendiente) sigue por email", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const falla = cadena({ data: null, error: { message: "column does not exist", code: "42703" } });
    const fallaLista = cadena({ data: null, error: { message: "column does not exist", code: "42703" } });
    const porEmail = cadena({ data: { id: "v4" }, error: null });
    fromMock.mockReset().mockReturnValueOnce(falla.q).mockReturnValueOnce(fallaLista.q).mockReturnValueOnce(porEmail.q);
    expect(await buscarLeadWeb("m1", { id: "old-1", email: "a@x.es" })).toEqual({ id: "v4" });
  });

  test("sin criterios no consulta", async () => {
    fromMock.mockReset();
    expect(await buscarLeadWeb("m1", {})).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("actualizarLeadWeb", () => {
  test("actualiza solo los campos dados", async () => {
    const c = cadena({ data: null, error: null });
    fromMock.mockReset().mockReturnValue(c.q);
    expect(await actualizarLeadWeb("v1", { consentimiento: false, canal: "Meta" })).toEqual({ ok: true });
    expect(c.llamadas).toContainEqual(["update", [{ consentimiento: false, canal: "Meta" }]]);
    expect(c.llamadas).toContainEqual(["eq", ["id", "v1"]]);
  });
});

describe("listLeads con filtros nuevos", () => {
  test("oculta los archivados por defecto", async () => {
    const c = cadena({ data: [], error: null });
    fromMock.mockReset().mockReturnValue(c.q);
    await listLeads("m1");
    expect(c.llamadas).toContainEqual(["eq", ["archivado", false]]);
  });

  test("con archivados: solo los archivados", async () => {
    const c = cadena({ data: [], error: null });
    fromMock.mockReset().mockReturnValue(c.q);
    await listLeads("m1", { archivados: true });
    expect(c.llamadas).toContainEqual(["eq", ["archivado", true]]);
  });

  test("sin la columna archivado (migración pendiente) lista sin ese filtro", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const falla = cadena({ data: null, error: { message: "column does not exist", code: "42703" } });
    const bien = cadena({ data: [{ id: "l1" }], error: null });
    fromMock.mockReset().mockReturnValueOnce(falla.q).mockReturnValueOnce(bien.q);
    expect(await listLeads("m1")).toEqual([{ id: "l1" }]);
    expect(bien.llamadas.some(([, a]) => a[0] === "archivado")).toBe(false);
  });
});

describe("campañas sobre ventas", () => {
  test("emailables: consentimiento, sin archivar, con email y sin rebote ni queja, más los filtros", async () => {
    const c = cadena({ data: [], error: null });
    fromMock.mockReset().mockReturnValue(c.q);
    await listarLeadsEmailables("m1", { fase: "interesado", canal: "Meta" });
    expect(c.llamadas).toContainEqual(["eq", ["consentimiento", true]]);
    expect(c.llamadas).toContainEqual(["eq", ["archivado", false]]);
    expect(c.llamadas).toContainEqual(["not", ["email", "is", null]]);
    expect(c.llamadas).toContainEqual(["or", ["email_estado.is.null,email_estado.not.in.(bounced,complained)"]]);
    expect(c.llamadas).toContainEqual(["eq", ["fase", "interesado"]]);
    expect(c.llamadas).toContainEqual(["eq", ["canal", "Meta"]]);
  });

  test("estado por mensaje devuelve cuántos cambió", async () => {
    const c = cadena({ data: [{ id: "v1" }], error: null });
    fromMock.mockReset().mockReturnValue(c.q);
    expect(await actualizarEmailPorMensaje("re_1", { email_estado: "delivered" })).toBe(1);
    expect(c.llamadas).toContainEqual(["eq", ["email_mensaje_id", "re_1"]]);
  });
});
