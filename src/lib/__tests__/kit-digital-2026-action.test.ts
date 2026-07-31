import { beforeEach, describe, expect, test, vi } from "vitest";

// The Kit Digital 2026 capture landing must persist every valid submission to
// the CRM via upsert, send the internal team notification (critical) and, solo
// cuando el lead es NUEVO, un acuse de recibo al interesado. Si el upsert
// devuelve matched:true el lead venía de Meta y ya recibió el correo de "casi
// está", así que no se le escribe otra vez.
// Resend and the CRM module are mocked so no network/DB is touched.

const { sendMock, upsertMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("../imagina-leads", () => ({
  upsertKitDigital2026Lead: upsertMock,
}));

import { requestKitDigital2026 } from "../kit-digital-2026-action";

function formFor(
  fields: Record<string, string>,
  multi: Record<string, string[]> = {},
): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const [k, vs] of Object.entries(multi)) for (const v of vs) fd.append(k, v);
  return fd;
}

const validPyme = () => ({
  fields: {
    name: "Nuria",
    email: "nuria@example.com",
    phone: "633333333",
    businessType: "pyme",
    employees: "3-9",
    consent: "on",
    website: "",
    formLoadedAt: String(Date.now() - 5000),
  },
  multi: { services: ["Web", "SEO"], sectors: ["Hostelería/restauración"] },
});

describe("requestKitDigital2026", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    upsertMock.mockReset().mockResolvedValue({ ok: true, id: "x", matched: false });
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_TO = "to@example.com";
    process.env.CONTACT_EMAIL_FROM = "from@dinkbit.es";
  });

  test("valid pyme lead → upsert al CRM, email interno y acuse al lead", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));

    expect(res.ok).toBe(true);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const row = upsertMock.mock.calls[0][0];
    expect(row.campaign).toBe("Kit Digital 2026");
    expect(row.businessType).toBe("Pyme");
    expect(row.sector).toContain("Hostelería/restauración");
    expect(row.notes).toContain("Web, SEO");

    // Dos correos: el aviso interno al equipo y el acuse de recibo al lead.
    const recipients = sendMock.mock.calls.map((c) => c[0].to);
    expect(recipients).toContain("to@example.com");
    expect(recipients).toContain("nuria@example.com");
  });

  test("si el lead ya existía (vino de Meta) NO se le manda el acuse", async () => {
    // matched:true ⇒ ya recibió el correo de "casi está" con el botón a esta
    // landing; un segundo correo a los dos minutos sobra.
    upsertMock.mockResolvedValue({ ok: true, id: "x", matched: true });
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));

    expect(res.ok).toBe(true);
    const recipients = sendMock.mock.calls.map((c) => c[0].to);
    expect(recipients).toContain("to@example.com");
    expect(recipients).not.toContain("nuria@example.com");
  });

  test("fallo del email interno devuelve error", async () => {
    sendMock.mockReset().mockResolvedValue({ error: { message: "smtp down" } });
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));
    expect(res.ok).toBe(false);
  });

  test("rejects the honeypot", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(
      formFor({ ...fields, website: "spam" }, multi),
    );
    expect(res.ok).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects a too-fast submission (time-trap)", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(
      formFor({ ...fields, formLoadedAt: String(Date.now()) }, multi),
    );
    expect(res.ok).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("requires at least one service", async () => {
    const { fields } = validPyme();
    const res = await requestKitDigital2026(
      formFor(fields, { services: [], sectors: [] }),
    );
    expect(res.ok).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("pyme without employees is rejected", async () => {
    const { fields, multi } = validPyme();
    const noEmp = { ...fields };
    delete (noEmp as Record<string, string>).employees;
    const res = await requestKitDigital2026(formFor(noEmp, multi));
    expect(res.ok).toBe(false);
  });

  test("autónomo without seniority is rejected", async () => {
    const { multi } = validPyme();
    const res = await requestKitDigital2026(
      formFor(
        {
          name: "Ismael",
          email: "ismael@example.com",
          phone: "644444444",
          businessType: "autonomo",
          consent: "on",
          website: "",
          formLoadedAt: String(Date.now() - 5000),
        },
        multi,
      ),
    );
    expect(res.ok).toBe(false);
  });

  test("autónomo with seniority is accepted", async () => {
    const res = await requestKitDigital2026(
      formFor(
        {
          name: "Ismael",
          email: "ismael@example.com",
          phone: "644444444",
          businessType: "autonomo",
          seniority: "más de 6 meses",
          consent: "on",
          website: "",
          formLoadedAt: String(Date.now() - 5000),
        },
        { services: ["Redes sociales"], sectors: [] },
      ),
    );
    expect(res.ok).toBe(true);
    const row = upsertMock.mock.calls[0][0];
    expect(row.businessType).toBe("Autónomo");
  });

  test("requires consent", async () => {
    const { fields, multi } = validPyme();
    const noConsent = { ...fields };
    delete (noConsent as Record<string, string>).consent;
    const res = await requestKitDigital2026(formFor(noConsent, multi));
    expect(res.ok).toBe(false);
  });
});
