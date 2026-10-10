import { beforeEach, describe, expect, test, vi } from "vitest";

const { getUserMock, getUsuariaMock, getMarcaPorSlugMock, redirectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getUsuariaMock: vi.fn(),
  getMarcaPorSlugMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: getUserMock } }) }));
vi.mock("../ventas/db", () => ({ getUsuaria: getUsuariaMock, getMarcaPorSlug: getMarcaPorSlugMock }));

import { requireUsuaria, getUsuariaActual, accesoMarcaAccion, requireAccesoMarca } from "../ventas/auth";

const ACTIVA = { marca_id: null, id: "u1", nombre: "Paula", email: "p@d.com", rol: "comercial", activa: true, created_at: "" };

describe("requireUsuaria", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    getUserMock.mockReset();
    getUsuariaMock.mockReset();
    redirectMock.mockClear();
  });

  test("sin sesión redirige al login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(requireUsuaria()).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/login");
  });

  test("sesión válida pero sin perfil activo redirige al login", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    getUsuariaMock.mockResolvedValue({ ...ACTIVA, activa: false });
    await expect(requireUsuaria()).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/login");
  });

  test("una comercial no pasa donde se pide admin", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    getUsuariaMock.mockResolvedValue(ACTIVA);
    await expect(requireUsuaria("admin")).rejects.toThrow("NEXT_REDIRECT:/panel/ventas?aviso=permiso");
  });

  test("devuelve la usuaria cuando todo cuadra", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    getUsuariaMock.mockResolvedValue(ACTIVA);
    await expect(requireUsuaria()).resolves.toEqual(ACTIVA);
  });

  test("sin clave publicable no hay sesión posible", async () => {
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    await expect(getUsuariaActual()).resolves.toBeNull();
  });
});

function sesionDe(usuaria: Record<string, unknown>) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuaria.id } } });
  getUsuariaMock.mockResolvedValue({ ...ACTIVA, ...usuaria });
}

describe("helpers por marca", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    getUserMock.mockReset();
    getUsuariaMock.mockReset();
    getMarcaPorSlugMock.mockReset();
    redirectMock.mockClear();
  });

  describe("accesoMarcaAccion", () => {
    test("clienta en su marca y sección permitida: ok", async () => {
      sesionDe({ id: "u1", rol: "cliente", activa: true, marca_id: "m1" });
      getMarcaPorSlugMock.mockResolvedValue({ id: "m1", slug: "hydrup" });
      expect(await accesoMarcaAccion("hydrup", "leads")).toMatchObject({ ok: true });
    });
    test("clienta en marca ajena: error, sin redirigir", async () => {
      sesionDe({ id: "u1", rol: "cliente", activa: true, marca_id: "m1" });
      getMarcaPorSlugMock.mockResolvedValue({ id: "m2", slug: "dinkbit" });
      expect(await accesoMarcaAccion("dinkbit", "leads")).toEqual({ ok: false, error: "No tienes permiso para esto." });
    });
    test("marca que no existe: error", async () => {
      sesionDe({ id: "u1", rol: "admin", activa: true, marca_id: null });
      getMarcaPorSlugMock.mockResolvedValue(null);
      expect(await accesoMarcaAccion("nada", "leads")).toEqual({ ok: false, error: "Marca no encontrada." });
    });
  });

  describe("requireAccesoMarca", () => {
    test("clienta en sección prohibida: redirige al panel con aviso", async () => {
      sesionDe({ id: "u1", rol: "cliente", activa: true, marca_id: "m1" });
      getMarcaPorSlugMock.mockResolvedValue({ id: "m1", slug: "hydrup" });
      await expect(requireAccesoMarca("hydrup", "condiciones")).rejects.toThrow("NEXT_REDIRECT:/panel/ventas?aviso=permiso");
    });
  });
});
