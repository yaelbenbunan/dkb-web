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
  actualizarDatosLead: vi.fn(),
  actualizarExtrasLead: vi.fn(),
  actualizarAtribucionLead: vi.fn(),
  actualizarLeadWeb: vi.fn(),
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
  anadirNota,
  marcarMuestrasEnviadas,
  cambiarFaseManual,
  moverLead,
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
  m.actualizarDatosLead.mockResolvedValue({ ok: true });
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

  test("lead nuevo con nota → queda como primera nota de su historial", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es", nota: "Horario: mediodía" } });
    expect(m.registrarActividad).toHaveBeenCalledWith({ leadId: "l-new", usuariaId: null, tipo: "nota", nota: "Horario: mediodía" });
  });

  test("lead nuevo con socios y cargo → se guardan en su ficha, no en una nota", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new", socios: null, cargo: null });
    m.actualizarExtrasLead.mockResolvedValue({ ok: true });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es", socios: "_100_a_300", cargo: "propietario_/_socio" } });
    expect(m.actualizarExtrasLead).toHaveBeenCalledWith("l-new", { socios: "100 a 300", cargo: "Propietario / socio" });
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("si guardar socios y cargo falla, el lead ya creado responde 200 igual", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    m.actualizarExtrasLead.mockRejectedValue(new Error("columna inexistente"));
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es", socios: "50" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: false } });
    aviso.mockRestore();
  });

  test("canal, campaña, conjunto de anuncios y anuncio de Zapier → columnas y extra del lead nuevo", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new", canal: null, campana: null, extra: { pdf_path: "x.pdf" } });
    m.actualizarAtribucionLead.mockResolvedValue({ ok: true });
    await recibirLeadAnuncio({
      slug: "hydrup",
      secreto: "secreto-largo",
      datos: { company_name: "Box X", email: "box@x.es", canal: "Meta", campaign_name: "Growth oct", adset_name: "Madrid 25-55", ad_name: "Vídeo 1" },
    });
    expect(m.actualizarAtribucionLead).toHaveBeenCalledWith("l-new", {
      canal: "Meta",
      campana: "Growth oct",
      extra: { pdf_path: "x.pdf", adset_name: "Madrid 25-55", ad_name: "Vídeo 1" },
    });
  });

  test("lead repetido → canal y campaña no pisan lo que ya tenía", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l7", canal: "Web", campana: null, extra: { ad_name: "Viejo" } });
    m.actualizarAtribucionLead.mockResolvedValue({ ok: true });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Ya", email: "ya@a.es", channel: "Meta", campaign: "C2", ad_name: "Nuevo" } });
    expect(m.actualizarAtribucionLead).toHaveBeenCalledWith("l7", { campana: "C2" });
  });

  test("si guardar la atribución falla, el lead ya creado responde 200 igual", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    m.actualizarAtribucionLead.mockRejectedValue(new Error("caída"));
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es", canal: "Meta" } });
    expect(r.status).toBe(200);
  });

  test("lead repetido → socios y cargo solo rellenan lo que faltaba", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l7", socios: "Más de 1.000", cargo: null });
    m.actualizarExtrasLead.mockResolvedValue({ ok: true });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Ya", email: "ya@a.es", socios: "_100_a_300", cargo: "gerente" } });
    expect(m.actualizarExtrasLead).toHaveBeenCalledWith("l7", { cargo: "Gerente" });
  });

  test("lead nuevo sin nota → no se apunta nada en el historial", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { company_name: "Box X", email: "box@x.es" } });
    expect(m.registrarActividad).not.toHaveBeenCalled();
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

  const EXISTENTE = { id: "l7", negocio: "Ya", tipo_negocio: null, contacto: "Ana", telefono: null, email: "ya@a.es", ciudad: null, cif: null, web: null };

  test("lead repetido → rellena lo que le faltaba, sin pisar lo que ya tenía", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue(EXISTENTE);
    await recibirLeadAnuncio({
      slug: "hydrup",
      secreto: "secreto-largo",
      datos: { negocio: "Otro nombre", contacto: "Otra", email: "ya@a.es", telefono: "600111222", tipo_negocio: "gimnasio", ciudad: "Madrid" },
    });
    expect(m.actualizarDatosLead).toHaveBeenCalledWith("l7", {
      negocio: "Ya",
      tipo_negocio: "gimnasio",
      contacto: "Ana",
      telefono: "600111222",
      email: "ya@a.es",
      ciudad: "Madrid",
      cif: "",
      web: "",
    });
  });

  test("lead repetido que no trae nada nuevo → no se toca su ficha", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue(EXISTENTE);
    await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Ya", email: "ya@a.es" } });
    expect(m.actualizarDatosLead).not.toHaveBeenCalled();
  });

  test("lead repetido → si completar la ficha falla, responde 200 igual", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    m.buscarLeadPorContacto.mockResolvedValue(EXISTENTE);
    m.actualizarDatosLead.mockRejectedValueOnce(new Error("db caída"));
    const r = await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: { negocio: "Ya", email: "ya@a.es", tipo_negocio: "gimnasio" } });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
  });

  test("un cuerpo que no es un objeto → 400", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA);
    expect((await recibirLeadAnuncio({ slug: "hydrup", secreto: "secreto-largo", datos: [1, 2] })).status).toBe(400);
  });
});

describe("recibirLeadFormulario", () => {
  test("con nota del llamante, la nota del lead nuevo es esa", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new" });
    await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Padel Pro", email: "p@p.es", comentarios: "x" }, nota: "Qué vende: Material de pádel" });
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "l-new", tipo: "nota", nota: "Qué vende: Material de pádel" }));
  });

  test("lead repetido: cuenta como éxito y la nota llega al existente", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-viejo", email: "ya@a.es", telefono: null });
    const r = await recibirLeadFormulario({ slug: "hydrup", datos: { negocio: "Padel Pro", email: "ya@a.es" }, nota: "Qué vende: Trofeos" });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
    expect(m.registrarActividad.mock.calls[0][0].nota).toContain("Qué vende: Trofeos");
  });

  test("con campaña y canal propios, el lead nuevo los guarda (origen y columnas)", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-new", canal: null, campana: null, extra: {} });
    m.actualizarAtribucionLead.mockResolvedValue({ ok: true });
    await recibirLeadFormulario({ slug: "dinkbit", datos: { negocio: "Padel Pro", email: "p@p.es" }, nota: "x", campana: "Proveedores deportivos", canal: "Web" });
    expect(m.crearLeads).toHaveBeenCalledWith(expect.objectContaining({ origenDetalle: "Proveedores deportivos" }));
    expect(m.actualizarAtribucionLead).toHaveBeenCalledWith("l-new", { canal: "Web", campana: "Proveedores deportivos" });
  });

  test("un lead archivado que vuelve a llegar sale del archivo, con nota", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-viejo", email: "ya@a.es", telefono: null, archivado: true });
    m.actualizarLeadWeb.mockResolvedValue({ ok: true });
    const r = await recibirLeadFormulario({ slug: "dinkbit", datos: { negocio: "Padel Pro", email: "ya@a.es" }, nota: "x", campana: "Leads - proveedores deportivos" });
    expect(r).toEqual({ status: 200, body: { ok: true, duplicado: true } });
    expect(m.actualizarLeadWeb).toHaveBeenCalledWith("l-viejo", { archivado: false });
    expect(m.registrarActividad.mock.calls[0][0].nota).toContain("Estaba archivado: se recupera.");
  });

  test("un lead repetido que no estaba archivado no se toca el archivo", async () => {
    m.getMarcaPorSlug.mockResolvedValue(MARCA_ACTIVA);
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l-viejo", email: "ya@a.es", telefono: null, archivado: false });
    await recibirLeadFormulario({ slug: "dinkbit", datos: { negocio: "Padel Pro", email: "ya@a.es" } });
    expect(m.actualizarLeadWeb).not.toHaveBeenCalled();
  });

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

  test("con nota, la deja en el historial a nombre de quien lo crea", async () => {
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l9" });
    expect(await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: DATOS, nota: "Llamar por la tarde" })).toEqual({ ok: true, leadId: "l9" });
    expect(m.registrarActividad).toHaveBeenCalledWith({ leadId: "l9", usuariaId: "u1", tipo: "nota", nota: "Llamar por la tarde" });
  });

  test("sin nota no apunta nada en el historial", async () => {
    m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
    m.buscarLeadPorContacto.mockResolvedValue({ id: "l9" });
    await crearLeadManual({ marca: MARCA, usuaria: USUARIA, datos: DATOS });
    expect(m.registrarActividad).not.toHaveBeenCalled();
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
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_interesa", nota: "Ya tienen proveedor", proximo_seguimiento: "2026-09-30", proximo_seguimiento_hora: null } });
    expect(m.registrarActividad).toHaveBeenCalledWith({
      leadId: "l1",
      usuariaId: "u1",
      tipo: "llamada",
      resultado: "no_interesa",
      nota: "Ya tienen proveedor",
      faseNueva: "no_interesa",
      proximoSeguimiento: null,
      proximoSeguimientoHora: null,
    });
  });

  test("una llamada que cierra el lead no guarda hora de seguimiento", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "contactado" });
    m.registrarActividad.mockResolvedValue({ ok: true });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_interesa", nota: "", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" } });
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ proximoSeguimiento: null, proximoSeguimientoHora: null }));
  });

  test("la hora viaja con la fecha cuando el seguimiento sobrevive, también en notas y muestras", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "contactado" });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" } });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l1", datos: { nota: "", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "09:15" } });
    await anadirNota({ usuaria: USUARIA, leadId: "l1", datos: { nota: "x", proximo_seguimiento: "2026-10-21", proximo_seguimiento_hora: "11:00" } });
    expect(m.registrarActividad.mock.calls.map((c) => c[0].proximoSeguimientoHora)).toEqual(["16:30", "09:15", "11:00"]);
  });

  test("si la fase no cambia no se pide cambio de fase", async () => {
    m.getLead.mockResolvedValue({ id: "l1", fase: "contactado" });
    await registrarLlamada({ usuaria: USUARIA, leadId: "l1", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: "2026-09-20", proximo_seguimiento_hora: null } });
    expect(m.registrarActividad.mock.calls[0][0]).toMatchObject({ faseNueva: null, proximoSeguimiento: "2026-09-20" });
  });

  test("lead inexistente", async () => {
    m.getLead.mockResolvedValue(null);
    expect(await registrarLlamada({ usuaria: USUARIA, leadId: "x", llamada: { resultado: "no_contesta", nota: "", proximo_seguimiento: null, proximo_seguimiento_hora: null } })).toEqual({
      ok: false,
      error: "Lead no encontrado.",
    });
  });

  test("muestras enviadas pasa a fase muestras salvo si ya es cliente", async () => {
    m.getLead.mockResolvedValueOnce({ id: "l1", fase: "interesado" }).mockResolvedValueOnce({ id: "l2", fase: "cliente" });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l1", datos: { nota: "Pack 6", proximo_seguimiento: "2026-09-25", proximo_seguimiento_hora: null } });
    await marcarMuestrasEnviadas({ usuaria: USUARIA, leadId: "l2", datos: { nota: "", proximo_seguimiento: null, proximo_seguimiento_hora: null } });
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
