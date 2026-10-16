import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  requireUsuaria: vi.fn(),
  getMarcaPorId: vi.fn(),
  actualizarModulosMarca: vi.fn(),
  getCampaign: vi.fn(),
  crearCampanaDeMarca: vi.fn(),
  updateCampaign: vi.fn(),
  listEmailTemplates: vi.fn(),
  getBuiltinTemplates: vi.fn(),
  saveEmailTemplate: vi.fn(),
  scheduleCampaign: vi.fn(),
  cancelCampaignSchedule: vi.fn(),
  sendCampaign: vi.fn(),
  sendCampaignTest: vi.fn(),
  generateCampaignBlocks: vi.fn(),
  editCampaignBlocks: vi.fn(),
  uploadCampaignImage: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion, requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({ getMarcaPorId: m.getMarcaPorId, actualizarModulosMarca: m.actualizarModulosMarca }));
vi.mock("@/lib/campaigns", () => ({
  getCampaign: m.getCampaign,
  crearCampanaDeMarca: m.crearCampanaDeMarca,
  updateCampaign: m.updateCampaign,
  listEmailTemplates: m.listEmailTemplates,
  getBuiltinTemplates: m.getBuiltinTemplates,
  saveEmailTemplate: m.saveEmailTemplate,
  scheduleCampaign: m.scheduleCampaign,
  cancelCampaignSchedule: m.cancelCampaignSchedule,
}));
vi.mock("@/lib/campaign-send", () => ({
  ALLOWED_SENDERS: ["hola@dinkbit.es"],
  CAMPAIGN_NOT_CLAIMABLE: "campaign_not_claimable",
  sendCampaign: m.sendCampaign,
  sendCampaignTest: m.sendCampaignTest,
  validateCampaign: (c: { subject: string | null; from_email: string | null }, remitentes: string[]) =>
    !c.subject ? { ok: false, error: "missing_subject" } : remitentes.includes(c.from_email ?? "") ? { ok: true } : { ok: false, error: "from_email_not_allowed" },
}));
vi.mock("@/lib/campaign-ai", () => ({ generateCampaignBlocks: m.generateCampaignBlocks, editCampaignBlocks: m.editCampaignBlocks }));
vi.mock("@/lib/campaign-images", () => ({ uploadCampaignImage: m.uploadCampaignImage }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import {
  actualizarModulosAction,
  cancelarProgramacionCampanaAction,
  crearBorradorCampanaAction,
  enviarCampanaAction,
  enviarPruebaCampanaAction,
  guardarBloquesCampanaAction,
  guardarPlantillaCampanaAction,
  programarCampanaAction,
  subirImagenCampanaAction,
} from "@/app/(site)/panel/ventas/acciones-campanas";

const HYDRUP = { id: "m-hyd", slug: "hydrup", modulos: ["campanas"], campanas_remitentes: ["hola@hydrup.es"] };
const usuaria = { id: "u1", rol: "comercial", activa: true };
const CAMPANA = { id: "c1", marca_id: "m-hyd", subject: "Hola", from_email: "hola@hydrup.es", blocks: [], status: "draft" };

function fd(campos: [string, string | File][]) {
  const f = new FormData();
  campos.forEach(([k, v]) => f.append(k, v));
  return f;
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria, marca: HYDRUP });
  m.getCampaign.mockResolvedValue(CAMPANA);
  m.crearCampanaDeMarca.mockResolvedValue({ ok: true, id: "c-nueva" });
  m.sendCampaign.mockResolvedValue({ ok: true, sent: 2, skipped: 0 });
  m.sendCampaignTest.mockResolvedValue({ ok: true });
  m.scheduleCampaign.mockResolvedValue({ ok: true });
  m.cancelCampaignSchedule.mockResolvedValue(true);
  m.saveEmailTemplate.mockResolvedValue({ id: "t1" });
  m.uploadCampaignImage.mockResolvedValue({ ok: true, url: "https://x/img.png" });
});

describe("permisos y módulo", () => {
  test("pide acceso a la sección campañas de la marca", async () => {
    await crearBorradorCampanaAction("hydrup");
    expect(m.accesoMarcaAccion).toHaveBeenCalledWith("hydrup", "campanas");
  });

  test("sin permiso no hace nada", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    expect(await crearBorradorCampanaAction("hydrup")).toEqual({ error: "No tienes permiso para esto." });
    expect(await enviarCampanaAction("hydrup", "c1", "l1")).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.crearCampanaDeMarca).not.toHaveBeenCalled();
    expect(m.sendCampaign).not.toHaveBeenCalled();
  });

  test("con el módulo apagado no se crea ni se envía", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria, marca: { ...HYDRUP, modulos: [] } });
    expect(await crearBorradorCampanaAction("hydrup")).toEqual({ error: "El módulo de campañas no está activado en esta marca." });
    expect((await enviarCampanaAction("hydrup", "c1", "l1")).ok).toBe(false);
    expect(m.crearCampanaDeMarca).not.toHaveBeenCalled();
    expect(m.sendCampaign).not.toHaveBeenCalled();
  });

  test("una campaña de otra marca no se toca desde esta", async () => {
    m.getCampaign.mockResolvedValue({ ...CAMPANA, marca_id: "m-dink" });
    expect(await enviarCampanaAction("hydrup", "c1", "l1")).toEqual({ ok: false, error: "Campaña no encontrada." });
    expect(await guardarBloquesCampanaAction("hydrup", "c1", "[]")).toEqual({ ok: false, error: "Campaña no encontrada." });
    expect(await cancelarProgramacionCampanaAction("hydrup", "c1")).toEqual({ ok: false, error: "Campaña no encontrada." });
    const sub = await subirImagenCampanaAction("hydrup", fd([["campaignId", "c1"], ["file", new File(["x"], "a.png", { type: "image/png" })]]));
    expect(sub.ok).toBe(false);
    expect(m.sendCampaign).not.toHaveBeenCalled();
    expect(m.updateCampaign).not.toHaveBeenCalled();
    expect(m.cancelCampaignSchedule).not.toHaveBeenCalled();
    expect(m.uploadCampaignImage).not.toHaveBeenCalled();
  });

  test("una campaña sin marca (de antes) no es de Hydrup", async () => {
    m.getCampaign.mockResolvedValue({ ...CAMPANA, marca_id: null });
    expect((await enviarCampanaAction("hydrup", "c1", "l1")).ok).toBe(false);
  });
});

describe("acciones", () => {
  test("el borrador se crea con la marca; solo dinkbit puede caer a «sin marca»", async () => {
    expect(await crearBorradorCampanaAction("hydrup")).toEqual({ id: "c-nueva" });
    expect(m.crearCampanaDeMarca).toHaveBeenCalledWith({ marcaId: "m-hyd", sinMarcaSiFalta: false });

    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria, marca: { id: "m-dink", slug: "dinkbit" } });
    await crearBorradorCampanaAction("dinkbit");
    expect(m.crearCampanaDeMarca).toHaveBeenLastCalledWith({ marcaId: "m-dink", sinMarcaSiFalta: true });
  });

  test("sin la migración, una marca cliente recibe el aviso", async () => {
    m.crearCampanaDeMarca.mockResolvedValue({ ok: false, error: "missing_migration" });
    const r = await crearBorradorCampanaAction("hydrup");
    expect(r).toEqual({ error: expect.stringContaining("2026-10-16-ventas-campanas.sql") });
  });

  test("enviar manda la campaña y refresca la pantalla de la marca", async () => {
    expect(await enviarCampanaAction("hydrup", "c1", "l1, l2")).toEqual({ ok: true, sent: 2, skipped: 0 });
    expect(m.sendCampaign).toHaveBeenCalledWith("c1", ["l1", "l2"]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/hydrup/campanas", "layout");
  });

  test("la prueba usa los remitentes de la marca", async () => {
    await enviarPruebaCampanaAction("hydrup", "c1", "yo@dinkbit.com");
    expect(m.sendCampaignTest).toHaveBeenCalledWith(expect.objectContaining({ remitentes: ["hola@hydrup.es"], toEmails: ["yo@dinkbit.com"] }));
  });

  test("programar valida con los remitentes de la marca", async () => {
    const dentro = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    m.getCampaign.mockResolvedValue({ ...CAMPANA, from_email: "hola@dinkbit.es" });
    expect(await programarCampanaAction("hydrup", "c1", "l1", dentro)).toEqual({ ok: false, error: "Ese email de envío no está autorizado." });
    m.getCampaign.mockResolvedValue(CAMPANA);
    expect(await programarCampanaAction("hydrup", "c1", "l1", dentro)).toEqual({ ok: true });
    expect(m.scheduleCampaign).toHaveBeenCalledWith("c1", expect.any(String), ["l1"]);
  });

  test("guardar como plantilla la deja en la marca", async () => {
    m.getCampaign.mockResolvedValue({ ...CAMPANA, blocks: [{ id: "f", type: "footer", props: { orgLine: "Hydrup", unsubscribe: true } }] });
    expect(await guardarPlantillaCampanaAction("hydrup", "c1", "Verano", "")).toEqual({ ok: true });
    expect(m.saveEmailTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: "Verano", marcaId: "m-hyd", sinMarcaSiFalta: false }));
  });
});

describe("actualizarModulosAction", () => {
  beforeEach(() => {
    m.requireUsuaria.mockResolvedValue({ id: "a1", rol: "admin", activa: true });
    m.getMarcaPorId.mockResolvedValue({ ...HYDRUP, modulos: ["otro"] });
    m.actualizarModulosMarca.mockResolvedValue({ ok: true });
  });

  test("exige admin", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(actualizarModulosAction("m-hyd", null, fd([["campanas", "on"]]))).rejects.toThrow();
    expect(m.requireUsuaria).toHaveBeenCalledWith("admin");
    expect(m.actualizarModulosMarca).not.toHaveBeenCalled();
  });

  test("enciende campañas sin tocar los otros módulos y guarda los remitentes", async () => {
    const r = await actualizarModulosAction("m-hyd", null, fd([["campanas", "on"], ["remitentes", "hola@hydrup.es"]]));
    expect(r.ok).toBe(true);
    expect(m.actualizarModulosMarca).toHaveBeenCalledWith("m-hyd", { modulos: ["otro", "campanas"], campanas_remitentes: ["hola@hydrup.es"] });
  });

  test("un remitente inválido no guarda nada", async () => {
    const r = await actualizarModulosAction("m-hyd", null, fd([["remitentes", "nada"]]));
    expect(r.ok).toBe(false);
    expect(m.actualizarModulosMarca).not.toHaveBeenCalled();
  });

  test("devuelve el error de la base (p. ej. migración pendiente)", async () => {
    m.actualizarModulosMarca.mockResolvedValue({ ok: false, error: "Falta ejecutar en Supabase la migración" });
    expect(await actualizarModulosAction("m-hyd", null, fd([["campanas", "on"]]))).toEqual({ ok: false, error: "Falta ejecutar en Supabase la migración" });
  });
});
