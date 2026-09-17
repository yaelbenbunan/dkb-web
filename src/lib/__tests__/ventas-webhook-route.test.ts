// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const { recibirMock, autenticarMock } = vi.hoisted(() => ({ recibirMock: vi.fn(), autenticarMock: vi.fn() }));
vi.mock("@/lib/ventas/servicios", () => ({ recibirLeadAnuncio: recibirMock, autenticarWebhook: autenticarMock }));

import { POST } from "@/app/api/ventas/leads/[slug]/route";

const params = Promise.resolve({ slug: "hydrup" });

describe("POST /api/ventas/leads/[slug]", () => {
  beforeEach(() => {
    recibirMock.mockReset().mockResolvedValue({ status: 200, body: { ok: true, duplicado: false } });
    autenticarMock.mockReset().mockResolvedValue(true);
  });

  test("secreto incorrecto → 401 sin leer el cuerpo ni llamar al servicio", async () => {
    autenticarMock.mockResolvedValue(false);
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": "malo" },
      body: "{roto",
    });
    const leer = vi.spyOn(req, "json");
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "unauthorized" });
    expect(autenticarMock).toHaveBeenCalledWith("hydrup", "malo");
    expect(leer).not.toHaveBeenCalled();
    expect(recibirMock).not.toHaveBeenCalled();
  });

  test("pasa slug, secreto de cabecera y cuerpo JSON al servicio", async () => {
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": "s3cret" },
      body: JSON.stringify({ negocio: "Gym", email: "a@b.es" }),
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(200);
    expect(recibirMock).toHaveBeenCalledWith({ slug: "hydrup", secreto: "s3cret", datos: { negocio: "Gym", email: "a@b.es" } });
  });

  test("acepta formularios", async () => {
    const body = new URLSearchParams({ negocio: "Gym", telefono: "600111222" });
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Bearer s3cret" },
      body,
    });
    await POST(req, { params });
    expect(recibirMock.mock.calls[0][0]).toMatchObject({ secreto: "s3cret", datos: { negocio: "Gym", telefono: "600111222" } });
  });

  test("JSON roto con secreto válido → 400 sin llamar al servicio", async () => {
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": "s3cret" },
      body: "{roto",
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    expect(recibirMock).not.toHaveBeenCalled();
  });

  test("devuelve el status del servicio", async () => {
    recibirMock.mockResolvedValue({ status: 401, body: { ok: false, error: "unauthorized" } });
    const req = new NextRequest("https://www.dinkbit.es/api/ventas/leads/hydrup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await POST(req, { params })).status).toBe(401);
  });
});
