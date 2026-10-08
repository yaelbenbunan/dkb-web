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

import { urlDeBaja, verificarTokenBaja } from "../baja-token";
import { verifyUnsubscribeToken } from "../../unsubscribe-token";
import { GET } from "@/app/api/prospeccion/baja/route";

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

const pedir = (url: string) => GET(new NextRequest(url));

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
  test("con token válido da de baja y suprime el email", async () => {
    getProspectoMock.mockResolvedValue({ id: "p1", email: "Info@Bar.es" });
    const res = await pedir(urlDeBaja("p1"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No recibirás más correos");
    expect(marcarEstadoMock).toHaveBeenCalledWith(["p1"], "baja");
    expect(suprimirMock).toHaveBeenCalledWith("Info@Bar.es", "email", "baja");
  });

  test("con token manipulado no toca nada", async () => {
    const res = await pedir(`${urlDeBaja("p1")}x`);
    expect(await res.text()).toContain("no válido");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("con token caducado no toca nada", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const url = urlDeBaja("p1");
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z")); // > 180 días
    const res = await pedir(url);
    expect(await res.text()).toContain("no válido");
    expect(marcarEstadoMock).not.toHaveBeenCalled();
  });

  test("sin parámetros responde sin romperse", async () => {
    const res = await pedir("https://www.dinkbit.es/api/prospeccion/baja");
    expect(res.status).toBe(200);
    expect(marcarEstadoMock).not.toHaveBeenCalled();
  });

  test("si el prospecto ya no existe, la baja se confirma igual", async () => {
    getProspectoMock.mockResolvedValue(null);
    const res = await pedir(urlDeBaja("p1"));
    expect(await res.text()).toContain("No recibirás más correos");
    expect(suprimirMock).not.toHaveBeenCalled();
  });
});
