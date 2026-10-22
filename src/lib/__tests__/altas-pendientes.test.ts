import { describe, expect, test } from "vitest";
import {
  FIRMAS_POR_VENTANA,
  TTL_FIRMA_MS,
  VENTANA_FIRMAS_MS,
  leerPendientes,
  marcarSubidas,
  reservarFirma,
} from "@/lib/altas/pendientes";

const AHORA = new Date("2026-10-22T12:00:00Z");
const MB = 1024 * 1024;
const GB = 1024 * MB;
const iso = (ms: number) => new Date(AHORA.getTime() + ms).toISOString();
const pendiente = (ruta: string, haceMs = 0) => ({ ruta, firmada: iso(-haceMs), expira: iso(TTL_FIRMA_MS - haceMs) });

describe("firmas pendientes", () => {
  test("la firma caduca a las 2 h y el límite es 15 cada 10 minutos", () => {
    expect(TTL_FIRMA_MS).toBe(2 * 60 * 60 * 1000);
    expect(FIRMAS_POR_VENTANA).toBe(15);
    expect(VENTANA_FIRMAS_MS).toBe(10 * 60 * 1000);
  });

  test("reserva: añade la entrada con su caducidad", () => {
    const r = reservarFirma([], { archivos: 0, bytes: 0 }, "a/r1", AHORA);
    expect(r).toEqual({ ok: true, pendientes: [{ ruta: "a/r1", firmada: AHORA.toISOString(), expira: iso(TTL_FIRMA_MS) }] });
  });

  test("las pendientes cuentan como archivos para el tope de 40", () => {
    const lista = Array.from({ length: 5 }, (_, i) => pendiente(`p${i}`, 20 * 60 * 1000));
    expect(reservarFirma(lista, { archivos: 34, bytes: 0 }, "nueva", AHORA).ok).toBe(true);
    expect(reservarFirma(lista, { archivos: 35, bytes: 0 }, "nueva", AHORA).ok).toBe(false);
  });

  test("cada pendiente (y la nueva) cuenta 50 MB para el tope de 1 GB, sin fiarse del tamaño declarado", () => {
    const tres = Array.from({ length: 3 }, (_, i) => pendiente(`p${i}`, 20 * 60 * 1000));
    // 3 pendientes + la nueva = 200 MB.
    expect(reservarFirma(tres, { archivos: 1, bytes: GB - 200 * MB }, "n", AHORA).ok).toBe(true);
    expect(reservarFirma(tres, { archivos: 1, bytes: GB - 200 * MB + 1 }, "n", AHORA)).toEqual({ ok: false, error: expect.stringMatching(/40 archivos o 1 GB/) });
  });

  test("las caducadas no cuentan y se quitan de la lista", () => {
    const caducada = pendiente("vieja", TTL_FIRMA_MS + 1);
    const r = reservarFirma([caducada], { archivos: 39, bytes: 0 }, "n", AHORA);
    expect(r.ok && r.pendientes.map((p) => p.ruta)).toEqual(["n"]);
  });

  test("como mucho 15 firmas en 10 minutos, cuenten o no ya como subidas", () => {
    const recientes = Array.from({ length: 15 }, (_, i) => ({ ...pendiente(`p${i}`, 60 * 1000), subida: i % 2 === 0 }));
    expect(reservarFirma(recientes, { archivos: 0, bytes: 0 }, "n", AHORA)).toEqual({ ok: false, error: expect.stringMatching(/Demasiados archivos seguidos/) });
    const antiguas = Array.from({ length: 15 }, (_, i) => ({ ...pendiente(`p${i}`, VENTANA_FIRMAS_MS + 1), subida: true }));
    expect(reservarFirma(antiguas, { archivos: 0, bytes: 0 }, "n", AHORA).ok).toBe(true);
  });

  test("una ya subida no cuenta como pendiente, pero sigue en la ventana de 10 min y luego se limpia", () => {
    const subida = { ...pendiente("hecha", 60 * 1000), subida: true };
    const r = reservarFirma([subida], { archivos: 39, bytes: 0 }, "n", AHORA);
    expect(r.ok && r.pendientes.map((p) => p.ruta)).toEqual(["hecha", "n"]);
    const vieja = { ...pendiente("hecha", VENTANA_FIRMAS_MS + 1), subida: true };
    const r2 = reservarFirma([vieja], { archivos: 0, bytes: 0 }, "n", AHORA);
    expect(r2.ok && r2.pendientes.map((p) => p.ruta)).toEqual(["n"]);
  });

  test("marcarSubidas deja de contarlas como pendientes", () => {
    const lista = [pendiente("a"), pendiente("b")];
    const r = marcarSubidas(lista, ["a", "zzz"], AHORA);
    expect(r).toEqual([{ ...lista[0], subida: true }, lista[1]]);
  });

  test("leerPendientes: descarta lo que no tiene forma de entrada", () => {
    expect(leerPendientes(undefined)).toBeNull();
    expect(leerPendientes(null)).toEqual([]);
    expect(leerPendientes("x")).toEqual([]);
    expect(leerPendientes([pendiente("a"), { ruta: 1 }, null, { ruta: "b", firmada: "x" }])).toEqual([pendiente("a")]);
  });
});
