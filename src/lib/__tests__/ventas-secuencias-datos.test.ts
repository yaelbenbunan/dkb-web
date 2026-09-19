import { beforeEach, describe, expect, test, vi } from "vitest";
import { secuenciaVacia } from "../ventas/secuencias";

const m = vi.hoisted(() => ({
  getSecuencia: vi.fn(),
  crearSecuencia: vi.fn(),
  actualizarSecuencia: vi.fn(),
  listSecuencias: vi.fn(),
}));
vi.mock("../ventas/db", () => m);

import { activarSecuencia, duplicarSecuencia, guardarSecuencia } from "../ventas/servicios";

const MARCA = { id: "m1", slug: "hydrup" } as never;
const USUARIA = { id: "u1", rol: "admin" } as never;

function fila(patch: Partial<{ id: string; marca_id: string; nombre: string; estado: string; pasos: unknown }> = {}) {
  return {
    id: "s1",
    marca_id: "m1",
    nombre: "Captación gimnasios",
    estado: "borrador",
    pasos: secuenciaVacia(),
    creada_por: "u1",
    created_at: "2026-09-19T00:00:00Z",
    updated_at: "2026-09-19T00:00:00Z",
    ...patch,
  };
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.actualizarSecuencia.mockResolvedValue({ ok: true });
  m.crearSecuencia.mockResolvedValue({ ok: true, id: "s2" });
  m.listSecuencias.mockResolvedValue([]);
});

describe("guardarSecuencia", () => {
  test("valida la forma de los pasos antes de guardar", async () => {
    m.getSecuencia.mockResolvedValue(fila());
    const r = await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Nueva", pasosJson: "esto no es una secuencia" });
    expect(r.ok).toBe(false);
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
  });

  test("una secuencia de otra marca se rechaza", async () => {
    m.getSecuencia.mockResolvedValue(fila({ marca_id: "otra" }));
    const r = await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Nueva", pasosJson: secuenciaVacia() });
    expect(r).toEqual({ ok: false, error: expect.any(String) });
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
  });

  test("una secuencia inexistente se rechaza", async () => {
    m.getSecuencia.mockResolvedValue(null);
    const r = await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "no-existe", nombre: "Nueva", pasosJson: secuenciaVacia() });
    expect(r.ok).toBe(false);
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
  });

  test("pide nombre", async () => {
    m.getSecuencia.mockResolvedValue(fila());
    const r = await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "   ", pasosJson: secuenciaVacia() });
    expect(r.ok).toBe(false);
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
  });

  test("una secuencia válida se guarda con su nombre y sus pasos", async () => {
    m.getSecuencia.mockResolvedValue(fila());
    const pasos = secuenciaVacia();
    const r = await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Nueva captación", pasosJson: pasos });
    expect(r).toEqual({ ok: true });
    expect(m.actualizarSecuencia).toHaveBeenCalledWith("s1", { nombre: "Nueva captación", pasos });
  });

  test("con avisos graves se guarda igual pero nunca queda activa", async () => {
    m.getSecuencia.mockResolvedValue(fila({ estado: "activa" }));
    // inicio apunta a un paso que no existe: aviso grave.
    const rota = { version: 1 as const, inicio: "no-existe", pasos: secuenciaVacia().pasos };
    const r = await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Rota", pasosJson: rota });
    expect(r).toEqual({ ok: true });
    expect(m.actualizarSecuencia).toHaveBeenCalledWith("s1", { nombre: "Rota", pasos: rota, estado: "borrador" });
  });

  test("con avisos graves pero ya en borrador no toca el estado", async () => {
    m.getSecuencia.mockResolvedValue(fila({ estado: "borrador" }));
    const rota = { version: 1 as const, inicio: "no-existe", pasos: secuenciaVacia().pasos };
    await guardarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Rota", pasosJson: rota });
    expect(m.actualizarSecuencia).toHaveBeenCalledWith("s1", { nombre: "Rota", pasos: rota });
  });
});

describe("activarSecuencia", () => {
  test("con avisos graves falla y no escribe nada", async () => {
    m.getSecuencia.mockResolvedValue(fila({ pasos: { version: 1, inicio: "no-existe", pasos: {} } }));
    const r = await activarSecuencia({ marca: MARCA, secuenciaId: "s1" });
    expect(r).toEqual({ ok: false, error: "La secuencia tiene errores que hay que corregir antes de activarla." });
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
  });

  test("una secuencia de otra marca se rechaza", async () => {
    m.getSecuencia.mockResolvedValue(fila({ marca_id: "otra" }));
    const r = await activarSecuencia({ marca: MARCA, secuenciaId: "s1" });
    expect(r.ok).toBe(false);
    expect(m.actualizarSecuencia).not.toHaveBeenCalled();
  });

  test("activa la secuencia y archiva las demás activas de la marca", async () => {
    m.getSecuencia.mockResolvedValue(fila());
    m.listSecuencias.mockResolvedValue([
      fila({ id: "s1", estado: "borrador" }),
      fila({ id: "s3", estado: "activa" }),
      fila({ id: "s4", estado: "archivada" }),
    ]);
    const r = await activarSecuencia({ marca: MARCA, secuenciaId: "s1" });
    expect(r).toEqual({ ok: true });
    expect(m.actualizarSecuencia).toHaveBeenCalledWith("s3", { estado: "archivada" });
    expect(m.actualizarSecuencia).toHaveBeenCalledWith("s1", { estado: "activa" });
    expect(m.actualizarSecuencia).not.toHaveBeenCalledWith("s4", expect.anything());
  });
});

describe("duplicarSecuencia", () => {
  test("copia los pasos con un nombre nuevo (queda en borrador por defecto)", async () => {
    const pasos = secuenciaVacia();
    m.getSecuencia.mockResolvedValue(fila({ pasos }));
    const r = await duplicarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Copia" });
    expect(r).toEqual({ ok: true, id: "s2" });
    expect(m.crearSecuencia).toHaveBeenCalledWith({ marcaId: "m1", nombre: "Copia", pasos, creadaPor: "u1" });
  });

  test("una secuencia de otra marca no se puede duplicar", async () => {
    m.getSecuencia.mockResolvedValue(fila({ marca_id: "otra" }));
    const r = await duplicarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "Copia" });
    expect(r.ok).toBe(false);
    expect(m.crearSecuencia).not.toHaveBeenCalled();
  });

  test("pide nombre", async () => {
    m.getSecuencia.mockResolvedValue(fila());
    const r = await duplicarSecuencia({ marca: MARCA, usuaria: USUARIA, secuenciaId: "s1", nombre: "" });
    expect(r.ok).toBe(false);
    expect(m.crearSecuencia).not.toHaveBeenCalled();
  });
});
