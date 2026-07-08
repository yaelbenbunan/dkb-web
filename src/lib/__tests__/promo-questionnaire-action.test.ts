import { beforeEach, describe, expect, test, vi } from "vitest";

const { verifyMock, saveMock, uploadMock, createMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  saveMock: vi.fn(),
  uploadMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("../promo-token", () => ({ verifyPromoToken: verifyMock }));
vi.mock("../imagina-leads", () => ({
  savePromoQuestionnaire: saveMock,
  uploadPromoLogo: uploadMock,
  createWebhookLead: createMock,
}));

import { submitPromoQuestionnaire } from "../promo-questionnaire-action";

function formFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const answers = () => formFor({
  token: "tok", leadId: "lead-1", email: "lead@example.com",
  name: "Marta", businessName: "La Tostadora", phone: "600111222",
  activity: "Cafetería", sector: "Hostelería", services: "Café",
  need: "Web", currentWebsite: "", style: "Minimalista", colors: "Tierra",
  typography: "Serif", references: "", social: "@lt", extra: "",
  website: "", formLoadedAt: String(Date.now() - 5000),
});

describe("submitPromoQuestionnaire", () => {
  beforeEach(() => {
    verifyMock.mockReset().mockReturnValue(true);
    saveMock.mockReset().mockResolvedValue(undefined);
    uploadMock.mockReset().mockResolvedValue(null);
    createMock.mockReset().mockResolvedValue({ ok: true, id: "new-lead" });
    process.env.PROMO_TOKEN_SECRET = "sec";
  });

  test("saves the questionnaire against the token's lead", async () => {
    const res = await submitPromoQuestionnaire(answers());
    expect(res.ok).toBe(true);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0].leadId).toBe("lead-1");
    expect(saveMock.mock.calls[0][0].sector).toBe("Hostelería");
  });

  test("with an invalid token, creates a fresh lead and still saves", async () => {
    verifyMock.mockReturnValue(false);
    const res = await submitPromoQuestionnaire(answers());
    expect(res.ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(saveMock.mock.calls[0][0].leadId).toBe("new-lead");
  });

  test("rejects the honeypot without saving", async () => {
    const fd = answers();
    fd.set("website", "bot");
    const res = await submitPromoQuestionnaire(fd);
    expect(res.ok).toBe(false);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
