import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const { getProspectoMock, marcarEstadoMock, suprimirMock } = vi.hoisted(() => ({
  getProspectoMock: vi.fn(),
  marcarEstadoMock: vi.fn(),
  suprimirMock: vi.fn(),
}));
vi.mock("../db", () => ({
  getProspecto: getProspectoMock,
  marcarEstado: marcarEstadoMock,
  suprimir: suprimirMock,
}));

import { bajaDisponible, urlDeBaja, verificarTokenBaja } from "../baja-token";
import { verifyUnsubscribeToken } from "../../unsubscribe-token";
import { GET, POST } from "@/app/api/prospeccion/baja/route";

beforeEach(() => {
  vi.stubEnv("PROMO_TOKEN_SECRET", "secreto-de-prueba");
  getProspectoMock.mockReset();
  marcarEstadoMock.mockReset();
  suprimirMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const ver = (url: string) => GET(new NextRequest(url));
/** Como lo manda un cliente de correo (RFC 8058): POST con el cuerpo fijo. */
const confirmar = (url: string) =>
  POST(
    new NextRequest(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    }),
  );

const MALICIOSO = '"><script>alert(1)</script>';

describe("token de baja", () => {
  test("la URL lleva un token que verifica para ese prospecto y no para otro", () => {
    const url = new URL(urlDeBaja("p1"));
    expect(url.pathname).toBe("/api/prospeccion/baja");
    const token = url.searchParams.get("token") ?? "";
    expect(verificarTokenBaja("p1", token)).toBe(true);
    expect(verificarTokenBaja("p2", token)).toBe(false);
  });

  test("no sirve como token de baja de un lead con el mismo id", () => {
    const token = new URL(urlDeBaja("p1")).searchParams.get("token") ?? "";
    expect(verifyUnsubscribeToken("p1", token)).toBe(false);
  });
});

describe("GET /api/prospeccion/baja", () => {
  // Los filtros de correo abren los enlaces por su cuenta: abrirlo no da de baja.
  test("con token válido pregunta y no cambia nada", async () => {
    getProspectoMock.mockResolvedValue({ id: "p1", email: "Info@Bar.es" });
    const url = urlDeBaja("p1");
    const res = await ver(url);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("¿Quieres dejar de recibir correos de dinkbit?");
    expect(html).toContain("Sí, darme de baja");
    expect(html).toMatch(/<form method="post" action="[^"]*">/);
    const token = new URL(url).searchParams.get("token");
    expect(html).toContain(`action="/api/prospeccion/baja?id=p1&amp;token=${token}"`);
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("con token manipulado no muestra el formulario y dice cómo pedir la baja a mano", async () => {
    const html = await (await ver(`${urlDeBaja("p1")}x`)).text();
    expect(html).toContain("no válido o caducado");
    expect(html).toContain("Escríbenos a hola@dinkbit.es y te damos de baja a mano.");
    expect(html).not.toContain("<form");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("sin parámetros responde sin romperse", async () => {
    const res = await ver("https://www.dinkbit.es/api/prospeccion/baja");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("no válido o caducado");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
  });

  test("un id con HTML no llega sin escapar a la página, con token válido o sin él", async () => {
    const valida = await (await ver(urlDeBaja(MALICIOSO))).text();
    expect(valida).toContain("Sí, darme de baja");
    expect(valida).not.toContain(MALICIOSO);
    expect(valida).not.toContain("<script");

    const invalida = await (
      await ver(`https://www.dinkbit.es/api/prospeccion/baja?id=${encodeURIComponent(MALICIOSO)}&token=${encodeURIComponent(MALICIOSO)}`)
    ).text();
    expect(invalida).toContain("no válido o caducado");
    expect(invalida).not.toContain(MALICIOSO);
    expect(invalida).not.toContain("<script");
  });
});

describe("POST /api/prospeccion/baja", () => {
  test("con token válido da de baja y suprime el email, sin mirar el cuerpo", async () => {
    getProspectoMock.mockResolvedValue({ id: "p1", email: "Info@Bar.es" });
    const res = await confirmar(urlDeBaja("p1"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No recibirás más correos");
    expect(marcarEstadoMock).toHaveBeenCalledWith(["p1"], "baja");
    expect(suprimirMock).toHaveBeenCalledWith("Info@Bar.es", "email", "baja");
  });

  test("también sirve sin cuerpo (el botón de la página)", async () => {
    getProspectoMock.mockResolvedValue({ id: "p1", email: "info@bar.es" });
    const res = await POST(new NextRequest(urlDeBaja("p1"), { method: "POST" }));
    expect(await res.text()).toContain("No recibirás más correos");
    expect(marcarEstadoMock).toHaveBeenCalledWith(["p1"], "baja");
  });

  test("con token manipulado no toca nada", async () => {
    const html = await (await confirmar(`${urlDeBaja("p1")}x`)).text();
    expect(html).toContain("no válido o caducado");
    expect(html).toContain("Escríbenos a hola@dinkbit.es y te damos de baja a mano.");
    expect(getProspectoMock).not.toHaveBeenCalled();
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("con token caducado no toca nada", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const url = urlDeBaja("p1");
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z")); // > 180 días
    expect(await (await confirmar(url)).text()).toContain("no válido o caducado");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("el id y el token del cuerpo no cuentan: solo los de la URL", async () => {
    const token = new URL(urlDeBaja("p1")).searchParams.get("token");
    const res = await POST(
      new NextRequest("https://www.dinkbit.es/api/prospeccion/baja", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `id=p1&token=${token}`,
      }),
    );
    expect(await res.text()).toContain("no válido o caducado");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
  });

  test("si el prospecto ya no existe, la baja se confirma igual", async () => {
    getProspectoMock.mockResolvedValue(null);
    const res = await confirmar(urlDeBaja("p1"));
    expect(await res.text()).toContain("No recibirás más correos");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("un id con HTML no llega sin escapar a la página", async () => {
    getProspectoMock.mockResolvedValue(null);
    const valida = await (await confirmar(urlDeBaja(MALICIOSO))).text();
    expect(valida).not.toContain(MALICIOSO);
    expect(valida).not.toContain("<script");

    const invalida = await (
      await confirmar(`https://www.dinkbit.es/api/prospeccion/baja?id=${encodeURIComponent(MALICIOSO)}&token=x`)
    ).text();
    expect(invalida).toContain("no válido o caducado");
    expect(invalida).not.toContain(MALICIOSO);
    expect(invalida).not.toContain("<script");
  });
});

describe("bajaDisponible", () => {
  test("es true con secreto y false sin ninguno", () => {
    expect(bajaDisponible()).toBe(true);
    vi.stubEnv("PROMO_TOKEN_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(bajaDisponible()).toBe(false);
  });
});
