import { beforeEach, describe, expect, test, vi } from "vitest";

const { createWebhookLeadMock, sendEmailMock } = vi.hoisted(() => ({
  createWebhookLeadMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("../imagina-leads", () => ({ createWebhookLead: createWebhookLeadMock }));
vi.mock("../kit-digital-2026-resend", () => ({ sendKitDigital2026Email: sendEmailMock }));

import { handleKitDigital2026MetaLead } from "../kit-digital-2026-meta";

describe("handleKitDigital2026MetaLead", () => {
  beforeEach(() => {
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "meta-1" });
    sendEmailMock.mockReset().mockResolvedValue({ ok: true, messageId: "msg-1" });
  });

  test("inserta lead (Meta, Kit Digital 2026, kit-digital) y manda el email al lead", async () => {
    const res = await handleKitDigital2026MetaLead({
      id: "lg-123", name: "Marta", email: "marta@example.com", phone: "600111222",
    });
    expect(res.ok).toBe(true);
    const row = createWebhookLeadMock.mock.calls[0][0];
    expect(row.id).toBe("lg-123");
    expect(row.channel).toBe("Meta");
    expect(row.campaign).toBe("Kit Digital 2026");
    expect(row.status).toBe("kit-digital");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.leadId).toBe("meta-1");
    expect(arg.email).toBe("marta@example.com");
  });

  test("sin email → guarda el lead pero no manda email", async () => {
    const res = await handleKitDigital2026MetaLead({ name: "Sin Email", phone: "600111222" });
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test("si el guardado falla, no intenta enviar", async () => {
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: false, error: "supabase_not_configured" });
    const res = await handleKitDigital2026MetaLead({ email: "x@example.com", name: "X" });
    expect(res.ok).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
