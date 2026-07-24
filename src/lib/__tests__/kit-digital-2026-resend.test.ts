import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, setSentMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  setSentMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("../imagina-leads", () => ({ setLeadEmailSent: setSentMock }));

import { sendKitDigital2026Email } from "../kit-digital-2026-resend";

describe("sendKitDigital2026Email", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: "msg-1" }, error: null });
    setSentMock.mockReset().mockResolvedValue(undefined);
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_FROM = "from@dinkbit.es";
  });

  test("manda el email y persiste el message_id como 'enviado'", async () => {
    const res = await sendKitDigital2026Email({ leadId: "lead-1", name: "Rosario", email: "r@example.com" });
    expect(res.ok).toBe(true);
    expect(res.messageId).toBe("msg-1");
    const msg = sendMock.mock.calls[0][0];
    expect(msg.to).toBe("r@example.com");
    expect(msg.html).toContain("/kit-digital-2026?email=r%40example.com");
    expect(setSentMock).toHaveBeenCalledWith("lead-1", "msg-1");
  });

  test("error de Resend → ok:false y NO persiste enviado", async () => {
    sendMock.mockReset().mockResolvedValue({ data: null, error: { message: "bounce" } });
    const res = await sendKitDigital2026Email({ leadId: "lead-1", name: "X", email: "x@example.com" });
    expect(res.ok).toBe(false);
    expect(setSentMock).not.toHaveBeenCalled();
  });

  test("sin RESEND_API_KEY → ok:false sin intentar enviar", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendKitDigital2026Email({ leadId: "l", name: "X", email: "x@example.com" });
    expect(res.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
