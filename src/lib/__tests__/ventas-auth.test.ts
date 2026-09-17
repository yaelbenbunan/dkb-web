import { beforeEach, describe, expect, test, vi } from "vitest";

const { getUserMock, getUsuariaMock, redirectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  getUsuariaMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: getUserMock } }) }));
vi.mock("../ventas/db", () => ({ getUsuaria: getUsuariaMock }));

import { requireUsuaria, getUsuariaActual } from "../ventas/auth";

const ACTIVA = { id: "u1", nombre: "Paula", email: "p@d.com", rol: "comercial", activa: true, created_at: "" };

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
