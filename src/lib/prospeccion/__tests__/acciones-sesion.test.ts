import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  verifySessionToken: vi.fn(),
  buscarEnPlaces: vi.fn(),
  enviarProspectos: vi.fn(),
  enriquecerWeb: vi.fn(),
  createManualLead: vi.fn(),
  db: {
    borrarPlantilla: vi.fn(),
    buscarLeadPorEmail: vi.fn(),
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

vi.mock("next/headers", () => ({ cookies: async () => ({ get: m.cookieGet }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/panel-auth", () => ({
  PANEL_COOKIE: "panel_session",
  verifySessionToken: m.verifySessionToken,
}));
vi.mock("@/lib/imagina-leads", () => ({ createManualLead: m.createManualLead }));
vi.mock("@/lib/prospeccion/db", () => m.db);
vi.mock("@/lib/prospeccion/enriquecer", () => ({ enriquecerWeb: m.enriquecerWeb }));
vi.mock("@/lib/prospeccion/enviar", () => ({ enviarProspectos: m.enviarProspectos }));
vi.mock("@/lib/prospeccion/places", () => ({ buscarEnPlaces: m.buscarEnPlaces }));

import * as acciones from "@/app/(site)/panel/prospeccion/actions";

const CADUCADA = { ok: false, error: "Sesión caducada. Vuelve a entrar al panel." };

function sesion(valida: boolean) {
  m.cookieGet.mockReturnValue(valida ? { value: "token-bueno" } : undefined);
  m.verifySessionToken.mockImplementation(async (t: string | undefined) => valida && t === "token-bueno");
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of Object.values(m.db)) f.mockReset();
  m.buscarEnPlaces.mockReset();
  m.enviarProspectos.mockReset();
  m.db.crearBusqueda.mockResolvedValue("s1");
  m.buscarEnPlaces.mockResolvedValue({ ok: true, prospectos: [{ external_id: "x" }, { external_id: "y" }] });
  m.db.guardarProspectos.mockResolvedValue(2);
});

describe("sin sesión del panel, las acciones no hacen nada", () => {
  beforeEach(() => sesion(false));

  test("buscarAction no llama a Google", async () => {
    expect(await acciones.buscarAction("restaurante", "Madrid")).toEqual(CADUCADA);
    expect(m.buscarEnPlaces).not.toHaveBeenCalled();
    expect(m.db.crearBusqueda).not.toHaveBeenCalled();
  });

  test("enviarAction no envía", async () => {
    expect(await acciones.enviarAction(["p1"], "t1", "hola@mail.dinkbit.es", false)).toEqual(CADUCADA);
    expect(m.enviarProspectos).not.toHaveBeenCalled();
  });

  test("enriquecerTandaAction no lee ninguna web y corta el bucle del cliente", async () => {
    expect(await acciones.enriquecerTandaAction("s1")).toEqual({ procesados: 0, restantes: 0 });
    expect(m.db.pendientesDeEnriquecer).not.toHaveBeenCalled();
    expect(m.enriquecerWeb).not.toHaveBeenCalled();
  });

  test("el resto tampoco toca la base de datos", async () => {
    expect(await acciones.descartarAction(["p1"])).toEqual(CADUCADA);
    expect(await acciones.marcarRespondidoAction("p1")).toEqual(CADUCADA);
    expect(await acciones.convertirEnLeadAction("p1")).toEqual(CADUCADA);
    expect(await acciones.guardarPlantillaAction({ name: "a", subject: "b", body: "c" })).toEqual(CADUCADA);
    expect(await acciones.borrarPlantillaAction("t1")).toEqual(CADUCADA);
    for (const f of Object.values(m.db)) expect(f).not.toHaveBeenCalled();
    expect(m.createManualLead).not.toHaveBeenCalled();
  });

  test("todas las acciones exportadas comprueban la sesión", async () => {
    // Si se añade una acción nueva sin la comprobación, esta lista deja de cuadrar.
    expect(Object.keys(acciones).sort()).toEqual([
      "borrarPlantillaAction",
      "buscarAction",
      "convertirEnLeadAction",
      "descartarAction",
      "enriquecerTandaAction",
      "enviarAction",
      "guardarPlantillaAction",
      "marcarRespondidoAction",
    ]);
  });

  test("una cookie presente pero no válida tampoco vale", async () => {
    m.cookieGet.mockReturnValue({ value: "caducada" });
    expect(await acciones.buscarAction("restaurante", "Madrid")).toEqual(CADUCADA);
    expect(m.cookieGet).toHaveBeenCalledWith("panel_session");
    expect(m.verifySessionToken).toHaveBeenCalledWith("caducada");
    expect(m.buscarEnPlaces).not.toHaveBeenCalled();
  });
});

describe("con sesión", () => {
  beforeEach(() => sesion(true));

  test("buscarAction llega a Places y cuenta las nuevas", async () => {
    const r = await acciones.buscarAction("restaurante", "Madrid");
    expect(m.buscarEnPlaces).toHaveBeenCalledWith({ categoria: "restaurante", ciudad: "Madrid" });
    expect(r).toEqual({ ok: true, searchId: "s1", mensaje: "2 empresas encontradas: 2 nuevas." });
  });

  test("buscarAction: si no se pueden guardar las empresas, lo dice y cierra la búsqueda con error", async () => {
    m.db.guardarProspectos.mockResolvedValue(null);
    const error = "No se pudieron guardar las empresas encontradas. ¿Está ejecutada la migración de prospección?";
    expect(await acciones.buscarAction("restaurante", "Madrid")).toEqual({ ok: false, error });
    expect(m.db.cerrarBusqueda).toHaveBeenCalledWith("s1", { status: "error", error });
  });

  test("descartarAction descarta desde cualquier estado menos baja y rebotado, y dice cuántas cambió", async () => {
    m.db.marcarEstado.mockResolvedValue(1);
    expect(await acciones.descartarAction(["a", "b"])).toEqual({ ok: true, mensaje: "1 descartada." });
    const [ids, estado, desde] = m.db.marcarEstado.mock.calls[0];
    expect(ids).toEqual(["a", "b"]);
    expect(estado).toBe("descartado");
    expect([...desde].sort()).toEqual(["enviado", "listo", "nuevo", "respondido", "sin_contacto"]);
  });

  test("descartarAction y marcarRespondidoAction no dan por hecho lo que no cambió", async () => {
    const nada = { ok: false, error: "No se cambió ninguna: la lista estaba desactualizada. Se ha recargado." };
    const fallo = { ok: false, error: "No se pudo guardar el cambio. Vuelve a intentarlo." };
    m.db.marcarEstado.mockResolvedValue(0);
    expect(await acciones.descartarAction(["a"])).toEqual(nada);
    expect(await acciones.marcarRespondidoAction("a")).toEqual(nada);
    m.db.marcarEstado.mockResolvedValue(null);
    expect(await acciones.descartarAction(["a"])).toEqual(fallo);
    expect(await acciones.marcarRespondidoAction("a")).toEqual(fallo);
    m.db.marcarEstado.mockResolvedValue(1);
    expect(await acciones.marcarRespondidoAction("a")).toEqual({ ok: true, mensaje: "Marcada como respondida." });
    expect(m.db.marcarEstado).toHaveBeenLastCalledWith(["a"], "respondido", ["enviado"]);
  });

  test("borrarPlantillaAction avisa si no se pudo borrar", async () => {
    m.db.borrarPlantilla.mockResolvedValue(false);
    expect(await acciones.borrarPlantillaAction("t1")).toEqual({ ok: false, error: "No se pudo borrar la plantilla." });
    m.db.borrarPlantilla.mockResolvedValue(true);
    expect(await acciones.borrarPlantillaAction("t1")).toEqual({ ok: true, mensaje: "Plantilla borrada." });
  });

  test.each(["nuevo", "listo", "sin_contacto", "rebotado", "baja", "descartado"])(
    "convertirEnLeadAction rechaza una empresa en estado «%s»",
    async (status) => {
      m.db.getProspecto.mockResolvedValue({ id: "p1", status, lead_id: null, email: "info@bar.es", name: "Bar" });
      expect(await acciones.convertirEnLeadAction("p1")).toEqual({
        ok: false,
        error: "Solo se puede convertir en lead una empresa a la que ya se le escribió.",
      });
      expect(m.db.buscarLeadPorEmail).not.toHaveBeenCalled();
      expect(m.createManualLead).not.toHaveBeenCalled();
      expect(m.db.enlazarLead).not.toHaveBeenCalled();
    },
  );

  test.each(["enviado", "respondido"])("convertirEnLeadAction acepta una empresa en estado «%s»", async (status) => {
    m.db.getProspecto.mockResolvedValue({ id: "p1", status, lead_id: null, email: "info@bar.es", name: "Bar" });
    m.db.buscarLeadPorEmail.mockResolvedValue(null);
    m.createManualLead.mockResolvedValue({ ok: true, id: "lead1" });
    expect((await acciones.convertirEnLeadAction("p1")).ok).toBe(true);
    expect(m.db.enlazarLead).toHaveBeenCalledWith("p1", "lead1");
  });
});
