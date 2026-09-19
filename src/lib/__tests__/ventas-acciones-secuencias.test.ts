import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  getMarcaPorSlug: vi.fn(),
  getSecuencia: vi.fn(),
  crearSecuencia: vi.fn(),
  actualizarSecuencia: vi.fn(),
  secuenciaVacia: vi.fn(),
  guardarSecuencia: vi.fn(),
  activarSecuencia: vi.fn(),
  duplicarSecuencia: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  getMarcaPorSlug: m.getMarcaPorSlug,
  getSecuencia: m.getSecuencia,
  crearSecuencia: m.crearSecuencia,
  actualizarSecuencia: m.actualizarSecuencia,
}));
vi.mock("@/lib/ventas/secuencias", () => ({ secuenciaVacia: m.secuenciaVacia }));
vi.mock("@/lib/ventas/servicios", () => ({
  guardarSecuencia: m.guardarSecuencia,
  activarSecuencia: m.activarSecuencia,
  duplicarSecuencia: m.duplicarSecuencia,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import {
  activarSecuenciaAction,
  archivarSecuenciaAction,
  crearSecuenciaAction,
  duplicarSecuenciaAction,
  guardarSecuenciaAction,
} from "@/app/(site)/panel/ventas/acciones-secuencias";

const ADMIN = { id: "a1", rol: "admin", activa: true };
const MARCA = { id: "m1", slug: "hydrup" };
const SECUENCIA_VACIA = { version: 1, inicio: "p1", pasos: { p1: { tipo: "mensaje", texto: "Hola", botones: [] } } };

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockClear());
  m.requireUsuaria.mockReset().mockResolvedValue(ADMIN);
  m.getMarcaPorSlug.mockReset().mockResolvedValue(MARCA);
  m.getSecuencia.mockReset().mockResolvedValue({ id: "s1", marca_id: "m1", estado: "borrador" });
  m.crearSecuencia.mockReset().mockResolvedValue({ ok: true, id: "s9" });
  m.actualizarSecuencia.mockReset().mockResolvedValue({ ok: true });
  m.secuenciaVacia.mockReset().mockReturnValue(SECUENCIA_VACIA);
  m.guardarSecuencia.mockReset().mockResolvedValue({ ok: true });
  m.activarSecuencia.mockReset().mockResolvedValue({ ok: true });
  m.duplicarSecuencia.mockReset().mockResolvedValue({ ok: true, id: "s9" });
});

describe("acciones de secuencias", () => {
  test("todas exigen sesión: sin usuaria, ninguna escribe", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(crearSecuenciaAction("hydrup", null, fd({ nombre: "Captación" }))).rejects.toThrow();
    await expect(guardarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "X", pasos: "{}" }))).rejects.toThrow();
    await expect(activarSecuenciaAction("hydrup", "s1")).rejects.toThrow();
    await expect(archivarSecuenciaAction("hydrup", "s1")).rejects.toThrow();
    await expect(duplicarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "Copia" }))).rejects.toThrow();
    expect(m.crearSecuencia).not.toHaveBeenCalled();
    expect(m.guardarSecuencia).not.toHaveBeenCalled();
    expect(m.activarSecuencia).not.toHaveBeenCalled();
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
    expect(m.duplicarSecuencia).not.toHaveBeenCalled();
  });

  test("todas exigen el rol admin", async () => {
    try {
      await crearSecuenciaAction("hydrup", null, fd({ nombre: "Captación" }));
    } catch {
      /* redirige tras crear: es lo esperado */
    }
    await guardarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "X", pasos: "{}" }));
    await activarSecuenciaAction("hydrup", "s1");
    await archivarSecuenciaAction("hydrup", "s1");
    try {
      await duplicarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "Copia" }));
    } catch {
      /* redirige tras duplicar: es lo esperado */
    }
    for (const call of m.requireUsuaria.mock.calls) expect(call).toEqual(["admin"]);
    expect(m.requireUsuaria).toHaveBeenCalledTimes(5);
  });

  describe("crearSecuenciaAction", () => {
    test("sin nombre no crea nada", async () => {
      const r = await crearSecuenciaAction("hydrup", null, fd({ nombre: "  " }));
      expect(r).toEqual({ ok: false, error: expect.any(String) });
      expect(m.crearSecuencia).not.toHaveBeenCalled();
    });

    test("crea con una secuencia vacía y va al editor", async () => {
      await expect(crearSecuenciaAction("hydrup", null, fd({ nombre: "Captación gimnasios" }))).rejects.toThrow(
        "NEXT_REDIRECT:/panel/ventas/hydrup/secuencias/s9",
      );
      expect(m.crearSecuencia).toHaveBeenCalledWith({ marcaId: "m1", nombre: "Captación gimnasios", pasos: SECUENCIA_VACIA, creadaPor: "a1" });
    });

    test("marca no encontrada", async () => {
      m.getMarcaPorSlug.mockResolvedValue(null);
      expect(await crearSecuenciaAction("nope", null, fd({ nombre: "X" }))).toEqual({ ok: false, error: "Marca no encontrada." });
    });
  });

  describe("guardarSecuenciaAction", () => {
    test("un JSON inválido en «pasos» da un error legible sin llamar al servicio", async () => {
      const r = await guardarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "X", pasos: "esto no es json" }));
      expect(r.ok).toBe(false);
      expect(m.guardarSecuencia).not.toHaveBeenCalled();
    });

    test("parsea el JSON y delega en el servicio", async () => {
      const pasos = { version: 1, inicio: "p1", pasos: {} };
      await guardarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "Nueva", pasos: JSON.stringify(pasos) }));
      expect(m.guardarSecuencia).toHaveBeenCalledWith({ marca: MARCA, usuaria: ADMIN, secuenciaId: "s1", nombre: "Nueva", pasosJson: pasos });
    });

    test("si el servicio falla, se devuelve su error", async () => {
      m.guardarSecuencia.mockResolvedValue({ ok: false, error: "Ponle nombre a la secuencia." });
      const r = await guardarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "", pasos: "{}" }));
      expect(r).toEqual({ ok: false, error: "Ponle nombre a la secuencia." });
    });
  });

  describe("activarSecuenciaAction", () => {
    test("delega en el servicio con la marca de la URL", async () => {
      const r = await activarSecuenciaAction("hydrup", "s1");
      expect(r).toEqual({ ok: true, mensaje: expect.any(String) });
      expect(m.activarSecuencia).toHaveBeenCalledWith({ marca: MARCA, secuenciaId: "s1" });
    });

    test("si el servicio falla no se enseña como éxito", async () => {
      m.activarSecuencia.mockResolvedValue({ ok: false, error: "La secuencia tiene errores que hay que corregir antes de activarla." });
      expect(await activarSecuenciaAction("hydrup", "s1")).toEqual({ ok: false, error: "La secuencia tiene errores que hay que corregir antes de activarla." });
    });
  });

  describe("archivarSecuenciaAction", () => {
    test("una secuencia de otra marca no se archiva", async () => {
      m.getSecuencia.mockResolvedValue({ id: "s1", marca_id: "otra", estado: "activa" });
      const r = await archivarSecuenciaAction("hydrup", "s1");
      expect(r.ok).toBe(false);
      expect(m.actualizarSecuencia).not.toHaveBeenCalled();
    });

    test("archiva la secuencia de la marca", async () => {
      const r = await archivarSecuenciaAction("hydrup", "s1");
      expect(r).toEqual({ ok: true, mensaje: expect.any(String) });
      expect(m.actualizarSecuencia).toHaveBeenCalledWith("s1", { estado: "archivada" });
    });
  });

  describe("duplicarSecuenciaAction", () => {
    test("sin nombre no delega en el servicio", async () => {
      const r = await duplicarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "" }));
      expect(r.ok).toBe(false);
      expect(m.duplicarSecuencia).not.toHaveBeenCalled();
    });

    test("duplica y va al editor de la copia", async () => {
      await expect(duplicarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "Copia" }))).rejects.toThrow(
        "NEXT_REDIRECT:/panel/ventas/hydrup/secuencias/s9",
      );
      expect(m.duplicarSecuencia).toHaveBeenCalledWith({ marca: MARCA, usuaria: ADMIN, secuenciaId: "s1", nombre: "Copia" });
    });

    test("si el servicio falla, se devuelve su error", async () => {
      m.duplicarSecuencia.mockResolvedValue({ ok: false, error: "Secuencia no encontrada." });
      expect(await duplicarSecuenciaAction("hydrup", "s1", null, fd({ nombre: "Copia" }))).toEqual({ ok: false, error: "Secuencia no encontrada." });
    });
  });
});
