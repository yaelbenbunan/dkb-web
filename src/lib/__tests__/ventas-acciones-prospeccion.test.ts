import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  revalidatePath: vi.fn(),
  buscarNegocios: vi.fn(),
  buscarEmpresasNuevas: vi.fn(),
  enviarProspectos: vi.fn(),
  enriquecerProspecto: vi.fn(),
  pasarProspectoAlEmbudo: vi.fn(),
  db: {
    borrarPlantilla: vi.fn(),
    cerrarBusqueda: vi.fn(),
    contarPendientes: vi.fn(),
    crearBusqueda: vi.fn(),
    enlazarLead: vi.fn(),
    getProspecto: vi.fn(),
    guardarEnriquecimiento: vi.fn(),
    guardarPlantilla: vi.fn(),
    guardarProspectos: vi.fn(),
    marcarEstado: vi.fn(),
    pendientesDeEnriquecer: vi.fn(),
  },
}));

vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/ventas/prospeccion", () => ({ pasarProspectoAlEmbudo: m.pasarProspectoAlEmbudo }));
vi.mock("@/lib/prospeccion/db", () => m.db);
vi.mock("@/lib/prospeccion/enriquecer", () => ({ enriquecerProspecto: m.enriquecerProspecto }));
vi.mock("@/lib/prospeccion/enviar", () => ({ enviarProspectos: m.enviarProspectos }));
vi.mock("@/lib/prospeccion/busqueda", () => ({ buscarNegocios: m.buscarNegocios, buscarEmpresasNuevas: m.buscarEmpresasNuevas }));

import * as acciones from "@/app/(site)/panel/ventas/acciones-prospeccion";

const SIN_PERMISO = { ok: false, error: "No tienes permiso para esto." };
const SIN_PROSPECCION = { ok: false, error: "Esta marca no tiene prospección." };
const COMERCIAL = { id: "u1", rol: "comercial", activa: true, marca_id: null };
const DINKBIT = { id: "m1", slug: "dinkbit", nombre: "dinkbit" };
const HYDRUP = { id: "m2", slug: "hydrup", nombre: "Hydrup" };

function acceso(resultado: unknown) {
  m.accesoMarcaAccion.mockResolvedValue(resultado);
}

/** Llama a todas las acciones exportadas con argumentos válidos. */
async function llamarATodas(slug: string) {
  return [
    await acciones.buscarAction(slug, "restaurantes", "Madrid"),
    await acciones.buscarEmpresasNuevasAction(slug, "Getafe", 30, ""),
    await acciones.enviarAction(slug, ["p1"], "t1", "hola@mail.dinkbit.es", false),
    await acciones.descartarAction(slug, ["p1"]),
    await acciones.marcarRespondidoAction(slug, "p1"),
    await acciones.pasarAlEmbudoAction(slug, "p1"),
    await acciones.guardarPlantillaAction(slug, { name: "a", subject: "b", body: "c" }),
    await acciones.borrarPlantillaAction(slug, "t1"),
  ];
}

function nadaTocado() {
  for (const f of Object.values(m.db)) expect(f).not.toHaveBeenCalled();
  expect(m.buscarNegocios).not.toHaveBeenCalled();
  expect(m.buscarEmpresasNuevas).not.toHaveBeenCalled();
  expect(m.enviarProspectos).not.toHaveBeenCalled();
  expect(m.enriquecerProspecto).not.toHaveBeenCalled();
  expect(m.pasarProspectoAlEmbudo).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of Object.values(m.db)) f.mockReset();
  m.buscarNegocios.mockReset();
  m.buscarEmpresasNuevas.mockReset();
  m.enviarProspectos.mockReset();
  m.pasarProspectoAlEmbudo.mockReset();
  acceso({ ok: true, usuaria: COMERCIAL, marca: DINKBIT });
  m.db.crearBusqueda.mockResolvedValue("s1");
  m.buscarNegocios.mockResolvedValue({
    ok: true,
    fuente: "overture",
    prospectos: [{ external_id: "x" }, { external_id: "y" }],
    encontradas: 2,
    repetidas: 0,
    quedan: 0,
  });
  m.db.guardarProspectos.mockResolvedValue(2);
});

describe("acceso", () => {
  test("todas las acciones exportadas están en la lista (y comprueban el acceso)", () => {
    // Si se añade una acción nueva sin la comprobación, esta lista deja de cuadrar.
    expect(Object.keys(acciones).sort()).toEqual([
      "borrarPlantillaAction",
      "buscarAction",
      "buscarEmpresasNuevasAction",
      "descartarAction",
      "enriquecerTandaAction",
      "enviarAction",
      "guardarPlantillaAction",
      "marcarRespondidoAction",
      "pasarAlEmbudoAction",
    ]);
  });

  test("sin permiso (la clienta, otra marca) no hacen nada", async () => {
    acceso(SIN_PERMISO);
    for (const r of await llamarATodas("dinkbit")) expect(r).toEqual(SIN_PERMISO);
    expect(await acciones.enriquecerTandaAction("dinkbit", "s1")).toEqual({ procesados: 0, restantes: 0 });
    nadaTocado();
    // Siempre se pide la sección de prospección de la marca de la URL.
    for (const [slug, seccion] of m.accesoMarcaAccion.mock.calls) {
      expect(slug).toBe("dinkbit");
      expect(seccion).toBe("prospeccion");
    }
  });

  test("en una marca sin prospección tampoco", async () => {
    acceso({ ok: true, usuaria: COMERCIAL, marca: HYDRUP });
    for (const r of await llamarATodas("hydrup")) expect(r).toEqual(SIN_PROSPECCION);
    expect(await acciones.enriquecerTandaAction("hydrup", "s1")).toEqual({ procesados: 0, restantes: 0 });
    nadaTocado();
  });
});

describe("con acceso", () => {
  test("buscarAction busca (Overture o OSM), guarda la búsqueda con su fuente y refresca la pestaña de la marca", async () => {
    const r = await acciones.buscarAction("dinkbit", "restaurantes", "Madrid");
    expect(m.buscarNegocios).toHaveBeenCalledWith({ categoria: "restaurantes", ciudad: "Madrid" });
    expect(m.db.crearBusqueda).toHaveBeenCalledWith("overture", { categoria: "Restaurantes", clave: "restaurantes", ciudad: "Madrid", fuente: "overture" });
    expect(m.db.cerrarBusqueda).toHaveBeenCalledWith("s1", { status: "lista", total: 2 });
    expect(r).toEqual({ ok: true, searchId: "s1", mensaje: "2 empresas nuevas (Overture Maps)." });
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/dinkbit/prospeccion");
  });

  test("buscarAction cuenta las repetidas y las que quedan para otra búsqueda", async () => {
    m.buscarNegocios.mockResolvedValue({ ok: true, fuente: "osm", prospectos: [{ external_id: "x" }], encontradas: 9, repetidas: 3, quedan: 5 });
    m.db.guardarProspectos.mockResolvedValue(1);
    const r = await acciones.buscarAction("dinkbit", "restaurantes", "Madrid");
    expect(m.db.crearBusqueda).toHaveBeenCalledWith("osm", expect.objectContaining({ fuente: "osm" }));
    expect(r).toEqual({
      ok: true,
      searchId: "s1",
      mensaje: "1 empresa nueva (OpenStreetMap). 3 que ya tenías. Quedan 5 más: repite la búsqueda para traerlas.",
    });
  });

  test("buscarAction: si la fuente falla, guarda la búsqueda con el error", async () => {
    m.buscarNegocios.mockResolvedValue({ ok: false, error: "ciudad_no_encontrada" });
    const error = "No encuentro ese municipio en España. Revisa cómo está escrito.";
    expect(await acciones.buscarAction("dinkbit", "restaurantes", "Xyz")).toEqual({ ok: false, error });
    expect(m.db.crearBusqueda).toHaveBeenCalledWith("osm", expect.objectContaining({ ciudad: "Xyz" }));
    expect(m.db.cerrarBusqueda).toHaveBeenCalledWith("s1", { status: "error", error });
  });

  test("buscarAction: si todas eran repetidas no guarda nada pero cierra la búsqueda", async () => {
    m.buscarNegocios.mockResolvedValue({ ok: true, fuente: "overture", prospectos: [], encontradas: 4, repetidas: 4, quedan: 0 });
    m.db.guardarProspectos.mockResolvedValue(0);
    const r = await acciones.buscarAction("dinkbit", "restaurantes", "Madrid");
    expect(r).toEqual({ ok: true, searchId: "s1", mensaje: "Ninguna empresa nueva (Overture Maps). 4 que ya tenías." });
  });

  test("buscarAction: si no se pueden guardar las empresas, lo dice y cierra la búsqueda con error", async () => {
    m.db.guardarProspectos.mockResolvedValue(null);
    const error = "No se pudieron guardar las empresas encontradas. ¿Está ejecutada la migración de prospección?";
    expect(await acciones.buscarAction("dinkbit", "restaurantes", "Madrid")).toEqual({ ok: false, error });
    expect(m.db.cerrarBusqueda).toHaveBeenCalledWith("s1", { status: "error", error });
  });

  test("buscarEmpresasNuevasAction guarda las del BORME ya «sin email», con la nota de la carta", async () => {
    m.buscarEmpresasNuevas.mockResolvedValue({ ok: true, prospectos: [{ external_id: "2026-1" }], encontradas: 3, repetidas: 2, quedan: 0 });
    m.db.guardarProspectos.mockResolvedValue(1);
    const r = await acciones.buscarEmpresasNuevasAction("dinkbit", " Getafe ", 90, "bar");
    expect(m.buscarEmpresasNuevas).toHaveBeenCalledWith({ lugar: "Getafe", dias: 90, objeto: "bar" });
    expect(m.db.crearBusqueda).toHaveBeenCalledWith("borme", { categoria: "Empresas nuevas («bar»)", ciudad: "Getafe", dias: "90", fuente: "borme" });
    expect(m.db.guardarProspectos).toHaveBeenCalledWith("s1", [{ external_id: "2026-1" }], {
      status: "sin_contacto",
      contact_note: "Recién constituida: carta al domicilio social",
    });
    expect(r).toEqual({ ok: true, mensaje: "1 empresa constituida en los últimos 90 días (BORME). 2 que ya tenías." });
  });

  test("buscarEmpresasNuevasAction: antigüedad no ofrecida o sin tabla importada", async () => {
    expect(await acciones.buscarEmpresasNuevasAction("dinkbit", "Getafe", 7, "")).toEqual({ ok: false, error: "Elige la antigüedad." });
    m.buscarEmpresasNuevas.mockResolvedValue({ ok: false, error: "sin_datos" });
    const r = await acciones.buscarEmpresasNuevasAction("dinkbit", "Getafe", 30, "");
    expect(r.ok).toBe(false);
    expect(m.db.crearBusqueda).not.toHaveBeenCalled();
  });

  test("descartarAction descarta desde cualquier estado menos baja y rebotado", async () => {
    m.db.marcarEstado.mockResolvedValue(1);
    expect(await acciones.descartarAction("dinkbit", ["a", "b"])).toEqual({ ok: true, mensaje: "1 descartada." });
    const [ids, estado, desde] = m.db.marcarEstado.mock.calls[0];
    expect(ids).toEqual(["a", "b"]);
    expect(estado).toBe("descartado");
    expect([...desde].sort()).toEqual(["enviado", "listo", "nuevo", "respondido", "sin_contacto"]);
  });

  test("descartar y «respondió» no dan por hecho lo que no cambió", async () => {
    const nada = { ok: false, error: "No se cambió ninguna: la lista estaba desactualizada. Se ha recargado." };
    const fallo = { ok: false, error: "No se pudo guardar el cambio. Vuelve a intentarlo." };
    m.db.marcarEstado.mockResolvedValue(0);
    expect(await acciones.descartarAction("dinkbit", ["a"])).toEqual(nada);
    expect(await acciones.marcarRespondidoAction("dinkbit", "a")).toEqual(nada);
    m.db.marcarEstado.mockResolvedValue(null);
    expect(await acciones.descartarAction("dinkbit", ["a"])).toEqual(fallo);
    m.db.marcarEstado.mockResolvedValue(1);
    expect(await acciones.marcarRespondidoAction("dinkbit", "a")).toEqual({ ok: true, mensaje: "Marcada como respondida." });
    expect(m.db.marcarEstado).toHaveBeenLastCalledWith(["a"], "respondido", ["enviado"]);
  });

  test("borrarPlantillaAction avisa si no se pudo borrar", async () => {
    m.db.borrarPlantilla.mockResolvedValue(false);
    expect(await acciones.borrarPlantillaAction("dinkbit", "t1")).toEqual({ ok: false, error: "No se pudo borrar la plantilla." });
    m.db.borrarPlantilla.mockResolvedValue(true);
    expect(await acciones.borrarPlantillaAction("dinkbit", "t1")).toEqual({ ok: true, mensaje: "Plantilla borrada." });
  });

  test("enviarAction pasa los ids, la plantilla y el remitente", async () => {
    m.enviarProspectos.mockResolvedValue({ ok: true, enviados: 1, omitidos: [] });
    expect(await acciones.enviarAction("dinkbit", ["p1"], "t1", "hola@mail.dinkbit.es", false)).toEqual({ ok: true, mensaje: "1 enviado." });
    expect(m.enviarProspectos).toHaveBeenCalledWith(["p1"], "t1", { from: "hola@mail.dinkbit.es", confirmarPersonal: false });
  });
});

describe("pasarAlEmbudoAction", () => {
  const PROSPECTO = { id: "p1", status: "enviado", lead_id: null, email: "info@bar.es", name: "Bar" };

  test.each(["nuevo", "listo", "sin_contacto", "rebotado", "baja", "descartado"])("rechaza una empresa en estado «%s»", async (status) => {
    m.db.getProspecto.mockResolvedValue({ ...PROSPECTO, status });
    expect(await acciones.pasarAlEmbudoAction("dinkbit", "p1")).toEqual({
      ok: false,
      error: "Solo se puede pasar al embudo una empresa a la que ya se le escribió.",
    });
    expect(m.pasarProspectoAlEmbudo).not.toHaveBeenCalled();
    expect(m.db.enlazarLead).not.toHaveBeenCalled();
  });

  test.each(["enviado", "respondido"])("desde «%s» crea el lead en ventas de la marca y lo enlaza", async (status) => {
    const prospecto = { ...PROSPECTO, status };
    m.db.getProspecto.mockResolvedValue(prospecto);
    m.pasarProspectoAlEmbudo.mockResolvedValue({ ok: true, leadId: "lead1", existia: false });
    expect(await acciones.pasarAlEmbudoAction("dinkbit", "p1")).toEqual({ ok: true, mensaje: "Pasada al embudo de dinkbit." });
    expect(m.pasarProspectoAlEmbudo).toHaveBeenCalledWith({ marca: DINKBIT, usuaria: COMERCIAL, prospecto });
    expect(m.db.enlazarLead).toHaveBeenCalledWith("p1", "lead1");
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/dinkbit", "layout");
  });

  test("si ya era lead de la marca, lo dice", async () => {
    m.db.getProspecto.mockResolvedValue(PROSPECTO);
    m.pasarProspectoAlEmbudo.mockResolvedValue({ ok: true, leadId: "viejo", existia: true });
    expect(await acciones.pasarAlEmbudoAction("dinkbit", "p1")).toEqual({ ok: true, mensaje: "Ya era un lead de la marca: queda enlazada con él." });
    expect(m.db.enlazarLead).toHaveBeenCalledWith("p1", "viejo");
  });

  test("si el alta falla, no enlaza", async () => {
    m.db.getProspecto.mockResolvedValue(PROSPECTO);
    m.pasarProspectoAlEmbudo.mockResolvedValue({ ok: false, error: "No se pudo crear el lead." });
    expect(await acciones.pasarAlEmbudoAction("dinkbit", "p1")).toEqual({ ok: false, error: "No se pudo crear el lead." });
    expect(m.db.enlazarLead).not.toHaveBeenCalled();
  });

  test("una empresa ya enlazada o que no existe no se vuelve a pasar", async () => {
    m.db.getProspecto.mockResolvedValue({ ...PROSPECTO, lead_id: "lead1" });
    expect(await acciones.pasarAlEmbudoAction("dinkbit", "p1")).toEqual({ ok: false, error: "Ya está en el embudo." });
    m.db.getProspecto.mockResolvedValue(null);
    expect(await acciones.pasarAlEmbudoAction("dinkbit", "p1")).toEqual({ ok: false, error: "Esa empresa ya no existe." });
    expect(m.pasarProspectoAlEmbudo).not.toHaveBeenCalled();
  });
});
