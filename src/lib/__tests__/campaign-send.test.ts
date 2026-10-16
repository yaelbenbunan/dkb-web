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
  claimCampaignMock,
  insertCampaignRecipientsMock,
  listDueScheduledMock,
} = vi.hoisted(() => ({
  getCampaignMock: vi.fn(),
  updateCampaignMock: vi.fn(),
  setCampaignStatusMock: vi.fn(),
  claimCampaignMock: vi.fn(),
  insertCampaignRecipientsMock: vi.fn(),
  listDueScheduledMock: vi.fn(),
}));
vi.mock("../campaigns", () => ({
  getCampaign: getCampaignMock,
  updateCampaign: updateCampaignMock,
  setCampaignStatus: setCampaignStatusMock,
  claimCampaignForSending: claimCampaignMock,
  insertCampaignRecipients: insertCampaignRecipientsMock,
  listDueScheduledCampaigns: listDueScheduledMock,
  setRecipientMessageId: vi.fn(),
}));

const { listEmailableLeadsMock } = vi.hoisted(() => ({ listEmailableLeadsMock: vi.fn() }));
vi.mock("../imagina-leads", () => ({ listEmailableLeads: listEmailableLeadsMock }));

const { getMarcaPorIdMock, listEmailableLeadsDeMarcaMock } = vi.hoisted(() => ({
  getMarcaPorIdMock: vi.fn(),
  listEmailableLeadsDeMarcaMock: vi.fn(),
}));
vi.mock("../ventas/db", () => ({ getMarcaPorId: getMarcaPorIdMock }));
vi.mock("../ventas/leads-web", () => ({ listEmailableLeadsDeMarca: listEmailableLeadsDeMarcaMock }));

import {
  sendCampaign,
  sendCampaignTest,
  sendDueScheduledCampaigns,
  ALLOWED_SENDERS,
  CAMPAIGN_NOT_CLAIMABLE,
} from "../campaign-send";

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
    claimCampaignMock.mockReset().mockResolvedValue(true);
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

  test("el From lleva el nombre del remitente delante de la dirección", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      from_name: "Alicia de dinkbit",
      blocks: VALID_BLOCKS,
    });
    listEmailableLeadsMock.mockResolvedValue([makeLead("lead-1")]);

    await sendCampaign("c1", ["lead-1"]);

    expect(batchSendMock.mock.calls[0][0][0].from).toBe('"Alicia de dinkbit" <hola@dinkbit.es>');
  });

  test("sin nombre guardado, el From usa el nombre por defecto", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      from_name: null,
      blocks: VALID_BLOCKS,
    });
    listEmailableLeadsMock.mockResolvedValue([makeLead("lead-1")]);

    await sendCampaign("c1", ["lead-1"]);

    expect(batchSendMock.mock.calls[0][0][0].from).toBe('"dinkbit" <hola@dinkbit.es>');
  });

  test("un nombre con salto de línea no puede inyectar cabeceras", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      from_name: "Alicia\r\nBcc: espia@evil.com",
      blocks: VALID_BLOCKS,
    });
    listEmailableLeadsMock.mockResolvedValue([makeLead("lead-1")]);

    await sendCampaign("c1", ["lead-1"]);

    const from = batchSendMock.mock.calls[0][0][0].from;
    expect(from).not.toMatch(/[\r\n]/);
    expect(from.endsWith("<hola@dinkbit.es>")).toBe(true);
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

describe("reclamo de la campaña antes de enviar", () => {
  const CAMPAIGN = {
    id: "c1",
    status: "draft",
    subject: "Asunto",
    from_email: "hola@dinkbit.es",
    blocks: VALID_BLOCKS,
  };

  beforeEach(() => {
    batchSendMock.mockReset().mockResolvedValue({ data: { data: [{ id: "msg-1" }] }, error: null });
    getCampaignMock.mockReset().mockResolvedValue(CAMPAIGN);
    updateCampaignMock.mockReset().mockResolvedValue(undefined);
    setCampaignStatusMock.mockReset().mockResolvedValue(undefined);
    claimCampaignMock.mockReset().mockResolvedValue(true);
    insertCampaignRecipientsMock.mockReset().mockResolvedValue(undefined);
    listEmailableLeadsMock.mockReset().mockResolvedValue([makeLead("lead-1")]);
    listDueScheduledMock.mockReset().mockResolvedValue([]);
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.CAMPAIGN_SENDERS;
  });

  test("el envío manual solo reclama borradores o campañas con error, nunca programadas", async () => {
    await sendCampaign("c1", ["lead-1"]);
    expect(claimCampaignMock).toHaveBeenCalledWith("c1", ["draft", "failed"]);
  });

  test("el envío del cron solo reclama campañas programadas", async () => {
    await sendCampaign("c1", ["lead-1"], { scheduled: true });
    expect(claimCampaignMock).toHaveBeenCalledWith("c1", ["scheduled"]);
  });

  test("si otro envío ya la tiene, no manda nada", async () => {
    claimCampaignMock.mockResolvedValue(false);
    const res = await sendCampaign("c1", ["lead-1"]);
    expect(res).toEqual({ ok: false, sent: 0, skipped: 0, error: CAMPAIGN_NOT_CLAIMABLE });
    expect(batchSendMock).not.toHaveBeenCalled();
    expect(setCampaignStatusMock).not.toHaveBeenCalled();
  });

  test("una campaña programada antes de unificar el CRM (ids viejos) llega a los leads migrados", async () => {
    // scheduled_lead_ids guarda ids de imagina_leads; los leads ya son de ventas
    // y conservan aquel id como alternativo.
    listDueScheduledMock.mockResolvedValue([{ id: "c1", scheduled_lead_ids: ["imagina-viejo-1"] }]);
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, status: "scheduled" });
    listEmailableLeadsMock.mockResolvedValue([makeLead("v-uuid-1", { ids_alternativos: ["imagina-viejo-1"] })]);
    const results = await sendDueScheduledCampaigns(new Date("2026-09-20T08:00:00Z"));
    expect(results).toEqual([{ id: "c1", ok: true, sent: 1, skipped: 0 }]);
  });

  test("el cron manda las campañas vencidas a los destinatarios guardados", async () => {
    listDueScheduledMock.mockResolvedValue([{ id: "c1", scheduled_lead_ids: ["lead-1"] }]);
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, status: "scheduled" });

    const results = await sendDueScheduledCampaigns(new Date("2026-09-20T08:00:00Z"));

    expect(listDueScheduledMock).toHaveBeenCalledWith("2026-09-20T08:00:00.000Z");
    expect(results).toEqual([{ id: "c1", ok: true, sent: 1, skipped: 0 }]);
    expect(batchSendMock.mock.calls[0][0][0].to).toBe("lead-1@example.com");
    expect(setCampaignStatusMock).toHaveBeenLastCalledWith("c1", "sent");
  });

  test("una programada que ya no es válida queda como error, no se reintenta", async () => {
    listDueScheduledMock.mockResolvedValue([{ id: "c1", scheduled_lead_ids: ["lead-1"] }]);
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, status: "scheduled", subject: "" });

    await sendDueScheduledCampaigns();

    expect(batchSendMock).not.toHaveBeenCalled();
    expect(setCampaignStatusMock).toHaveBeenCalledWith("c1", "failed");
  });

  test("perder la carrera contra otra ejecución no la marca como error", async () => {
    listDueScheduledMock.mockResolvedValue([{ id: "c1", scheduled_lead_ids: ["lead-1"] }]);
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, status: "scheduled" });
    claimCampaignMock.mockResolvedValue(false);

    await sendDueScheduledCampaigns();

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

describe("texto previo del envío", () => {
  beforeEach(() => {
    batchSendMock.mockReset().mockResolvedValue({ data: { data: [{ id: "msg-1" }] }, error: null });
    getCampaignMock.mockReset();
    updateCampaignMock.mockReset().mockResolvedValue(undefined);
    setCampaignStatusMock.mockReset().mockResolvedValue(undefined);
    claimCampaignMock.mockReset().mockResolvedValue(true);
    insertCampaignRecipientsMock.mockReset().mockResolvedValue(undefined);
    listEmailableLeadsMock.mockReset().mockResolvedValue([makeLead("l1")]);
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.CAMPAIGN_SENDERS;
  });

  test("manda el preheader guardado, no el asunto", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      preheader: "Dos plazas libres en mayo",
      blocks: VALID_BLOCKS,
      status: "draft",
    });
    await sendCampaign("c1", ["l1"]);
    const html = batchSendMock.mock.calls[0][0][0].html as string;
    const oculto = html.slice(0, html.indexOf("<table"));
    expect(oculto).toContain("Dos plazas libres en mayo");
    expect(oculto).not.toContain("Asunto");
  });

  test("sin preheader guardado usa el cuerpo, nunca el asunto", async () => {
    getCampaignMock.mockResolvedValue({
      id: "c1",
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      preheader: null,
      blocks: VALID_BLOCKS,
      status: "draft",
    });
    await sendCampaign("c1", ["l1"]);
    const html = batchSendMock.mock.calls[0][0][0].html as string;
    const oculto = html.slice(0, html.indexOf("<table"));
    expect(oculto).toContain("Hola");
    expect(oculto).not.toContain("Asunto");
  });

  test("el envío de prueba respeta el preheader", async () => {
    await sendCampaignTest({
      subject: "Asunto",
      from_email: "hola@dinkbit.es",
      preheader: "Vista previa de la plantilla",
      blocks: VALID_BLOCKS,
      toEmails: ["qa@dinkbit.es"],
    });
    const html = batchSendMock.mock.calls[0][0][0].html as string;
    expect(html).toContain("Vista previa de la plantilla");
  });
});

describe("campañas de una marca de ventas", () => {
  const HYDRUP = { id: "m-hyd", slug: "hydrup", modulos: ["campanas"], campanas_remitentes: ["hola@hydrup.es"] };
  const CAMPAIGN = {
    id: "c9",
    status: "draft",
    subject: "Asunto",
    from_email: "hola@hydrup.es",
    from_name: "Hydrup",
    blocks: VALID_BLOCKS,
    marca_id: "m-hyd",
  };

  beforeEach(() => {
    batchSendMock.mockReset().mockResolvedValue({ data: { data: [{ id: "msg-9" }] }, error: null });
    getCampaignMock.mockReset().mockResolvedValue(CAMPAIGN);
    updateCampaignMock.mockReset().mockResolvedValue(undefined);
    setCampaignStatusMock.mockReset().mockResolvedValue(undefined);
    claimCampaignMock.mockReset().mockResolvedValue(true);
    insertCampaignRecipientsMock.mockReset().mockResolvedValue(undefined);
    listEmailableLeadsMock.mockReset().mockResolvedValue([makeLead("dink-1")]);
    listEmailableLeadsDeMarcaMock.mockReset().mockResolvedValue([makeLead("hyd-1")]);
    getMarcaPorIdMock.mockReset().mockResolvedValue(HYDRUP);
    listDueScheduledMock.mockReset().mockResolvedValue([]);
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.CAMPAIGN_SENDERS;
  });

  test("los destinatarios salen de los leads de la marca de la campaña", async () => {
    const res = await sendCampaign("c9", ["hyd-1", "dink-1"]);
    expect(res).toEqual({ ok: true, sent: 1, skipped: 1 });
    expect(listEmailableLeadsDeMarcaMock).toHaveBeenCalledWith("m-hyd");
    expect(listEmailableLeadsMock).not.toHaveBeenCalled();
    const payload = batchSendMock.mock.calls[0][0];
    expect(payload[0].to).toBe("hyd-1@example.com");
    expect(payload[0].from).toBe('"Hydrup" <hola@hydrup.es>');
    expect(payload[0].html).toContain("id=hyd-1&amp;token=");
    expect(insertCampaignRecipientsMock.mock.calls[0][0][0]).toMatchObject({ campaign_id: "c9", lead_id: "hyd-1", status: "sent" });
  });

  test("un id de dinkbit no se cuela en una campaña de otra marca", async () => {
    const res = await sendCampaign("c9", ["dink-1"]);
    expect(res).toEqual({ ok: true, sent: 0, skipped: 1 });
    expect(batchSendMock).not.toHaveBeenCalled();
  });

  test("el remitente tiene que ser de la marca, no basta con que esté en la lista global", async () => {
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, from_email: "hola@dinkbit.es" });
    const res = await sendCampaign("c9", ["hyd-1"]);
    expect(res).toMatchObject({ ok: false, error: "from_email_not_allowed" });
    expect(batchSendMock).not.toHaveBeenCalled();
  });

  test("sin remitentes propios, la marca usa la lista global", async () => {
    getMarcaPorIdMock.mockResolvedValue({ ...HYDRUP, campanas_remitentes: [] });
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, from_email: "hola@dinkbit.es" });
    expect(await sendCampaign("c9", ["hyd-1"])).toMatchObject({ ok: true, sent: 1 });
  });

  test("con el módulo apagado no sale, y la programada queda como error", async () => {
    getMarcaPorIdMock.mockResolvedValue({ ...HYDRUP, modulos: [] });
    expect(await sendCampaign("c9", ["hyd-1"])).toMatchObject({ ok: false, error: "modulo_inactivo" });
    expect(claimCampaignMock).not.toHaveBeenCalled();

    listDueScheduledMock.mockResolvedValue([{ id: "c9", scheduled_lead_ids: ["hyd-1"] }]);
    getCampaignMock.mockResolvedValue({ ...CAMPAIGN, status: "scheduled" });
    await sendDueScheduledCampaigns();
    expect(batchSendMock).not.toHaveBeenCalled();
    expect(setCampaignStatusMock).toHaveBeenCalledWith("c9", "failed");
  });

  test("marca que ya no existe: no sale", async () => {
    getMarcaPorIdMock.mockResolvedValue(null);
    expect(await sendCampaign("c9", ["hyd-1"])).toMatchObject({ ok: false, error: "marca_not_found" });
    expect(batchSendMock).not.toHaveBeenCalled();
  });

  test("la prueba de una marca valida con sus remitentes", async () => {
    const base = { subject: "A", blocks: VALID_BLOCKS, toEmails: ["yo@dinkbit.com"] };
    expect(await sendCampaignTest({ ...base, from_email: "hola@hydrup.es", remitentes: ["hola@hydrup.es"] })).toEqual({ ok: true });
    expect(await sendCampaignTest({ ...base, from_email: "hola@dinkbit.es", remitentes: ["hola@hydrup.es"] })).toMatchObject({ ok: false });
  });
});
