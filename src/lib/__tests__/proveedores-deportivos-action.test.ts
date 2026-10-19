import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ recibir: vi.fn(), capi: vi.fn(), ip: "1.1.1.1" }));

vi.mock("server-only", () => ({}));
vi.mock("../ventas/servicios", () => ({ recibirLeadFormulario: m.recibir }));
vi.mock("../meta-capi", () => ({ sendMetaLead: m.capi }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": m.ip, "user-agent": "UA" }),
  cookies: async () => ({ get: () => undefined }),
}));

import { enviarSolicitudPack } from "../proveedores-deportivos-action";

function fd(extra: Record<string, string> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    nombre: "Laura Gómez", empresa: "Padel Pro SL", web: "@padelpro", email: "laura@padelpro.es",
    telefono: "600112233", producto: "padel", facturacion: "100k_500k", muestras: "si",
    presupuesto: "500_1500", privacidad: "on", eventId: "ev-1", pageUrl: "https://www.dinkbit.es/proveedores-deportivos",
    ...extra,
  };
  Object.entries(base).forEach(([k, v]) => f.append(k, v));
  f.append("destinos", "gimnasios");
  return f;
}

let ipN = 0;
beforeEach(() => {
  m.recibir.mockReset().mockResolvedValue({ status: 200, body: { ok: true, duplicado: false } });
  m.capi.mockReset().mockResolvedValue({ ok: true });
  m.ip = `10.0.0.${++ipN}`; // IP distinta por test: el limitador vive en memoria del módulo
});

describe("enviarSolicitudPack", () => {
  test("válido: crea el lead con la nota y manda CAPI con el mismo eventId", async () => {
    expect(await enviarSolicitudPack(fd())).toEqual({ ok: true });
    const arg = m.recibir.mock.calls[0][0];
    // Es una campaña de dinkbit, no una marca: lead de dinkbit con su campaña.
    expect(arg.slug).toBe("dinkbit");
    expect(arg.campana).toBe("Proveedores deportivos");
    expect(arg.canal).toBe("Web");
    expect(arg.datos).toMatchObject({ contacto: "Laura Gómez", negocio: "Padel Pro SL", email: "laura@padelpro.es", telefono: "600112233", web: "@padelpro" });
    expect(arg.nota).toContain("Qué vende: Material de pádel");
    expect(m.capi).toHaveBeenCalledWith(expect.objectContaining({ eventId: "ev-1", email: "laura@padelpro.es" }));
  });

  test("un bot recibe ok y no se guarda nada", async () => {
    expect(await enviarSolicitudPack(fd({ website_url: "http://spam" }))).toEqual({ ok: true });
    expect(m.recibir).not.toHaveBeenCalled();
    expect(m.capi).not.toHaveBeenCalled();
  });

  test("datos inválidos: errores por campo y nada guardado", async () => {
    const r = await enviarSolicitudPack(fd({ email: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores?.email).toBeTruthy();
    expect(m.recibir).not.toHaveBeenCalled();
  });

  test("marca sin crear o pausada: error con WhatsApp y sin CAPI", async () => {
    m.recibir.mockResolvedValue({ status: 404, body: { ok: false, error: "unknown_brand" } });
    const r = await enviarSolicitudPack(fd());
    expect(r).toMatchObject({ ok: false, whatsapp: expect.stringContaining("wa.me") });
    expect(m.capi).not.toHaveBeenCalled();
  });

  test("lead repetido cuenta como éxito", async () => {
    m.recibir.mockResolvedValue({ status: 200, body: { ok: true, duplicado: true } });
    expect(await enviarSolicitudPack(fd())).toEqual({ ok: true });
  });

  test("más de 5 envíos desde la misma IP en 10 minutos se frenan", async () => {
    for (let i = 0; i < 5; i++) expect((await enviarSolicitudPack(fd())).ok).toBe(true);
    const r = await enviarSolicitudPack(fd());
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("varias solicitudes") });
  });
});
