import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, createLeadMock, autoresponderMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  createLeadMock: vi.fn(),
  autoresponderMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("../imagina-leads", () => ({ createWebhookLead: createLeadMock }));
vi.mock("../lead-autoresponder", () => ({ sendLeadAutoresponder: autoresponderMock }));

import { requestWebExpress } from "../web-express-action";

function formFor(over: Record<string, string> = {}, goals = ["Captar más pacientes"]): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: "Ana Ruiz",
    email: "ana@example.com",
    phone: "600111222",
    contactMethod: "WhatsApp",
    timeSlot: "Mañanas (9:00 – 14:00)",
    decisionMaker: "Sí, decido yo",
    urgency: "Lo antes posible (1-2 semanas)",
    origin: "Landing Web para psicólogos",
    campaign: "web-psicologos",
    website: "",
    formLoadedAt: String(Date.now() - 5000),
    ...over,
  };
  for (const [k, v] of Object.entries(base)) if (v !== "") fd.set(k, v);
  if (over.website === "") fd.set("website", "");
  for (const g of goals) fd.append("goals", g);
  return fd;
}

describe("requestWebExpress", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    createLeadMock.mockReset().mockResolvedValue({ ok: true, id: "lead-1" });
    autoresponderMock.mockReset().mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_TO = "equipo@dinkbit.es";
    process.env.CONTACT_EMAIL_FROM = "hola@dinkbit.es";
  });

  test("lead válido → CRM, aviso interno y acuse de recibo", async () => {
    const res = await requestWebExpress(formFor());
    expect(res.ok).toBe(true);

    const row = createLeadMock.mock.calls[0][0];
    expect(row.channel).toBe("Meta");
    expect(row.campaign).toBe("web-psicologos");
    expect(row.notes).toContain("WhatsApp");
    expect(row.notes).toContain("Sí, decido yo");

    expect(sendMock.mock.calls[0][0].to).toBe("equipo@dinkbit.es");
    expect(autoresponderMock.mock.calls[0][0].to).toBe("ana@example.com");
  });

  test("el asunto del aviso interno lleva el plazo, que es lo que ordena a quién llamar antes", () => {
    return requestWebExpress(formFor()).then(() => {
      expect(sendMock.mock.calls[0][0].subject).toContain("Lo antes posible");
    });
  });

  test("el acuse repite la franja horaria que eligió la persona", async () => {
    await requestWebExpress(formFor({ timeSlot: "Tardes (a partir de las 16:00)" }));
    expect(autoresponderMock.mock.calls[0][0].mail.intro).toContain("Tardes");
  });

  describe("teléfono", () => {
    const ok = ["600111222", "+34600111222", "600 11 12 22", "600-111-222", "911234567"];
    const bad = ["123456789", "60011122", "6001112223", "abcdefghi", "555 12 34"];

    test("acepta móviles y fijos españoles, con o sin prefijo y con separadores", async () => {
      for (const phone of ok) {
        createLeadMock.mockClear();
        const res = await requestWebExpress(formFor({ phone }));
        expect(res.ok, phone).toBe(true);
      }
    });

    test("rechaza los inventados típicos sin llegar a guardar el lead", async () => {
      for (const phone of bad) {
        createLeadMock.mockClear();
        const res = await requestWebExpress(formFor({ phone }));
        expect(res.ok, phone).toBe(false);
        expect(createLeadMock, phone).not.toHaveBeenCalled();
      }
    });
  });

  test("sin ningún objetivo marcado no se envía", async () => {
    const res = await requestWebExpress(formFor({}, []));
    expect(res.ok).toBe(false);
    expect(createLeadMock).not.toHaveBeenCalled();
  });

  test("el honeypot relleno descarta el envío", async () => {
    const res = await requestWebExpress(formFor({ website: "bot" }));
    expect(res.ok).toBe(false);
    expect(createLeadMock).not.toHaveBeenCalled();
  });

  test("un envío instantáneo se descarta (time-trap)", async () => {
    const res = await requestWebExpress(formFor({ formLoadedAt: String(Date.now()) }));
    expect(res.ok).toBe(false);
  });

  test("si el aviso interno falla se devuelve error, pero el lead ya está guardado", async () => {
    sendMock.mockResolvedValue({ error: { message: "smtp down" } });
    const res = await requestWebExpress(formFor());
    expect(res.ok).toBe(false);
    expect(createLeadMock).toHaveBeenCalledTimes(1);
    expect(autoresponderMock).not.toHaveBeenCalled();
  });

  test("los campos opcionales no bloquean el envío", async () => {
    const res = await requestWebExpress(formFor({ stage: "Estoy empezando", currentWebsite: "https://x.es" }));
    expect(res.ok).toBe(true);
    expect(createLeadMock.mock.calls[0][0].notes).toContain("https://x.es");
  });
});
