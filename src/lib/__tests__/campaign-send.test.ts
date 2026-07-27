import { beforeEach, describe, expect, test, vi } from "vitest";

const { batchSendMock } = vi.hoisted(() => ({ batchSendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    batch = { send: batchSendMock };
  },
}));

const {
  getCampaignMock,
  updateCampaignMock,
  setCampaignStatusMock,
  insertCampaignRecipientsMock,
} = vi.hoisted(() => ({
  getCampaignMock: vi.fn(),
  updateCampaignMock: vi.fn(),
  setCampaignStatusMock: vi.fn(),
  insertCampaignRecipientsMock: vi.fn(),
}));
vi.mock("../campaigns", () => ({
  getCampaign: getCampaignMock,
  updateCampaign: updateCampaignMock,
  setCampaignStatus: setCampaignStatusMock,
  insertCampaignRecipients: insertCampaignRecipientsMock,
  setRecipientMessageId: vi.fn(),
}));

const { listEmailableLeadsMock } = vi.hoisted(() => ({ listEmailableLeadsMock: vi.fn() }));
vi.mock("../imagina-leads", () => ({ listEmailableLeads: listEmailableLeadsMock }));

import { sendCampaign, sendCampaignTest, ALLOWED_SENDERS } from "../campaign-send";

const VALID_BLOCKS = [
  { id: "1", type: "paragraph", props: { text: "Hola" } },
  { id: "f", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
];

function makeLead(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    email: `${id}@example.com`,
    consent: true,
    email_status: null,
    ...overrides,
  };
}

describe("ALLOWED_SENDERS", () => {
  test("por defecto incluye hola@dinkbit.es", () => {
    expect(ALLOWED_SENDERS).toContain("hola@dinkbit.es");
  });
});

describe("sendCampaign", () => {
  beforeEach(() => {
    batchSendMock.mockReset().mockResolvedValue({ data: { data: [{ id: "msg-1" }] }, error: null });
    getCampaignMock.mockReset();
    updateCampaignMock.mockReset().mockResolvedValue(undefined);
    setCampaignStatusMock.mockReset().mockResolvedValue(undefined);
    insertCampaignRecipientsMock.mockReset().mockResolvedValue(undefined);
    listEmailableLeadsMock.mockReset().mockResolvedValue([]);
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.CAMPAIGN_SENDERS;
  });

  test("excluye leads no emailables (consent/email/rebote) y los cuenta en skipped", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
    });
    listEmailableLeadsMock.mockResolvedValue([
      makeLead("lead-1"),
      makeLead("lead-2", { consent: false }),
      makeLead("lead-3", { email: null }),
      makeLead("lead-4", { email_status: "bounced" }),
    ]);

    const res = await sendCampaign("c1", ["lead-1", "lead-2", "lead-3", "lead-4"]);

    expect(res.ok).toBe(true);
    expect(res.sent).toBe(1);
    expect(res.skipped).toBe(3);
    expect(batchSendMock).toHaveBeenCalledTimes(1);
    const payload = batchSendMock.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0].to).toBe("lead-1@example.com");
  });

  test("trocea más de 100 leads emailables en 2 llamadas a batch.send", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
    });
    const leads = Array.from({ length: 120 }, (_, i) => makeLead(`lead-${i}`));
    listEmailableLeadsMock.mockResolvedValue(leads);
    batchSendMock.mockResolvedValue({
      data: { data: Array.from({ length: 100 }, (_, i) => ({ id: `msg-${i}` })) },
      error: null,
    });

    const res = await sendCampaign("c1", leads.map((l) => l.id));

    expect(batchSendMock).toHaveBeenCalledTimes(2);
    expect(batchSendMock.mock.calls[0][0]).toHaveLength(100);
    expect(batchSendMock.mock.calls[1][0]).toHaveLength(20);
    expect(res.sent).toBe(120);
    expect(res.skipped).toBe(0);
  });

  test("persiste el message_id devuelto por Resend vía insertCampaignRecipients", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
    });
    listEmailableLeadsMock.mockResolvedValue([makeLead("lead-1")]);
    batchSendMock.mockResolvedValue({ data: { data: [{ id: "msg-xyz" }] }, error: null });

    await sendCampaign("c1", ["lead-1"]);

    expect(insertCampaignRecipientsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        campaign_id: "c1",
        lead_id: "lead-1",
        email: "lead-1@example.com",
        message_id: "msg-xyz",
        status: "sent",
      }),
    ]);
  });

  test("un lote que falla se marca 'failed' sin abortar los demás", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
    });
    const leads = Array.from({ length: 120 }, (_, i) => makeLead(`lead-${i}`));
    listEmailableLeadsMock.mockResolvedValue(leads);
    batchSendMock
      .mockResolvedValueOnce({ data: null, error: { message: "rate_limited" } })
      .mockResolvedValueOnce({
        data: { data: Array.from({ length: 20 }, (_, i) => ({ id: `msg-${i}` })) },
        error: null,
      });

    const res = await sendCampaign("c1", leads.map((l) => l.id));

    expect(res.sent).toBe(20);
    expect(insertCampaignRecipientsMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ status: "failed" })]),
    );
  });

  test("from_email fuera de ALLOWED_SENDERS → ok:false y NO envía", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "otro@evil.com",
      blocks: VALID_BLOCKS,
    });

    const res = await sendCampaign("c1", ["lead-1"]);

    expect(res.ok).toBe(false);
    expect(batchSendMock).not.toHaveBeenCalled();
    expect(listEmailableLeadsMock).not.toHaveBeenCalled();
  });

  test("blocks vacíos → ok:false y NO envía", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: [],
    });

    const res = await sendCampaign("c1", ["lead-1"]);

    expect(res.ok).toBe(false);
    expect(batchSendMock).not.toHaveBeenCalled();
  });

  test("blocks inválidos (no parseables) → ok:false y NO envía", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: { not: "an-array" },
    });

    const res = await sendCampaign("c1", ["lead-1"]);

    expect(res.ok).toBe(false);
    expect(batchSendMock).not.toHaveBeenCalled();
  });

  test("asunto vacío → ok:false y NO envía", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "  ",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
    });

    const res = await sendCampaign("c1", ["lead-1"]);

    expect(res.ok).toBe(false);
    expect(batchSendMock).not.toHaveBeenCalled();
  });

  test("campaña ya enviada (status:'sent') → ok:false y NO reenvía", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      status: "sent",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
    });

    const res = await sendCampaign("c1", ["lead-1"]);

    expect(res).toEqual({ ok: false, sent: 0, skipped: 0, error: "La campaña ya fue enviada." });
    expect(batchSendMock).not.toHaveBeenCalled();
    expect(listEmailableLeadsMock).not.toHaveBeenCalled();
    expect(setCampaignStatusMock).not.toHaveBeenCalled();
  });
});

describe("sendCampaignTest", () => {
  beforeEach(() => {
    batchSendMock.mockReset().mockResolvedValue({ data: { data: [{ id: "msg-1" }] }, error: null });
    insertCampaignRecipientsMock.mockReset();
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.CAMPAIGN_SENDERS;
  });

  test("envía a direcciones de prueba sin tocar CRM ni recipients", async () => {
    const res = await sendCampaignTest({
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      blocks: VALID_BLOCKS,
      toEmails: ["test@dinkbit.es"],
    });

    expect(res.ok).toBe(true);
    expect(batchSendMock).toHaveBeenCalledTimes(1);
    const payload = batchSendMock.mock.calls[0][0];
    expect(payload[0].to).toBe("test@dinkbit.es");
    expect(payload[0].html).toContain("id=test&amp;token=test");
    expect(insertCampaignRecipientsMock).not.toHaveBeenCalled();
  });

  test("from_email fuera de ALLOWED_SENDERS → ok:false y NO envía", async () => {
    const res = await sendCampaignTest({
      subject: "Asunto",
      from_email: "otro@evil.com",
      blocks: VALID_BLOCKS,
      toEmails: ["test@dinkbit.es"],
    });

    expect(res.ok).toBe(false);
    expect(batchSendMock).not.toHaveBeenCalled();
  });
});
