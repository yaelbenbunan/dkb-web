import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  crearMarca: vi.fn(),
  actualizarCondiciones: vi.fn(),
  crearExclusion: vi.fn(),
  borrarExclusion: vi.fn(),
  regenerarSecretoWebhook: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  crearMarca: m.crearMarca,
  actualizarCondiciones: m.actualizarCondiciones,
  crearExclusion: m.crearExclusion,
  borrarExclusion: m.borrarExclusion,
  regenerarSecretoWebhook: m.regenerarSecretoWebhook,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import {
  crearMarcaAction,
  actualizarCondicionesAction,
  crearExclusionAction,
  borrarExclusionAction,
  regenerarSecretoAction,
} from "@/app/(site)/panel/ventas/acciones-marcas";

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

describe("acciones de marcas", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockClear());
    m.requireUsuaria.mockReset().mockResolvedValue({ id: "a1", rol: "admin", activa: true });
    m.crearMarca.mockReset().mockResolvedValue({ ok: true, marca: { slug: "hydrup" } });
    m.actualizarCondiciones.mockReset().mockResolvedValue({ ok: true });
    m.crearExclusion.mockReset().mockResolvedValue({ ok: true });
    m.borrarExclusion.mockReset().mockResolvedValue({ ok: true });
    m.regenerarSecretoWebhook.mockReset().mockResolvedValue({ ok: true });
  });

  test("todas exigen admin y no escriben si se deniega", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearMarcaAction(null, fd({ nombre: "Hydrup" }))).rejects.toThrow();
    await expect(actualizarCondicionesAction("m1", null, fd({ estado: "activa", comision_pct: "4" }))).rejects.toThrow();
    await expect(crearExclusionAction("m1", null, fd({ email: "a@b.es" }))).rejects.toThrow();
    await expect(borrarExclusionAction("m1", "e1")).rejects.toThrow();
    await expect(regenerarSecretoAction("m1")).rejects.toThrow();
    for (const call of m.requireUsuaria.mock.calls) expect(call).toEqual(["admin"]);
    expect(m.crearMarca).not.toHaveBeenCalled();
    expect(m.actualizarCondiciones).not.toHaveBeenCalled();
    expect(m.crearExclusion).not.toHaveBeenCalled();
    expect(m.borrarExclusion).not.toHaveBeenCalled();
    expect(m.regenerarSecretoWebhook).not.toHaveBeenCalled();
  });

  test("crear marca lleva a sus condiciones", async () => {
    await expect(crearMarcaAction(null, fd({ nombre: "Hydrup", slug: "" }))).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/hydrup/condiciones");
    expect(m.crearMarca).toHaveBeenCalledWith({ nombre: "Hydrup", slug: "hydrup" });
  });

  test("condiciones inválidas no llegan a la base", async () => {
    const r = await actualizarCondicionesAction("m1", null, fd({ estado: "activa", comision_pct: "150" }));
    expect(r.ok).toBe(false);
    expect(m.actualizarCondiciones).not.toHaveBeenCalled();
  });

  test("la exclusión se guarda firmada por la admin", async () => {
    await crearExclusionAction("m1", null, fd({ nombre: "Gym viejo", email: "viejo@gym.es" }));
    expect(m.crearExclusion).toHaveBeenCalledWith("m1", { nombre: "Gym viejo", email: "viejo@gym.es", telefono: "", cif: "" }, "a1");
  });
});
