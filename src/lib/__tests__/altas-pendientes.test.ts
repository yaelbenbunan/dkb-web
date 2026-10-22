import { describe, expect, test } from "vitest";
import { FIRMAS_POR_VENTANA, TTL_FIRMA_MS, VENTANA_FIRMAS_MS, leerPendientes, reservarFirma } from "@/lib/altas/pendientes";

const AHORA = new Date("2026-10-22T12:00:00Z");
const MB = 1024 * 1024;
const GB = 1024 * MB;
const iso = (ms: number) => new Date(AHORA.getTime() + ms).toISOString();
const pendiente = (ruta: string, haceMs = 0) => ({ ruta, firmada: iso(-haceMs), expira: iso(TTL_FIRMA_MS - haceMs) });
const uso = (archivos: number, bytes: number, rutas: string[] = []) => ({ archivos, bytes, rutas });
const HACE_20_MIN = 20 * 60 * 1000;

describe("reservas de subida", () => {
  test("la firma caduca a las 2 h y el límite es 15 cada 10 minutos", () => {
    expect(TTL_FIRMA_MS).toBe(2 * 60 * 60 * 1000);
    expect(FIRMAS_POR_VENTANA).toBe(15);
    expect(VENTANA_FIRMAS_MS).toBe(10 * 60 * 1000);
  });

  test("reserva: añade la entrada con su caducidad", () => {
    expect(reservarFirma([], uso(0, 0), "a/r1", AHORA)).toEqual({ ok: true, pendientes: [{ ruta: "a/r1", firmada: AHORA.toISOString(), expira: iso(TTL_FIRMA_MS) }] });
  });

  test("las reservas vigentes cuentan como archivos para el tope de 40", () => {
    const lista = Array.from({ length: 5 }, (_, i) => pendiente(`p${i}`, HACE_20_MIN));
    expect(reservarFirma(lista, uso(34, 0), "n", AHORA).ok).toBe(true);
    expect(reservarFirma(lista, uso(35, 0), "n", AHORA).ok).toBe(false);
  });

  test("cada reserva (y la nueva) cuenta 50 MB, sin fiarse del tamaño declarado", () => {
    const tres = Array.from({ length: 3 }, (_, i) => pendiente(`p${i}`, HACE_20_MIN));
    expect(reservarFirma(tres, uso(1, GB - 200 * MB), "n", AHORA).ok).toBe(true);
    expect(reservarFirma(tres, uso(1, GB - 200 * MB + 1), "n", AHORA)).toEqual({ ok: false, error: expect.stringMatching(/40 archivos o 1 GB/) });
  });

  test("una reserva cuyo archivo ya está en el bucket cuenta por su tamaño real, no dos veces", () => {
    const subidas = Array.from({ length: 3 }, (_, i) => pendiente(`p${i}`, HACE_20_MIN));
    // Las 3 ya están en el bucket (cuentan en `uso`): solo la nueva suma 50 MB.
    expect(reservarFirma(subidas, uso(39, GB - 50 * MB, ["p0", "p1", "p2"]), "n", AHORA).ok).toBe(true);
    expect(reservarFirma(subidas, uso(39, GB - 50 * MB, ["p0", "p1"]), "n", AHORA).ok).toBe(false);
  });

  test("solo caducan: hasta entonces cuentan, digan lo que digan", () => {
    const casiCaducada = pendiente("vieja", TTL_FIRMA_MS - 1000);
    expect(reservarFirma([casiCaducada], uso(39, 0), "n", AHORA).ok).toBe(false);
    const caducada = pendiente("vieja", TTL_FIRMA_MS + 1);
    const r = reservarFirma([caducada], uso(39, 0), "n", AHORA);
    expect(r.ok && r.pendientes.map((p) => p.ruta)).toEqual(["n"]);
  });

  test("como mucho 15 firmas en 10 minutos, aunque ya estén subidas", () => {
    const recientes = Array.from({ length: 15 }, (_, i) => pendiente(`p${i}`, 60 * 1000));
    const todas = recientes.map((p) => p.ruta);
    expect(reservarFirma(recientes, uso(15, 15 * MB, todas), "n", AHORA)).toEqual({ ok: false, error: expect.stringMatching(/Demasiados archivos seguidos/) });
    const antiguas = Array.from({ length: 15 }, (_, i) => pendiente(`p${i}`, VENTANA_FIRMAS_MS + 1));
    expect(reservarFirma(antiguas, uso(15, 15 * MB, todas), "n", AHORA).ok).toBe(true);
  });

  test("limpia las ya subidas fuera de la ventana, y conserva las que no están en el bucket", () => {
    const subidaVieja = pendiente("subida", HACE_20_MIN);
    const sinSubir = pendiente("sin-subir", HACE_20_MIN);
    const r = reservarFirma([subidaVieja, sinSubir], uso(1, MB, ["subida"]), "n", AHORA);
    expect(r.ok && r.pendientes.map((p) => p.ruta)).toEqual(["sin-subir", "n"]);
  });

  test("leerPendientes: descarta lo que no tiene forma de entrada", () => {
    expect(leerPendientes(undefined)).toBeNull();
    expect(leerPendientes(null)).toEqual([]);
    expect(leerPendientes("x")).toEqual([]);
    expect(leerPendientes([pendiente("a"), { ruta: 1 }, null, { ruta: "b", firmada: "x" }])).toEqual([pendiente("a")]);
  });
});
