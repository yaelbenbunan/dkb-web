import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  getMarcaPorSlug: vi.fn(),
  buscarLeadWeb: vi.fn(),
  crearLeadWeb: vi.fn(),
  actualizarLeadWeb: vi.fn(),
  registrarActividad: vi.fn(),
  listarLeadsEmailables: vi.fn(),
  actualizarEmailPorMensaje: vi.fn(),
  recipientsUpdate: vi.fn(),
  legacy: {
    createWebhookLead: vi.fn(),
    saveLead: vi.fn(),
    upsertKitDigital2026Lead: vi.fn(),
    createManualLead: vi.fn(),
    createLeadsBulk: vi.fn(),
    updateLeadReview: vi.fn(),
    getLeadNotes: vi.fn(),
    updateLeadField: vi.fn(),
    setLeadEmailSent: vi.fn(),
    setLeadEmailStatusByMessageId: vi.fn(),
    setLeadConsent: vi.fn(),
    listEmailableLeads: vi.fn(),
    getLeadPdfPath: vi.fn(),
    marcarEmailLeadLegacy: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("../ventas/db", () => ({
  getMarcaPorSlug: m.getMarcaPorSlug,
  buscarLeadWeb: m.buscarLeadWeb,
  crearLeadWeb: m.crearLeadWeb,
  actualizarLeadWeb: m.actualizarLeadWeb,
  registrarActividad: m.registrarActividad,
  listarLeadsEmailables: m.listarLeadsEmailables,
  actualizarEmailPorMensaje: m.actualizarEmailPorMensaje,
}));
vi.mock("../imagina-leads-legacy", () => m.legacy);
vi.mock("../supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const q: Record<string, unknown> = {};
      q.update = vi.fn(() => q);
      q.eq = vi.fn(() => q);
      q.in = vi.fn(() => q);
      q.select = m.recipientsUpdate;
      return q;
    },
  }),
}));

import {
  createLeadsBulk,
  createWebhookLead,
  getLeadPdfPath,
  listEmailableLeads,
  saveLead,
  setCampaignRecipientStatusByMessageId,
  setLeadConsent,
  setLeadEmailSent,
  setLeadEmailStatusByMessageId,
  upsertKitDigital2026Lead,
} from "../ventas/leads-web";

beforeEach(() => {
  for (const f of [m.getMarcaPorSlug, m.buscarLeadWeb, m.crearLeadWeb, m.actualizarLeadWeb, m.registrarActividad, m.listarLeadsEmailables, m.actualizarEmailPorMensaje, m.recipientsUpdate, ...Object.values(m.legacy)]) f.mockReset();
  m.getMarcaPorSlug.mockResolvedValue({ id: "m-dink", slug: "dinkbit", estado: "activa" });
  m.actualizarLeadWeb.mockResolvedValue({ ok: true });
  m.registrarActividad.mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("altas de la web", () => {
  test("alta nueva: crea en dinkbit con origen web, canal, campaña, fase y etiqueta", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v1" });
    const r = await createWebhookLead({ name: "Ana", email: "ana@x.es", phone: "600111222", channel: "Meta", campaign: "kd", status: "kit-digital", consent: true, notes: "Hola" });
    expect(r).toEqual({ ok: true, id: "v1" });
    expect(m.crearLeadWeb).toHaveBeenCalledWith(
      "m-dink",
      expect.objectContaining({ negocio: "Ana", contacto: "Ana", email: "ana@x.es", telefono: "600111222", origen: "web", origen_detalle: "kd", canal: "Meta", campana: "kd", fase: "interesado", etiquetas: ["kit-digital"], consentimiento: true }),
    );
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "v1", tipo: "nota", nota: "Hola" }));
  });

  test("sin canal, como antes, es Meta", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v1" });
    await createWebhookLead({ email: "a@x.es" });
    expect(m.crearLeadWeb.mock.calls[0][1].canal).toBe("Meta");
  });

  test("repetido por email desde otro formulario: no duplica, completa vacíos y conserva canal y campaña", async () => {
    m.buscarLeadWeb.mockResolvedValue({ id: "v1", negocio: "Ana", contacto: "Ana", telefono: null, email: "ana@x.es", web: null, canal: "Meta", campana: "kd", etiquetas: ["kit-digital"], id_externo: null, ids_externos: [], extra: {}, consentimiento: null });
    const r = await createWebhookLead({ email: "ANA@x.es", phone: "600111222", channel: "Web", campaign: "web-299" });
    expect(r).toEqual({ ok: true, id: "v1" });
    expect(m.crearLeadWeb).not.toHaveBeenCalled();
    const cambios = m.actualizarLeadWeb.mock.calls[0][1];
    expect(cambios).toMatchObject({ telefono: "600111222" });
    expect(cambios.canal).toBeUndefined();
    expect(cambios.campana).toBeUndefined();
    expect(m.registrarActividad.mock.calls[0][0].nota).toContain("Ha vuelto a llegar desde la web (Web · web-299)");
  });

  test("repetido: une etiquetas, sube el consentimiento (nunca lo baja) y guarda el id externo nuevo", async () => {
    m.buscarLeadWeb.mockResolvedValue({ id: "v1", negocio: "Ana", contacto: "Ana", telefono: "600", email: "a@x.es", web: null, canal: "Meta", campana: "kd", etiquetas: ["promo"], id_externo: "old-1", ids_externos: [], extra: { sector: "dental" }, consentimiento: false });
    await createWebhookLead({ id: "meta-9", email: "a@x.es", status: "kit-digital", consent: true });
    const cambios = m.actualizarLeadWeb.mock.calls[0][1];
    expect(cambios.etiquetas).toEqual(["promo", "kit-digital"]);
    expect(cambios.consentimiento).toBe(true);
    expect(cambios.ids_externos).toEqual(["meta-9"]);
    // Un formulario con la casilla sin marcar no retira un «sí» anterior: nada que actualizar.
    m.buscarLeadWeb.mockResolvedValue({ id: "v1", negocio: "Ana", contacto: "Ana", telefono: "600", email: "a@x.es", web: null, canal: "Meta", campana: "kd", etiquetas: ["promo", "kit-digital"], id_externo: "old-1", ids_externos: ["meta-9"], extra: { sector: "dental" }, consentimiento: true });
    await createWebhookLead({ email: "a@x.es", consent: false });
    expect(m.actualizarLeadWeb).toHaveBeenCalledTimes(1);
  });

  test("el mismo id externo otra vez (reintento de Zapier) no se apunta dos veces", async () => {
    m.buscarLeadWeb.mockResolvedValue({ id: "v1", negocio: "Ana", contacto: "Ana", telefono: "600", email: "a@x.es", web: null, canal: "Meta", campana: null, etiquetas: [], id_externo: "meta-9", ids_externos: [], extra: {}, consentimiento: null });
    await createWebhookLead({ id: "meta-9", email: "a@x.es" });
    expect(m.actualizarLeadWeb.mock.calls[0]?.[1]?.ids_externos).toBeUndefined();
  });

  test("saveLead con id de preview: lo guarda como id_externo y el PDF en extra", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v2" });
    await saveLead({ id: "prev-123", name: "Luis", email: "l@x.es", pdfPath: "prev-123.pdf", businessName: "Fisio Luis", style: "moderno" });
    expect(m.buscarLeadWeb).toHaveBeenCalledWith("m-dink", { id: "prev-123", email: "l@x.es", telefono: undefined });
    expect(m.crearLeadWeb).toHaveBeenCalledWith("m-dink", expect.objectContaining({ id_externo: "prev-123", negocio: "Fisio Luis", contacto: "Luis", extra: expect.objectContaining({ pdf_path: "prev-123.pdf", style: "moderno" }) }));
  });

  test("sin nombre de negocio ni persona usa el email; sin nada, el id", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v3" });
    await createWebhookLead({ email: "solo@x.es" });
    expect(m.crearLeadWeb.mock.calls[0][1].negocio).toBe("solo@x.es");
    await createWebhookLead({ id: "meta-1", phone: "600111222" });
    expect(m.crearLeadWeb.mock.calls[1][1].negocio).toBe("(sin nombre) meta-1");
  });

  test("si otro alta se adelanta (duplicado), busca otra vez y completa", async () => {
    m.buscarLeadWeb.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "v5", negocio: "X", contacto: null, telefono: null, email: "x@x.es", web: null, canal: "Meta", campana: null, etiquetas: [], id_externo: null, ids_externos: [], extra: {}, consentimiento: null });
    m.crearLeadWeb.mockResolvedValue({ ok: false, error: "duplicado" });
    expect(await createWebhookLead({ email: "x@x.es", name: "X" })).toEqual({ ok: true, id: "v5" });
  });

  test("sin la migración no se pierde el lead: va a imagina_leads", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValue({ ok: false, error: "x", faltaMigracion: true });
    m.legacy.createWebhookLead.mockResolvedValue({ ok: true, id: "old-1" });
    expect(await createWebhookLead({ email: "a@x.es" })).toEqual({ ok: true, id: "old-1" });
    expect(m.legacy.createWebhookLead).toHaveBeenCalledWith({ email: "a@x.es" });
  });

  test("si Supabase lanza, también respaldo", async () => {
    m.buscarLeadWeb.mockRejectedValue(new Error("red"));
    m.legacy.saveLead.mockResolvedValue(undefined);
    await saveLead({ id: "prev-1", email: "a@x.es" });
    expect(m.legacy.saveLead).toHaveBeenCalled();
  });

  test("Kit Digital 2026: alta con la campaña y la etiqueta; si ya estaba, matched", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValue({ ok: true, id: "v6" });
    expect(await upsertKitDigital2026Lead({ email: "k@x.es", campaign: "Kit Digital 2026", status: "kit-digital" })).toEqual({ ok: true, id: "v6", matched: false });
    m.buscarLeadWeb.mockResolvedValue({ id: "v6", negocio: "k@x.es", contacto: null, telefono: null, email: "k@x.es", web: null, canal: "Meta", campana: "Kit Digital 2026", etiquetas: ["kit-digital"], id_externo: null, ids_externos: [], extra: {}, consentimiento: null });
    expect(await upsertKitDigital2026Lead({ email: "k@x.es", sector: "dental" })).toEqual({ ok: true, id: "v6", matched: true });
  });

  test("alta masiva (prospección, CSV): una a una, origen lista, cuenta las insertadas", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    m.crearLeadWeb.mockResolvedValueOnce({ ok: true, id: "a" }).mockResolvedValueOnce({ ok: true, id: "b" });
    expect(await createLeadsBulk([{ name: "A", email: "a@x.es" }, { name: "B", phone: "600111222" }])).toEqual({ ok: true, inserted: 2 });
    expect(m.crearLeadWeb.mock.calls[0][1].origen).toBe("lista");
  });
});

describe("ids nuevos y viejos", () => {
  test("setLeadConsent con un id viejo de imagina encuentra el lead migrado", async () => {
    m.buscarLeadWeb.mockResolvedValue({ id: "v1" });
    await setLeadConsent("imagina-viejo-1", false);
    expect(m.buscarLeadWeb).toHaveBeenCalledWith("m-dink", { id: "imagina-viejo-1" });
    expect(m.actualizarLeadWeb).toHaveBeenCalledWith("v1", { consentimiento: false });
    expect(m.legacy.setLeadConsent).not.toHaveBeenCalled();
  });

  test("setLeadConsent de un lead que solo está en imagina_leads usa el legacy", async () => {
    m.buscarLeadWeb.mockResolvedValue(null);
    await setLeadConsent("solo-viejo", false);
    expect(m.legacy.setLeadConsent).toHaveBeenCalledWith("solo-viejo", false);
  });

  test("setLeadEmailSent guarda el estado y el mensaje en el lead de ventas", async () => {
    m.buscarLeadWeb.mockResolvedValue({ id: "v1" });
    await setLeadEmailSent("v1", "re_1");
    expect(m.actualizarLeadWeb).toHaveBeenCalledWith("v1", expect.objectContaining({ email_estado: "sent", email_mensaje_id: "re_1" }));
  });

  test("estado por mensaje: si no está en ventas, prueba en imagina_leads", async () => {
    m.actualizarEmailPorMensaje.mockResolvedValue(0);
    m.legacy.setLeadEmailStatusByMessageId.mockResolvedValue(1);
    expect(await setLeadEmailStatusByMessageId("re_9", "delivered")).toBe(1);
    m.actualizarEmailPorMensaje.mockResolvedValue(1);
    expect(await setLeadEmailStatusByMessageId("re_9", "delivered")).toBe(1);
    expect(m.legacy.setLeadEmailStatusByMessageId).toHaveBeenCalledTimes(1);
  });

  test("rebote de campaña: el destinatario y el lead (por id nuevo o viejo) quedan marcados", async () => {
    m.recipientsUpdate.mockResolvedValue({ data: [{ id: "r1", lead_id: "imagina-viejo" }, { id: "r2", lead_id: "solo-viejo" }], error: null });
    m.buscarLeadWeb.mockResolvedValueOnce({ id: "v1" }).mockResolvedValueOnce(null);
    expect(await setCampaignRecipientStatusByMessageId("re_1", "complained")).toBe(2);
    expect(m.actualizarLeadWeb).toHaveBeenCalledWith("v1", expect.objectContaining({ email_estado: "complained", consentimiento: false }));
    expect(m.legacy.marcarEmailLeadLegacy).toHaveBeenCalledWith("solo-viejo", "complained");
  });

  test("el PDF del preview: primero ventas, luego imagina_leads", async () => {
    m.buscarLeadWeb.mockResolvedValueOnce({ id: "v1", extra: { pdf_path: "p.pdf" } });
    expect(await getLeadPdfPath("prev-1")).toBe("p.pdf");
    m.buscarLeadWeb.mockResolvedValueOnce(null);
    m.legacy.getLeadPdfPath.mockResolvedValue("viejo.pdf");
    expect(await getLeadPdfPath("prev-2")).toBe("viejo.pdf");
  });
});

describe("destinatarios de campañas", () => {
  test("listEmailableLeads devuelve la forma LeadRow, con status = fase", async () => {
    m.listarLeadsEmailables.mockResolvedValue([
      { id: "v1", negocio: "Clínica", contacto: "Ana", email: "a@x.es", telefono: null, fase: "interesado", canal: "Meta", campana: "kd", consentimiento: true, email_estado: null, archivado: false, extra: {}, created_at: "2026-10-01" },
    ]);
    const [l] = await listEmailableLeads({ status: "interesado" });
    expect(m.listarLeadsEmailables).toHaveBeenCalledWith("m-dink", { fase: "interesado", campana: undefined, canal: undefined });
    expect(l).toMatchObject({ id: "v1", name: "Ana", business_name: "Clínica", email: "a@x.es", status: "interesado", channel: "Meta", campaign: "kd", consent: true, archived: false });
  });

  test("sin la migración, los de imagina_leads", async () => {
    m.listarLeadsEmailables.mockRejectedValue(Object.assign(new Error("x"), { faltaMigracion: true }));
    m.legacy.listEmailableLeads.mockResolvedValue([{ id: "old" }]);
    expect(await listEmailableLeads()).toEqual([{ id: "old" }]);
  });
});
