import { beforeEach, describe, expect, test, vi } from "vitest";

// El action toca Supabase, Resend, Meta y las cabeceras de Next: se sustituyen
// todos para poder testear solo la validación y el encadenado.
vi.mock("../imagina-leads", () => ({
  createWebhookLead: vi.fn(async () => ({ ok: true, id: "lead-1" })),
}));
vi.mock("../lead-autoresponder", () => ({
  sendLeadAutoresponder: vi.fn(async () => ({ ok: true })),
}));
vi.mock("../meta-capi", () => ({ sendMetaLead: vi.fn(async () => ({ ok: true })) }));
vi.mock("next/headers", () => ({
  headers: async () => new Map<string, string>(),
  cookies: async () => ({ get: () => undefined }),
}));

import { requestGrowth } from "../growth-action";
import { createWebhookLead } from "../imagina-leads";
import { sendMetaLead } from "../meta-capi";

/** FormData válido; cada test cambia lo que necesita. */
function fd(over: Record<string, string> = {}): FormData {
  const f = new FormData();
  const campos: Record<string, string> = {
    name: "Ana Ruiz",
    email: "ana@clinica.com",
    phone: "600111222",
    inversion: "1500",
    pacientes: "17",
    ticket: "400",
    consent: "true",
    website: "",
    // Muy por debajo de ahora: pasa el control de tiempo.
    formLoadedAt: String(Date.now() - 60_000),
    ...over,
  };
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("requestGrowth", () => {
  beforeEach(() => vi.clearAllMocks());

  test("datos válidos: guarda el lead y devuelve el resultado", async () => {
    const res = await requestGrowth(fd());
    expect(res.ok).toBe(true);
    expect(res.resultado?.rama).toBe("A");
    expect(res.resultado?.costePorPaciente).toBe(88.24);
    expect(createWebhookLead).toHaveBeenCalledTimes(1);
  });

  test("campos vacíos de la calculadora = las opciones 'no lo sé'", async () => {
    const res = await requestGrowth(fd({ inversion: "", pacientes: "", ticket: "" }));
    expect(res.ok).toBe(true);
    expect(res.resultado?.rama).toBe("C");
  });

  test("sin consentimiento se rechaza y no guarda nada", async () => {
    const res = await requestGrowth(fd({ consent: "" }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("honeypot relleno se rechaza en silencio", async () => {
    const res = await requestGrowth(fd({ website: "http://spam.example" }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("envío demasiado rápido se rechaza", async () => {
    const res = await requestGrowth(fd({ formLoadedAt: String(Date.now()) }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("email inválido se rechaza", async () => {
    const res = await requestGrowth(fd({ email: "ana@" }));
    expect(res.ok).toBe(false);
    expect(createWebhookLead).not.toHaveBeenCalled();
  });

  test("si falla el guardado, no se pierde el resultado del usuario", async () => {
    vi.mocked(createWebhookLead).mockResolvedValueOnce({ ok: false, error: "boom" });
    const res = await requestGrowth(fd());
    // El cálculo es suyo y ya lo ha "pagado" con sus datos: se le enseña igual.
    expect(res.ok).toBe(true);
    expect(res.resultado?.rama).toBe("A");
  });

  test("manda la conversión a Meta con el mismo eventId que vino del formulario", async () => {
    // El píxel del navegador manda este mismo id. Si el servidor generara uno
    // propio, Meta contaría dos conversiones por lead.
    await requestGrowth(
      fd({ eventId: "evt-cliente-123", sourceUrl: "https://dinkbit.es/growth" }),
    );
    expect(sendMetaLead).toHaveBeenCalledTimes(1);
    const evento = vi.mocked(sendMetaLead).mock.calls[0][0];
    expect(evento.eventId).toBe("evt-cliente-123");
    expect(evento.email).toBe("ana@clinica.com");
    expect(evento.phone).toBe("600111222");
    expect(evento.sourceUrl).toBe("https://dinkbit.es/growth");
  });

  test("sin eventId no se manda conversión: una sin deduplicar es peor que ninguna", async () => {
    await requestGrowth(fd());
    expect(sendMetaLead).not.toHaveBeenCalled();
  });
});
