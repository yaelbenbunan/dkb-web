import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  getLead: vi.fn(),
  getUsuaria: vi.fn(),
  getTarea: vi.fn(),
  crearTarea: vi.fn(),
  actualizarTarea: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/ventas/db", () => ({
  getLead: m.getLead,
  getUsuaria: m.getUsuaria,
  getTarea: m.getTarea,
  crearTarea: m.crearTarea,
  actualizarTarea: m.actualizarTarea,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { crearTareaAction, marcarTareaAction, reasignarTareaAction } from "@/app/(site)/panel/ventas/acciones-tareas";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

const CLIENTA = { id: "c1", rol: "cliente", activa: true, marca_id: "m1" };
const MARCA = { id: "m1", slug: "hydrup" };
const TAREA = { id: "t1", marca_id: "m1", hecha_at: null };

beforeEach(() => {
  vi.clearAllMocks();
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: CLIENTA, marca: MARCA });
  m.crearTarea.mockResolvedValue({ ok: true });
  m.actualizarTarea.mockResolvedValue({ ok: true });
});

describe("acciones de tareas", () => {
  test("todas piden acceso a la sección «tareas» y no escriben si falla", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    expect(await crearTareaAction("dinkbit", null, fd({ titulo: "x" }))).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(await marcarTareaAction("dinkbit", "t1", true)).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(await reasignarTareaAction("dinkbit", "t1", "u2")).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.accesoMarcaAccion).toHaveBeenCalledWith("dinkbit", "tareas");
    expect(m.crearTarea).not.toHaveBeenCalled();
    expect(m.actualizarTarea).not.toHaveBeenCalled();
  });

  test("una clienta crea una tarea y la asigna", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u2", activa: true });
    const r = await crearTareaAction("hydrup", null, fd({ titulo: "Mandar catálogo", vence: "2026-10-20", vence_hora: "16:30", asignada_a: "3f0c2a4e-1b2c-4d5e-8f90-123456789abc" }));
    expect(r).toEqual({ ok: true, mensaje: "Tarea creada." });
    expect(m.crearTarea).toHaveBeenCalledWith({
      marcaId: "m1",
      leadId: null,
      titulo: "Mandar catálogo",
      vence: "2026-10-20",
      venceHora: "16:30",
      asignadaA: "3f0c2a4e-1b2c-4d5e-8f90-123456789abc",
      creadaPor: "c1",
    });
  });

  test("no se asigna a una usuaria desactivada", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u2", activa: false });
    expect(await crearTareaAction("hydrup", null, fd({ titulo: "x", asignada_a: "3f0c2a4e-1b2c-4d5e-8f90-123456789abc" }))).toEqual({
      ok: false,
      error: "Esa usuaria no existe o está desactivada.",
    });
    expect(m.crearTarea).not.toHaveBeenCalled();
  });

  test("no se liga a un lead de otra marca", async () => {
    m.getLead.mockResolvedValue({ id: "l9", marca_id: "m2" });
    expect(await crearTareaAction("hydrup", null, fd({ titulo: "x", lead_id: "3f0c2a4e-1b2c-4d5e-8f90-123456789abc" }))).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.crearTarea).not.toHaveBeenCalled();
  });

  test("no se marca ni reasigna una tarea de otra marca", async () => {
    m.getTarea.mockResolvedValue({ ...TAREA, marca_id: "m2" });
    expect(await marcarTareaAction("hydrup", "t1", true)).toEqual({ ok: false, error: "Tarea no encontrada." });
    expect(await reasignarTareaAction("hydrup", "t1", "")).toEqual({ ok: false, error: "Tarea no encontrada." });
    expect(m.actualizarTarea).not.toHaveBeenCalled();
  });

  test("marcar hecha guarda quién; deshacer lo limpia", async () => {
    m.getTarea.mockResolvedValue(TAREA);
    await marcarTareaAction("hydrup", "t1", true);
    expect(m.actualizarTarea).toHaveBeenLastCalledWith("t1", { hecha: { por: "c1" } });
    await marcarTareaAction("hydrup", "t1", false);
    expect(m.actualizarTarea).toHaveBeenLastCalledWith("t1", { hecha: null });
  });

  test("reasignar a una usuaria desactivada se rechaza; vacío deja la tarea sin asignar", async () => {
    m.getTarea.mockResolvedValue(TAREA);
    m.getUsuaria.mockResolvedValue({ id: "u2", activa: false });
    expect(await reasignarTareaAction("hydrup", "t1", "u2")).toEqual({ ok: false, error: "Esa usuaria no existe o está desactivada." });
    expect(await reasignarTareaAction("hydrup", "t1", "")).toEqual({ ok: true });
    expect(m.actualizarTarea).toHaveBeenCalledTimes(1);
    expect(m.actualizarTarea).toHaveBeenCalledWith("t1", { asignadaA: null });
  });
});
