import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  getMarcaPorSlug: vi.fn(),
  listContactosLeads: vi.fn(),
  listExclusiones: vi.fn(),
  crearLeads: vi.fn(),
  registrarImportacion: vi.fn(),
  buscarLeadPorContacto: vi.fn(),
  getLead: vi.fn(),
  registrarActividad: vi.fn(),
  marcarLeadPromocionado: vi.fn(),
  createManualLead: vi.fn(),
}));
vi.mock("../ventas/db", () => m);
vi.mock("../imagina-leads", () => ({ createManualLead: m.createManualLead }));

import {
  autenticarWebhook,
  previsualizarImportacion,
  importarLeadsCsv,
  recibirLeadAnuncio,
  recibirLeadFormulario,
  crearLeadManual,
  registrarLlamada,
  marcarMuestrasEnviadas,
  cambiarFaseManual,
  moverLead,
  pasarLeadAlEmbudo,
} from "../ventas/servicios";

const MARCA = { id: "m1", slug: "hydrup", nombre: "Hydrup", webhook_secret: "secreto-largo" } as never;
const MARCA_ACTIVA = { id: "m1", slug: "hydrup", nombre: "Hydrup", webhook_secret: "secreto-largo", estado: "activa" } as never;
const USUARIA = { id: "u1", nombre: "Paula", rol: "comercial", activa: true } as never;
const CSV = "negocio,telefono,email\nGym Sol,600111222,\nFisio Norte,,fisio@norte.es\nYa Existe,,ya@a.es\nCliente,,cliente@a.es";

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.listContactosLeads.mockResolvedValue([{ email: "ya@a.es", telefono: null }]);
  m.listExclusiones.mockResolvedValue([{ email: "cliente@a.es", telefono: null, cif: null }]);
  m.crearLeads.mockResolvedValue({ ok: true, creados: 2 });
  m.registrarActividad.mockResolvedValue({ ok: true });
});

describe("importarLeadsCsv", () => {
  test("guarda solo los nuevos, con origen lista, y registra la importación", async () => {
    const r = await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: CSV, nombreFichero: "gyms.csv", nombreLista: "Gimnasios Madrid" });
    expect(r).toEqual({ ok: true, creados: 2, duplicados: 1, excluidos: 1 });
    const arg = m.crearLeads.mock.calls[0][0];
    expect(arg).toMatchObject({ marcaId: "m1", usuariaId: "u1", origen: "lista", origenDetalle: "Gimnasios Madrid" });
    expect(arg.leads.map((l: { negocio: string }) => l.negocio)).toEqual(["Gym Sol", "Fisio Norte"]);
    expect(m.registrarImportacion).toHaveBeenCalledWith(expect.objectContaining({ tipo: "leads", filas_totales: 4, filas_guardadas: 2 }));
  });

  test("con una sola fila errónea no se guarda nada", async () => {
    const r = await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: "negocio,telefono\nGym,600111222\n,600333444", nombreFichero: "x.csv", nombreLista: "L" });
    expect(r).toMatchObject({ ok: false, errores: [{ line: 3 }] });
    expect(m.crearLeads).not.toHaveBeenCalled();
  });

  test("pide nombre de lista", async () => {
    expect(await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: CSV, nombreFichero: "x.csv", nombreLista: "  " })).toMatchObject({ ok: false });
  });

  test("si la base rechaza el lote, se informa y no se registra importación", async () => {
    m.crearLeads.mockResolvedValue({ ok: false, error: "boom" });
    const r = await importarLeadsCsv({ marca: MARCA, usuaria: USUARIA, csv: CSV, nombreFichero: "x.csv", nombreLista: "L" });
    expect(r.ok).toBe(false);
    expect(m.registrarImportacion).not.toHaveBeenCalled();
  });
});

describe("recibirLeadAnuncio", () => {
  test("marca desconocida o secreto incorrecto dan el mismo 401", async () => {
    m.getMarcaPorSlug.mockResolvedValueOnce(null).mockResolvedValueOnce(MARCA);
    expect((await recibirLeadAnuncio({ slug: "nope", secreto: "x", datos: {} })).status).toBe(401);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "otro", datos: {} })).status).toBe(401);
  });

  test("cuerpo sin contacto → 400", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Gym" } })).status).toBe(400);
  });

  test("lead nuevo → se crea con origen anuncio y la campaña", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es", campaign_name: "Muestras" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: false } });
    expect(m.crearLeads.mock.calls[0][0]).toMatchObject({ usuariaId: null, origen: "anuncio", origenDetalle: "Muestras", leads: [{ negocio: "Box X", excluido: false }] });
  });

  test("lead de un cliente previo → se guarda marcado como excluido", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Cliente", email: "cliente@a.es" } });
    expect(m.crearLeads.mock.calls[0][0].leads[0].excluido).toBe(true);
  });

  test("lead repetido → nota en su historial, 200 y sin crear otro", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l7" });
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Ya", email: "ya@a.es", campana: "Muestras" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
    expect(m.crearLeads).not.toHaveBeenCalled();
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "l7", usuariaId: null, tipo: "nota" }));
  });

  test("un cuerpo que no es un objeto → 400", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: [1, 2] })).status).toBe(400);
  });
});

describe("recibirLeadFormulario", () => {
  test("marca desconocida → 404 unknown_brand", async () => {
    m.getMarcaPorSlug.mockResolvedValueOnce(null);
    const r = await recibirLeadFormulario({ slug: "nope", datos: { negocio: "Gym", email: "gym@a.es" } });
    expect(r).toEqual({ status: 404, body: { ok: false, error: "unknown_brand" } });
  });

  test("marca no activa → 404 unknown_brand", async () => {
    m.getMarcaPorSlug.mockResolvedValue({ id: "m1", slug: "hydrup", nombre: "Hydrup", webhook_secret: "secreto-largo", estado: "borrador" });
    const r = await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Gym", email: "gym@a.es" } });
    expect(r).toEqual({ status: 404, body: { ok: false, error: "unknown_brand" } });
  });

  test("lead nuevo → se crea con origenDetalle landing-b2b aunque el cuerpo traiga otra campaña", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    const r = await recibirLeadFormulario({
      slug: "hydrup",
      datos: { negocio: "Box X", email: "box@x.es", campana: "otra-campana" },
    });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: false } });
    expect(m.crearLeads.mock.calls[0][0]).toMatchObject({ origen: "anuncio", origenDetalle: "landing-b2b" });
  });

  test("si registrarActividad falla al apuntar la nota inicial, el lead ya se guardó y responde 200 igual", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    m.registrarActividad.mockRejectedValueOnce(new Error("db caída"));
    const r = await recibirLeadFormulario({
      slug: "hydrup",
      datos: { negocio: "Box X", email: "box@x.es", comentarios: "Hola" },
    });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: false } });
  });

  test("con socios/reparto/comentarios en el cuerpo, se registra una nota con esos datos", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    await recibirLeadFormulario({
      slug: "hydrup",
      datos: {
        negocio: "Box X",
        email: "box@x.es",
        socios: "3 centros",
        reparto: "Semanal",
        comentarios: "Interesados en la caja personalizable",
      },
    });
    expect(m.registrarActividad).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "l-new",
        tipo: "nota",
        nota: expect.stringContaining("Socios: 3 centros"),
      }),
    );
    const nota = m.registrarActividad.mock.calls[0][0].nota as string;
    expect(nota).toContain("Reparto: Semanal");
    expect(nota).toContain("Comentarios: Interesados en la caja personalizable");
  });

  test("lead repetido → 200 duplicado:true y la nota empieza indicando que ha vuelto desde la web", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l7" });
    const r = await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Ya", email: "ya@a.es" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
    expect(m.crearLeads).not.toHaveBeenCalled();
    expect(m.registrarActividad).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "l7",
        tipo: "nota",
        nota: expect.stringMatching(/^Ha vuelto a llegar desde la web \(landing-b2b\)\./),
      }),
    );
  });

  test("cuerpo inválido o sin contacto → 400", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    expect((await recibirLeadFormulario({ slug: "hydrup", datos: [1, 2] })).status).toBe(400);
    expect((await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Gym" } })).status).toBe(400);
  });
});

describe("crearLeadManual", () => {
  const DATOS = { negocio: "Gym Nuevo", tipo_negocio: null, contacto: "", telefono: "622333444", email: "", ciudad: "", cif: "", web: "" };

  test("crea y devuelve el id del lead", async () => {
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l9" });
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: DATOS })).toEqual({ ok: true, leadId: "l9" });
    expect(m.crearLeads.mock.calls[0][0]).toMatchObject({ origen: "manual", origenDetalle: null });
  });

  test("rechaza excluidos y duplicados con un mensaje claro", async () => {
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: { ...DATOS, telefono: "", email: "cliente@a.es" } })).toMatchObject({ ok: false });
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: { ...DATOS, telefono: "", email: "ya@a.es" } })).toMatchObject({ ok: false });
    expect(m.crearLeads).not.toHaveBeenCalled();
  });
});

describe("registro de trabajo sobre un lead", () => {
  test("la llamada mueve la fase y borra el seguimiento si cierra el lead", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "muestras" });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_interesa", nota: "Ya tienen proveedor", proximo_seguimiento: "2026-09-30" } });
    expect(m.registrarActividad).toHaveBeenCalledWith({
      leadId: "l1",
      usuariaId: "u1",
      tipo: "llamada",
      resultado: "no_interesa",
      nota: "Ya tienen proveedor",
      faseNueva: "no_interesa",
      proximoSeguimiento: null,
    });
  });

  test("si la fase no cambia no se pide cambio de fase", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "contactado" });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: "2026-09-20" } });
    expect(m.registrarActividad.mock.calls[0][0]).toMatchObject({ faseNueva: null, proximoSeguimiento: "2026-09-20" });
  });

  test("lead inexistente", async () => {
    m.getLead.mockResolvedValue(null);
    expect(await registrarLlamada({ usuaria: USUARIA, leadId: "x", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: null } })).toEqual({
      ok: false,
      error: "Lead no encontrado.",
    });
  });

  test("muestras enviadas pasa a fase muestras salvo si ya es cliente", async () => {
    m.getLead.mockResolvedValueOnce({ id: "l1", fase: "interesado" }).mockResolvedValueOnce({ id: "l2", fase: "cliente" });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l1", datos: { nota: "Pack 6", proximo_seguimiento: "2026-09-25" } });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l2", datos: { nota: "", proximo_seguimiento: null } });
    expect(m.registrarActividad.mock.calls[0][0]).toMatchObject({ tipo: "muestras_enviadas", faseNueva: "muestras" });
    expect(m.registrarActividad.mock.calls[1][0]).toMatchObject({ faseNueva: null });
  });

  test("cambio de fase manual queda firmado; a la misma fase no hace nada", async () => {
    m.getLead.mockResolvedValueOnce({ id: "l1", fase: "nuevo" }).mockResolvedValueOnce({ id: "l1", fase: "perdido" });
    await cambiarFaseManual({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "Cerró" } });
    expect(m.registrarActividad).toHaveBeenCalledWith({ leadId: "l1", usuariaId: "u1", tipo: "cambio_fase", nota: "Cerró", faseNueva: "perdido" });
    expect(await cambiarFaseManual({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "" } })).toEqual({ ok: true });
    expect(m.registrarActividad).toHaveBeenCalledTimes(1);
  });
});

describe("moverLead (tablero)", () => {
  test("lead inexistente", async () => {
    m.getLead.mockResolvedValue(null);
    expect(await moverLead({ usuaria: USUARIA, leadId: "x", fase: "contactado" })).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("a la misma fase no escribe nada", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "interesado" });
    expect(await moverLead({ usuaria: USUARIA, leadId: "l1", fase: "interesado" })).toEqual({ ok: true });
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("a muestras cuenta como envío de muestras y no toca el seguimiento", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "interesado" });
    expect(await moverLead({ usuaria: USUARIA, leadId: "l1", fase: "muestras" })).toEqual({ ok: true });
    expect(m.registrarActividad).toHaveBeenCalledWith({ leadId: "l1", usuariaId: "u1", tipo: "muestras_enviadas", faseNueva: "muestras" });
    expect(m.registrarActividad.mock.calls[0][0]).not.toHaveProperty("proximoSeguimiento");
  });

  test("al resto de fases es un cambio de fase sin nota ni seguimiento", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "nuevo" });
    await moverLead({ usuaria: USUARIA, leadId: "l1", fase: "contactado" });
    await moverLead({ usuaria: USUARIA, leadId: "l1", fase: "no_interesa" });
    expect(m.registrarActividad.mock.calls[0][0]).toEqual({ leadId: "l1", usuariaId: "u1", tipo: "cambio_fase", faseNueva: "contactado" });
    expect(m.registrarActividad.mock.calls[1][0]).toEqual({ leadId: "l1", usuariaId: "u1", tipo: "cambio_fase", faseNueva: "no_interesa" });
  });

  test("si la base falla se devuelve el error", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "nuevo" });
    m.registrarActividad.mockResolvedValue({ ok: false, error: "No se pudo guardar. Vuelve a intentarlo." });
    expect(await moverLead({ usuaria: USUARIA, leadId: "l1", fase: "cliente" })).toEqual({ ok: false, error: "No se pudo guardar. Vuelve a intentarlo." });
  });
});

describe("pasarLeadAlEmbudo", () => {
  const LEAD = {
    id: "l1",
    negocio: "Panadería Sol",
    contacto: "Ana",
    telefono: "660415514",
    email: "ana@panaderia.es",
    web: "https://panaderiasol.es",
    origen_detalle: "campana-web-express",
    promocionado_at: null,
  };

  test("lead inexistente", async () => {
    m.getLead.mockResolvedValue(null);
    expect(await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "x" })).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.createManualLead).not.toHaveBeenCalled();
  });

  test("un lead ya promocionado no se vuelve a crear en el CRM (idempotencia por promocionado_at, no por el texto de una nota)", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, promocionado_at: "2026-09-20T10:00:00Z" });
    const r = await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "l1" });
    expect(r).toEqual({ ok: true, mensaje: "Este lead ya se había pasado al embudo principal." });
    expect(m.createManualLead).not.toHaveBeenCalled();
    expect(m.marcarLeadPromocionado).not.toHaveBeenCalled();
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("un lead sin promocionar se crea en el CRM con channel WhatsApp y queda marcado", async () => {
    m.getLead.mockResolvedValue(LEAD);
    m.createManualLead.mockResolvedValue({ ok: true, id: "crm1" });
    m.marcarLeadPromocionado.mockResolvedValue({ ok: true });
    m.registrarActividad.mockResolvedValue({ ok: true });
    const r = await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "l1" });
    expect(r).toEqual({ ok: true, mensaje: "Lead pasado al embudo principal." });
    expect(m.createManualLead).toHaveBeenCalledWith({
      name: "Ana",
      phone: "660415514",
      channel: "WhatsApp",
      campaign: "campana-web-express",
      email: "ana@panaderia.es",
      website: "https://panaderiasol.es",
    });
    expect(m.marcarLeadPromocionado).toHaveBeenCalledWith("l1");
    expect(m.registrarActividad).toHaveBeenCalledWith({ leadId: "l1", usuariaId: "u1", tipo: "nota", nota: "Pasado al embudo principal" });
  });

  test("cae al negocio cuando no hay contacto", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, contacto: null });
    m.createManualLead.mockResolvedValue({ ok: true, id: "crm1" });
    m.marcarLeadPromocionado.mockResolvedValue({ ok: true });
    m.registrarActividad.mockResolvedValue({ ok: true });
    await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "l1" });
    expect(m.createManualLead.mock.calls[0][0].name).toBe("Panadería Sol");
  });

  test("si createManualLead falla, no se marca el lead ni se registra la nota", async () => {
    m.getLead.mockResolvedValue(LEAD);
    m.createManualLead.mockResolvedValue({ ok: false, error: "boom" });
    const r = await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "l1" });
    expect(r).toEqual({ ok: false, error: "No se pudo crear el lead en el embudo principal." });
    expect(m.marcarLeadPromocionado).not.toHaveBeenCalled();
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("si falla marcar promocionado, el resultado lo dice en vez de fingir éxito total", async () => {
    m.getLead.mockResolvedValue(LEAD);
    m.createManualLead.mockResolvedValue({ ok: true, id: "crm1" });
    m.marcarLeadPromocionado.mockResolvedValue({ ok: false, error: "boom" });
    const r = await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "l1" });
    expect(r.ok).toBe(true);
    expect((r as { mensaje?: string }).mensaje).toMatch(/no se pudo guardar la marca/i);
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("si la nota falla tras crear el lead, el resultado lo dice en vez de fingir éxito total", async () => {
    m.getLead.mockResolvedValue(LEAD);
    m.createManualLead.mockResolvedValue({ ok: true, id: "crm1" });
    m.marcarLeadPromocionado.mockResolvedValue({ ok: true });
    m.registrarActividad.mockResolvedValue({ ok: false, error: "boom" });
    const r = await pasarLeadAlEmbudo({ usuaria: USUARIA, leadId: "l1" });
    expect(r.ok).toBe(true);
    expect((r as { mensaje?: string }).mensaje).toMatch(/no se pudo dejar la nota/i);
    expect((r as { mensaje?: string }).mensaje).not.toBe("Lead pasado al embudo principal.");
  });
});

describe("previsualizarImportacion", () => {
  test("cuenta válidas y nombra duplicados y excluidos sin guardar nada", async () => {
    const csv = `${CSV.replace("negocio,telefono,email", "negocio,telefono,email,color")}\n,600999888`;
    const r = await previsualizarImportacion({ marca: MARCA, csv });
    expect(m.listContactosLeads).toHaveBeenCalledWith("m1");
    expect(m.listExclusiones).toHaveBeenCalledWith("m1");
    expect(r).toMatchObject({ validas: 4, duplicados: ["Ya Existe"], excluidos: ["Cliente"], cabecerasDesconocidas: ["color"] });
    expect(r.errores.map((e) => e.line)).toEqual([6]);
    expect(m.crearLeads).not.toHaveBeenCalled();
    expect(m.registrarImportacion).not.toHaveBeenCalled();
  });

  test("sin errores ni conflictos: todas válidas", async () => {
    const r = await previsualizarImportacion({ marca: MARCA, csv: "negocio,telefono\nGym Sol,600111222" });
    expect(r).toEqual({ validas: 1, errores: [], avisos: [], duplicados: [], excluidos: [], cabecerasDesconocidas: [] });
  });
});

describe("autenticarWebhook", () => {
  test("solo acepta la marca existente con su secreto", async () => {
    m.getMarcaPorSlug.mockResolvedValueOnce(MARCA).mockResolvedValueOnce(MARCA).mockResolvedValueOnce(null).mockResolvedValueOnce(MARCA);
    expect(await autenticarWebhook("hydrup", "secreto-largo")).toBe(true);
    expect(await autenticarWebhook("hydrup", "otro")).toBe(false);
    expect(await autenticarWebhook("nope", "secreto-largo")).toBe(false);
    expect(await autenticarWebhook("hydrup", null)).toBe(false);
    expect(m.getMarcaPorSlug).toHaveBeenCalledWith("hydrup");
  });
});
