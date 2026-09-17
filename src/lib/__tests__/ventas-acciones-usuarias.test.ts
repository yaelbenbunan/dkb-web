import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  crearUsuariaCompleta: vi.fn(),
  setUsuariaActiva: vi.fn(),
  setPasswordUsuaria: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  crearUsuariaCompleta: m.crearUsuariaCompleta,
  setUsuariaActiva: m.setUsuariaActiva,
  setPasswordUsuaria: m.setPasswordUsuaria,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { crearUsuariaAction, setUsuariaActivaAction, cambiarPasswordAction } from "@/app/(site)/panel/ventas/acciones-usuarias";

const ADMIN = { id: "a1", rol: "admin", activa: true };

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

describe("acciones de usuarias", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.requireUsuaria.mockResolvedValue(ADMIN);
    m.crearUsuariaCompleta.mockResolvedValue({ ok: true, id: "u2" });
    m.setUsuariaActiva.mockResolvedValue({ ok: true });
    m.setPasswordUsuaria.mockResolvedValue({ ok: true });
  });

  test("todas exigen rol admin y no tocan nada si se deniega", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearUsuariaAction(null, fd({ nombre: "P", email: "p@d.com", password: "1234567890", rol: "comercial" }))).rejects.toThrow();
    await expect(setUsuariaActivaAction("u2", false)).rejects.toThrow();
    await expect(cambiarPasswordAction("u2", "1234567890")).rejects.toThrow();
    expect(m.requireUsuaria).toHaveBeenCalledWith("admin");
    expect(m.crearUsuariaCompleta).not.toHaveBeenCalled();
    expect(m.setUsuariaActiva).not.toHaveBeenCalled();
    expect(m.setPasswordUsuaria).not.toHaveBeenCalled();
  });

  test("crea la usuaria con los datos validados", async () => {
    const r = await crearUsuariaAction(null, fd({ nombre: "Paula", email: "Paula@Dinkbit.com", password: "1234567890", rol: "comercial" }));
    expect(r.ok).toBe(true);
    expect(m.crearUsuariaCompleta).toHaveBeenCalledWith({ nombre: "Paula", email: "paula@dinkbit.com", password: "1234567890", rol: "comercial" });
  });

  test("una admin no puede desactivarse a sí misma", async () => {
    expect(await setUsuariaActivaAction("a1", false)).toEqual({ ok: false, error: "No puedes desactivar tu propia cuenta." });
    expect(m.setUsuariaActiva).not.toHaveBeenCalled();
  });

  test("contraseña corta rechazada antes de llamar a Supabase", async () => {
    expect((await cambiarPasswordAction("u2", "corta")).ok).toBe(false);
    expect(m.setPasswordUsuaria).not.toHaveBeenCalled();
  });
});
