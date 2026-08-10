import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

import { sendLeadAutoresponder } from "../lead-autoresponder";
import { CONTACT_INFO } from "../contact-info";

const mail = {
  subject: "Hemos recibido tu solicitud",
  eyebrow: "Contacto",
  heading: "Hemos recibido tu solicitud",
  intro: "gracias por escribirnos.",
};

describe("sendLeadAutoresponder", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: "msg-1" }, error: null });
    setSentMock.mockReset().mockResolvedValue(undefined);
    process.env.RESEND_API_KEY = "re_test";
    process.env.CONTACT_EMAIL_FROM = "hola@dinkbit.es";
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  test("envía el correo renderizado y persiste el estado en el CRM", async () => {
    const res = await sendLeadAutoresponder({ leadId: "lead-1", to: "a@b.com", mail });
    expect(res.ok).toBe(true);

    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toBe("a@b.com");
    expect(arg.subject).toBe("Hemos recibido tu solicitud");
    expect(arg.html).toContain("<!doctype html>");
    expect(arg.text).toContain("gracias por escribirnos");

    expect(setSentMock).toHaveBeenCalledWith("lead-1", "msg-1");
  });

  test("responder al correo llega al buzón de contacto, no al remitente", async () => {
    // Sin replyTo, "Responder" va a la dirección `from`, que depende de qué
    // dominio esté verificado en Resend. Fijarlo desacopla una cosa de la otra.
    await sendLeadAutoresponder({ leadId: "lead-1", to: "a@b.com", mail });
    expect(sendMock.mock.calls[0][0].replyTo).toBe(CONTACT_INFO.email);
  });

  test("sin leadId envía igual pero no intenta persistir estado", async () => {
    const res = await sendLeadAutoresponder({ to: "a@b.com", mail });
    expect(res.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(setSentMock).not.toHaveBeenCalled();
  });

  test("sin RESEND_API_KEY no envía y devuelve el motivo, sin lanzar", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendLeadAutoresponder({ leadId: "l", to: "a@b.com", mail });
    expect(res).toEqual({ ok: false, error: "resend_not_configured" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("si Resend devuelve error, no persiste estado y no lanza", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await sendLeadAutoresponder({ leadId: "l", to: "a@b.com", mail });
    expect(res.ok).toBe(false);
    expect(setSentMock).not.toHaveBeenCalled();
  });

  test("si Resend lanza, se traga la excepción (nunca rompe el alta del lead)", async () => {
    sendMock.mockRejectedValue(new Error("network down"));
    const res = await sendLeadAutoresponder({ leadId: "l", to: "a@b.com", mail });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("send_threw");
  });

  test("si falla la persistencia del estado, el envío sigue contando como correcto", async () => {
    setSentMock.mockRejectedValue(new Error("supabase down"));
    const res = await sendLeadAutoresponder({ leadId: "l", to: "a@b.com", mail });
    expect(res.ok).toBe(true);
  });
});
