import { afterEach, describe, expect, test } from "vitest";
import { borrarBorrador, claveBorrador, guardarBorrador, leerBorradorCrudo, interpretarBorrador } from "@/lib/altas/borrador";

const TOKEN = "C".repeat(43);
const ARCHIVO = { campo: "logo" as const, ruta: "r", nombre: "logo.svg", tamano: 10 };

afterEach(() => {
  localStorage.clear();
});

describe("borrador del alta en el navegador", () => {
  test("guarda y recupera respuestas y archivos subidos, por token", () => {
    guardarBorrador(TOKEN, { valores: { contacto_nombre: "Laura" }, archivos: [ARCHIVO] }, new Date("2026-10-22T10:00:00Z"));
    const b = interpretarBorrador(leerBorradorCrudo(TOKEN), null);
    expect(b).toEqual({ valores: { contacto_nombre: "Laura" }, archivos: [ARCHIVO] });
    expect(interpretarBorrador(leerBorradorCrudo("D".repeat(43)), null)).toBeNull();
    expect(claveBorrador(TOKEN)).toContain(TOKEN);
  });

  test("un borrador anterior al último envío no se usa", () => {
    guardarBorrador(TOKEN, { valores: { a: 1 }, archivos: [] }, new Date("2026-10-22T10:00:00Z"));
    expect(interpretarBorrador(leerBorradorCrudo(TOKEN), "2026-10-22T11:00:00Z")).toBeNull();
    expect(interpretarBorrador(leerBorradorCrudo(TOKEN), "2026-10-22T09:00:00Z")).not.toBeNull();
  });

  test("se borra", () => {
    guardarBorrador(TOKEN, { valores: { a: 1 }, archivos: [] });
    borrarBorrador(TOKEN);
    expect(leerBorradorCrudo(TOKEN)).toBeNull();
  });

  test("contenido roto o de otra versión: se ignora", () => {
    localStorage.setItem(claveBorrador(TOKEN), "{no es json");
    expect(interpretarBorrador(leerBorradorCrudo(TOKEN), null)).toBeNull();
    localStorage.setItem(claveBorrador(TOKEN), JSON.stringify({ v: 99, guardado: "2026-10-22", valores: {} }));
    expect(interpretarBorrador(leerBorradorCrudo(TOKEN), null)).toBeNull();
    localStorage.setItem(claveBorrador(TOKEN), JSON.stringify({ v: 1, guardado: "x", valores: [], archivos: "no" }));
    expect(interpretarBorrador(leerBorradorCrudo(TOKEN), null)).toBeNull();
  });

  test("sin almacenamiento (bloqueado o lleno) no lanza", () => {
    const real = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const roto = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => { throw new Error("SecurityError"); } };
    Object.defineProperty(globalThis, "localStorage", { value: roto, configurable: true, writable: true });
    try {
      expect(() => guardarBorrador(TOKEN, { valores: {}, archivos: [] })).not.toThrow();
      expect(leerBorradorCrudo(TOKEN)).toBeNull();
      expect(() => borrarBorrador(TOKEN)).not.toThrow();
      // Ni siquiera existe (navegadores que lo quitan del todo).
      Object.defineProperty(globalThis, "localStorage", { get: () => { throw new Error("SecurityError"); }, configurable: true });
      expect(leerBorradorCrudo(TOKEN)).toBeNull();
      expect(() => guardarBorrador(TOKEN, { valores: {}, archivos: [] })).not.toThrow();
    } finally {
      if (real) Object.defineProperty(globalThis, "localStorage", real);
    }
  });
});
