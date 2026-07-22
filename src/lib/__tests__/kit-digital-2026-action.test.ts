import { beforeEach, describe, expect, test, vi } from "vitest";

// The Kit Digital 2026 capture landing must persist every valid submission to
// the CRM and send TWO emails: the internal team notification (critical) and a
// thank-you autoresponder to the lead (best-effort). Resend and the CRM module
// are mocked so no network/DB is touched.

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
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "x" });
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_TO = "to@example.com";
    process.env.CONTACT_EMAIL_FROM = "from@dinkbit.es";
  });

  test("valid pyme lead → persists to CRM and sends internal + autoresponder emails", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));

    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    const row = createWebhookLeadMock.mock.calls[0][0];
    expect(row.campaign).toBe("Kit Digital 2026");
    expect(row.businessType).toBe("Pyme");
    expect(row.sector).toContain("Hostelería/restauración");
    expect(row.notes).toContain("Web, SEO");

    // Two emails: internal notification + autoresponder to the lead.
    expect(sendMock).toHaveBeenCalledTimes(2);
    const recipients = sendMock.mock.calls.map((c) => c[0].to);
    expect(recipients).toContain("to@example.com");
    expect(recipients).toContain("nuria@example.com");
  });

  test("autoresponder failure does not fail the submission", async () => {
    // First email (internal) ok, second (autoresponder) errors.
    sendMock
      .mockReset()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "bounce" } });
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(formFor(fields, multi));
    expect(res.ok).toBe(true);
  });

  test("rejects the honeypot", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(
      formFor({ ...fields, website: "spam" }, multi),
    );
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("rejects a too-fast submission (time-trap)", async () => {
    const { fields, multi } = validPyme();
    const res = await requestKitDigital2026(
      formFor({ ...fields, formLoadedAt: String(Date.now()) }, multi),
    );
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("requires at least one service", async () => {
    const { fields } = validPyme();
    const res = await requestKitDigital2026(
      formFor(fields, { services: [], sectors: [] }),
    );
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
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
    const row = createWebhookLeadMock.mock.calls[0][0];
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
