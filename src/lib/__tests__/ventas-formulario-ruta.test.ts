import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const recibir = vi.fn();
vi.mock("@/lib/ventas/servicios", () => ({ recibirLeadFormulario: (...a: unknown[]) => recibir(...a) }));

const { POST, OPTIONS } = await import("@/app/api/ventas/formulario/[slug]/route");

function peticion(body: unknown, origin = "https://drinkhydrup.com", ip = "1.1.1.1") {
  return new NextRequest("https://www.dinkbit.es/api/ventas/formulario/hydrup", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function peticionConCabeceras(body: unknown, headers: Record<string, string>) {
  return new NextRequest("https://www.dinkbit.es/api/ventas/formulario/hydrup", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://drinkhydrup.com", ...headers },
    body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ slug: "hydrup" }) };
const lead = { negocio: "Gym Sol", contacto: "Ana", email: "ana@sol.es", tipo_negocio: "gimnasio" };

beforeEach(() => {
  recibir.mockReset();
  recibir.mockResolvedValue({ status: 200, body: { ok: true } });
});

describe("POST /api/ventas/formulario/[slug]", () => {
  test("origen permitido → llama al servicio y devuelve CORS", async () => {
    const res = await POST(peticion(lead, undefined, "2.2.2.1"), params);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://drinkhydrup.com");
    expect(recibir).toHaveBeenCalledWith({ slug: "hydrup", datos: lead });
  });

  test("origen no permitido → 403 sin tocar el servicio", async () => {
    const res = await POST(peticion(lead, "https://evil.com", "2.2.2.2"), params);
    expect(res.status).toBe(403);
    expect(recibir).not.toHaveBeenCalled();
  });

  test("campo trampa → 200 sin guardar", async () => {
    const res = await POST(peticion({ ...lead, website_url: "x" }, undefined, "2.2.2.3"), params);
    expect(res.status).toBe(200);
    expect(recibir).not.toHaveBeenCalled();
  });

  test("más de 5 envíos por IP en 10 min → 429", async () => {
    for (let i = 0; i < 5; i++) await POST(peticion(lead, undefined, "9.9.9.9"), params);
    const res = await POST(peticion(lead, undefined, "9.9.9.9"), params);
    expect(res.status).toBe(429);
  });

  test("x-forwarded-for spoofeado no burla el límite: manda x-real-ip", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        peticionConCabeceras(lead, { "x-real-ip": "8.8.8.8", "x-forwarded-for": `1.2.3.${i}` }),
        params,
      );
      expect(res.status).toBe(200);
    }
    const res = await POST(
      peticionConCabeceras(lead, { "x-real-ip": "8.8.8.8", "x-forwarded-for": "9.9.9.9" }),
      params,
    );
    expect(res.status).toBe(429);
  });

  test("cf-connecting-ip tiene prioridad sobre x-real-ip y x-forwarded-for", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        peticionConCabeceras(lead, { "cf-connecting-ip": "7.7.7.7", "x-real-ip": "8.8.8.8", "x-forwarded-for": `1.2.3.${i}` }),
        params,
      );
      expect(res.status).toBe(200);
    }
    const res = await POST(
      peticionConCabeceras(lead, { "cf-connecting-ip": "7.7.7.7", "x-real-ip": "8.8.8.8", "x-forwarded-for": "9.9.9.9" }),
      params,
    );
    expect(res.status).toBe(429);
  });

  test("distintas cf-connecting-ip son cubos separados", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(peticionConCabeceras(lead, { "cf-connecting-ip": "6.6.6.6" }), params);
      expect(res.status).toBe(200);
    }
    const distinta = await POST(peticionConCabeceras(lead, { "cf-connecting-ip": "6.6.6.7" }), params);
    expect(distinta.status).toBe(200);
    const misma = await POST(peticionConCabeceras(lead, { "cf-connecting-ip": "6.6.6.6" }), params);
    expect(misma.status).toBe(429);
  });

  test("OPTIONS responde el preflight solo a orígenes permitidos", async () => {
    const ok = await OPTIONS(new NextRequest("https://x/api", { method: "OPTIONS", headers: { origin: "https://drinkhydrup.com" } }), params);
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-methods")).toContain("POST");
    const ko = await OPTIONS(new NextRequest("https://x/api", { method: "OPTIONS", headers: { origin: "https://evil.com" } }), params);
    expect(ko.status).toBe(403);
  });
});
