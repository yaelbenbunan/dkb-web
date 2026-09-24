import { beforeEach, describe, expect, test, vi } from "vitest";

const { rpcMock, fromMock, authAdmin } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  authAdmin: { createUser: vi.fn(), deleteUser: vi.fn(), updateUserById: vi.fn() },
}));

vi.mock("../supabase-admin", () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock, from: fromMock, auth: { admin: authAdmin } }),
}));

import { crearLeads, registrarActividad, crearUsuariaCompleta, listLeads, listSecuencias } from "../ventas/db";

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
    const r = await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial" });
    expect(r.ok).toBe(false);
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("u9");
  });

  test("email repetido en Auth da un mensaje claro", async () => {
    authAdmin.createUser.mockResolvedValue({ data: { user: null }, error: { message: "A user with this email address has already been registered" } });
    expect(await crearUsuariaCompleta({ nombre: "Paula", email: "p@d.com", password: "1234567890", rol: "comercial" })).toEqual({
      ok: false,
      error: "Ya existe una cuenta con ese email.",
    });
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
