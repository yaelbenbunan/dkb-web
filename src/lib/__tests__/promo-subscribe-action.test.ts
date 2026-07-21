import { beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock, createWebhookLeadMock, addOrUpdateMemberMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  createWebhookLeadMock: vi.fn(),
  addOrUpdateMemberMock: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: class { emails = { send: sendMock }; } }));
vi.mock("../imagina-leads", () => ({ createWebhookLead: createWebhookLeadMock }));
vi.mock("../mailchimp", () => ({ addOrUpdateMember: addOrUpdateMemberMock }));

import { subscribePromo } from "../promo-subscribe-action";

function formFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = () => formFor({
  name: "Ana",
  email: "lead@example.com",
  consent: "on",
  website: "",
  formLoadedAt: String(Date.now() - 5000),
});

describe("subscribePromo", () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ error: null });
    createWebhookLeadMock.mockReset().mockResolvedValue({ ok: true, id: "lead-1" });
    addOrUpdateMemberMock.mockReset().mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "test-key";
    process.env.PROMO_TOKEN_SECRET = "sec";
  });

  test("persists lead, subscribes to Mailchimp and emails the user", async () => {
    const res = await subscribePromo(valid());
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
    expect(createWebhookLeadMock.mock.calls[0][0].campaign).toBe("promo-verano-2026");
    expect(addOrUpdateMemberMock).toHaveBeenCalledWith("lead@example.com", ["promo-verano-2026"]);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("lead@example.com");
  });

  test("forwards an optional phone to the persisted lead", async () => {
    await subscribePromo(formFor({
      name: "Ana",
      email: "lead@example.com",
      phone: "600 123 456",
      consent: "on",
      website: "",
      formLoadedAt: String(Date.now() - 5000),
    }));
    expect(createWebhookLeadMock.mock.calls[0][0].phone).toBe("600 123 456");
  });

  test("forwards the name to the persisted lead", async () => {
    await subscribePromo(valid());
    expect(createWebhookLeadMock.mock.calls[0][0].name).toBe("Ana");
  });

  test("rejects when the name is missing and does not persist", async () => {
    const res = await subscribePromo(formFor({
      email: "lead@example.com", consent: "on", website: "", formLoadedAt: String(Date.now() - 5000),
    }));
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("omits the phone when the field is left empty", async () => {
    await subscribePromo(valid());
    expect(createWebhookLeadMock.mock.calls[0][0].phone).toBeNull();
  });

  test("rejects without consent and does not persist", async () => {
    const res = await subscribePromo(formFor({
      email: "lead@example.com", consent: "", website: "", formLoadedAt: String(Date.now() - 5000),
    }));
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("rejects the honeypot", async () => {
    const res = await subscribePromo(formFor({
      email: "lead@example.com", consent: "on", website: "bot", formLoadedAt: String(Date.now() - 5000),
    }));
    expect(res.ok).toBe(false);
    expect(createWebhookLeadMock).not.toHaveBeenCalled();
  });

  test("still succeeds if Mailchimp and Resend fail (lead already saved)", async () => {
    addOrUpdateMemberMock.mockResolvedValue({ ok: false, error: "network" });
    sendMock.mockResolvedValue({ error: { message: "down" } });
    const res = await subscribePromo(valid());
    expect(res.ok).toBe(true);
    expect(createWebhookLeadMock).toHaveBeenCalledTimes(1);
  });

  test("returns ok:false and skips Mailchimp+email when the lead cannot be persisted", async () => {
    createWebhookLeadMock.mockResolvedValue({ ok: false, error: "supabase_not_configured" });
    const res = await subscribePromo(valid());
    expect(res.ok).toBe(false);
    expect(addOrUpdateMemberMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
