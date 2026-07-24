import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, createWebhookLeadMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  createWebhookLeadMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("../imagina-leads", () => ({
  createWebhookLead: createWebhookLeadMock,
}));

import { handleKitDigital2026MetaLead } from "../kit-digital-2026-meta";

describe("handleKitDigital2026MetaLead", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "meta-1" });
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_FROM = "from@dinkbit.es";
  });

  test("inserta lead con canal Meta + campaña Kit Digital 2026 y manda email al lead", async () => {
    const res = await handleKitDigital2026MetaLead({
      id: "lg-123",
      name: "Marta",
      email: "marta@example.com",
      phone: "600111222",
    });
    expect(res.ok).toBe(true);
    const row = createWebhookLeadMock.mock.calls[0][0];
    expect(row.id).toBe("lg-123");
    expect(row.channel).toBe("Meta");
    expect(row.campaign).toBe("Kit Digital 2026");
    // Entra ya etiquetado "Interés en Kit Digital".
    expect(row.status).toBe("kit-digital");
    // Email al lead con CTA a la landing prefilled.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const msg = sendMock.mock.calls[0][0];
    expect(msg.to).toBe("marta@example.com");
    expect(msg.html).toContain("/kit-digital-2026?email=marta%40example.com");
  });

  test("sin email → guarda el lead pero no manda email", async () => {
    const res = await handleKitDigital2026MetaLead({ name: "Sin Email", phone: "600111222" });
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("fallo del email no invalida el guardado (best-effort)", async () => {
    sendMock.mockReset().mockResolvedValue({ error: { message: "bounce" } });
    const res = await handleKitDigital2026MetaLead({ email: "x@example.com", name: "X" });
    expect(res.ok).toBe(true);
  });
});
