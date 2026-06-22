import { beforeEach, describe, expect, test, vi } from "vitest";

// Integration guard: a valid Home Hero submission must be persisted to the CRM
// (not only emailed). Representative of the same wiring shared by every web
// lead form. Resend and the CRM module are mocked so no network/DB is touched.

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

import { sendLead } from "../lead-action";

function formFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("sendLead (Home Hero) → CRM", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "x" });
    process.env.RESEND_API_KEY = "test-key";
    process.env.CONTACT_EMAIL_TO = "to@example.com";
  });

  test("persists a valid lead to the CRM with the Home Hero origin", async () => {
    const res = await sendLead(
      formFor({
        name: "Rocío",
        email: "rocio@example.com",
        phone: "637284836",
        service: "Ecommerce",
        website: "",
        formLoadedAt: String(Date.now() - 5000),
      }),
    );

    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    const row = createWebhookLeadMock.mock.calls[0][0];
    expect(row.email).toBe("rocio@example.com");
    expect(row.channel).toBe("Web");
    expect(row.notes).toContain("Home (Hero)");
  });

  test("does not persist an invalid lead", async () => {
    const res = await sendLead(
      formFor({
        name: "x",
        email: "not-an-email",
        phone: "1",
        service: "",
        website: "",
        formLoadedAt: String(Date.now() - 5000),
      }),
    );

    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });
});
