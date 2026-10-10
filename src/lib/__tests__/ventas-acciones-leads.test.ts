import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  getLead: vi.fn(),
  getUsuaria: vi.fn(),
  actualizarDatosLead: vi.fn(),
  asignarLead: vi.fn(),
  eliminarLeads: vi.fn(),
  importarLeadsCsv: vi.fn(),
  previsualizarImportacion: vi.fn(),
  crearLeadManual: vi.fn(),
  registrarLlamada: vi.fn(),
  marcarMuestrasEnviadas: vi.fn(),
  anadirNota: vi.fn(),
  cambiarFaseManual: vi.fn(),
  moverLead: vi.fn(),
  pasarLeadAlEmbudo: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/ventas/db", () => ({
  getLead: m.getLead,
  getUsuaria: m.getUsuaria,
  actualizarDatosLead: m.actualizarDatosLead,
  asignarLead: m.asignarLead,
  eliminarLeads: m.eliminarLeads,
}));
vi.mock("@/lib/ventas/servicios", () => ({
  importarLeadsCsv: m.importarLeadsCsv,
  previsualizarImportacion: m.previsualizarImportacion,
  crearLeadManual: m.crearLeadManual,
  registrarLlamada: m.registrarLlamada,
  marcarMuestrasEnviadas: m.marcarMuestrasEnviadas,
  anadirNota: m.anadirNota,
  cambiarFaseManual: m.cambiarFaseManual,
  moverLead: m.moverLead,
  pasarLeadAlEmbudo: m.pasarLeadAlEmbudo,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import {
  importarLeadsAction,
  previsualizarLeadsAction,
  crearLeadManualAction,
  actualizarLeadAction,
  asignarLeadAction,
  registrarLlamadaAction,
  muestrasEnviadasAction,
  notaAction,
  cambiarFaseAction,
  moverLeadAction,
  pasarAlEmbudoAction,
  eliminarLeadAction,
} from "@/app/(site)/panel/ventas/acciones-leads";

const USUARIA = { id: "u1", rol: "comercial", activa: true };
const MARCA = { id: "m1", slug: "hydrup" };
const MARCA_DINKBIT = { id: "m2", slug: "dinkbit" };
const LEAD = { id: "l1", marca_id: "m1", fase: "nuevo" };

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockClear());
  m.accesoMarcaAccion.mockReset().mockResolvedValue({ ok: true, usuaria: USUARIA, marca: MARCA });
  m.getLead.mockReset().mockResolvedValue(LEAD);
  m.getUsuaria.mockReset().mockResolvedValue({ id: "u2", rol: "comercial", activa: true, marca_id: null });
  for (const f of [m.actualizarDatosLead, m.asignarLead, m.registrarLlamada, m.marcarMuestrasEnviadas, m.anadirNota, m.cambiarFaseManual, m.moverLead, m.pasarLeadAlEmbudo]) {
    f.mockReset().mockResolvedValue({ ok: true });
  }
  m.importarLeadsCsv.mockReset().mockResolvedValue({ ok: true, creados: 1, duplicados: 0, excluidos: 0 });
  m.crearLeadManual.mockReset().mockResolvedValue({ ok: true, leadId: "l9" });
});

describe("acciones de leads", () => {
  test("sin sesión no se ejecuta ninguna", async () => {
    m.accesoMarcaAccion.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(importarLeadsAction("hydrup", null, fd({ csv: "x" }))).rejects.toThrow();
    await expect(registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "no_contesta" }))).rejects.toThrow();
    await expect(asignarLeadAction("hydrup", "l1", "u2")).rejects.toThrow();
    expect(m.importarLeadsCsv).not.toHaveBeenCalled();
    expect(m.registrarLlamada).not.toHaveBeenCalled();
    expect(m.asignarLead).not.toHaveBeenCalled();
  });

  test("importar pasa el CSV, el fichero y la lista al servicio", async () => {
    await importarLeadsAction("hydrup", null, fd({ csv: "negocio\nGym", nombre_fichero: "g.csv", nombre_lista: "Gyms" }));
    expect(m.importarLeadsCsv).toHaveBeenCalledWith({ marca: MARCA, usuaria: USUARIA, csv: "negocio\nGym", nombreFichero: "g.csv", nombreLista: "Gyms" });
  });

  test("un lead de otra marca no se toca", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, marca_id: "otra" });
    expect(await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "no_contesta" }))).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.registrarLlamada).not.toHaveBeenCalled();
  });

  test("llamada inválida no llega al servicio; válida sí", async () => {
    expect((await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "" }))).ok).toBe(false);
    expect(m.registrarLlamada).not.toHaveBeenCalled();
    await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "interesado", nota: "Quiere precios", proximo_seguimiento: "2026-09-22" }));
    expect(m.registrarLlamada).toHaveBeenCalledWith({
      usuaria: USUARIA,
      leadId: "l1",
      llamada: { resultado: "interesado", nota: "Quiere precios", proximo_seguimiento: "2026-09-22", proximo_seguimiento_hora: null },
    });
  });

  test("alta manual lleva a la ficha del lead", async () => {
    await expect(crearLeadManualAction("hydrup", null, fd({ negocio: "Gym", telefono: "600111222" }))).rejects.toThrow(
      "NEXT_REDIRECT:/panel/ventas/hydrup/leads/l9",
    );
  });

  test("alta manual pasa la nota al servicio, recortada", async () => {
    await expect(crearLeadManualAction("hydrup", null, fd({ negocio: "Gym", telefono: "600111222", nota: "  Llamar por la tarde  " }))).rejects.toThrow("NEXT_REDIRECT");
    expect(m.crearLeadManual).toHaveBeenCalledWith(expect.objectContaining({ nota: "Llamar por la tarde" }));
  });

  test("asignar a una usuaria desactivada no se permite; vacío desasigna", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u2", rol: "comercial", activa: false, marca_id: null });
    expect((await asignarLeadAction("hydrup", "l1", "u2")).ok).toBe(false);
    await asignarLeadAction("hydrup", "l1", "");
    expect(m.asignarLead).toHaveBeenCalledWith("l1", null);
  });

  test("no se asigna a una clienta de otra marca; a una de la misma sí", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u3", rol: "cliente", activa: true, marca_id: "m2" });
    expect(await asignarLeadAction("hydrup", "l1", "u3")).toEqual({ ok: false, error: "Esa usuaria no existe o está desactivada." });
    expect(m.asignarLead).not.toHaveBeenCalled();
    m.getUsuaria.mockResolvedValue({ id: "u3", rol: "cliente", activa: true, marca_id: "m1" });
    expect((await asignarLeadAction("hydrup", "l1", "u3")).ok).toBe(true);
    expect(m.asignarLead).toHaveBeenCalledWith("l1", "u3");
  });

  test("editar datos, muestras, nota y fase validan y delegan", async () => {
    await actualizarLeadAction("hydrup", "l1", null, fd({ negocio: "Gym", email: "a@b.es" }));
    expect(m.actualizarDatosLead).toHaveBeenCalledWith("l1", expect.objectContaining({ negocio: "Gym", email: "a@b.es" }));
    await muestrasEnviadasAction("hydrup", "l1", null, fd({ nota: "Pack 6", proximo_seguimiento: "" }));
    expect(m.marcarMuestrasEnviadas).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", datos: { nota: "Pack 6", proximo_seguimiento: null, proximo_seguimiento_hora: null } });
    await notaAction("hydrup", "l1", null, fd({ nota: "Hola", proximo_seguimiento: "" }));
    expect(m.anadirNota).toHaveBeenCalled();
    expect((await cambiarFaseAction("hydrup", "l1", null, fd({ fase: "inventada" }))).ok).toBe(false);
    await cambiarFaseAction("hydrup", "l1", null, fd({ fase: "perdido", nota: "" }));
    expect(m.cambiarFaseManual).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "" } });
  });

  test("previsualizar exige sesión y delega en el servicio con la marca", async () => {
    const previa = { validas: 1, errores: [], avisos: [], duplicados: [], excluidos: [], cabecerasDesconocidas: [] };
    m.previsualizarImportacion.mockReset().mockResolvedValue(previa);
    expect(await previsualizarLeadsAction("hydrup", "negocio\nGym")).toEqual({ ok: true, previa });
    expect(m.previsualizarImportacion).toHaveBeenCalledWith({ marca: MARCA, csv: "negocio\nGym" });

    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "Marca no encontrada." });
    expect(await previsualizarLeadsAction("nope", "x")).toEqual({ ok: false, error: "Marca no encontrada." });

    m.previsualizarImportacion.mockClear();
    m.accesoMarcaAccion.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(previsualizarLeadsAction("hydrup", "x")).rejects.toThrow();
    expect(m.previsualizarImportacion).not.toHaveBeenCalled();
  });

  describe("moverLeadAction (tablero)", () => {
    test("exige sesión", async () => {
      m.accesoMarcaAccion.mockRejectedValue(new Error("NEXT_REDIRECT"));
      await expect(moverLeadAction("hydrup", "l1", "contactado")).rejects.toThrow();
      expect(m.moverLead).not.toHaveBeenCalled();
    });

    test("un lead de otra marca da no encontrado", async () => {
      m.getLead.mockResolvedValue({ ...LEAD, marca_id: "otra" });
      expect(await moverLeadAction("hydrup", "l1", "contactado")).toEqual({ ok: false, error: "Lead no encontrado." });
      expect(m.moverLead).not.toHaveBeenCalled();
    });

    test("una fase inventada no llega al servicio", async () => {
      expect(await moverLeadAction("hydrup", "l1", "inventada")).toEqual({ ok: false, error: "Fase no válida." });
      expect(m.moverLead).not.toHaveBeenCalled();
    });

    test("delega con la usuaria de la sesión y refresca la marca", async () => {
      expect(await moverLeadAction("hydrup", "l1", "muestras")).toEqual({ ok: true });
      expect(m.moverLead).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", fase: "muestras" });
      expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/hydrup", "layout");
    });

    test("si el servicio falla se devuelve su error y no se refresca", async () => {
      m.moverLead.mockResolvedValue({ ok: false, error: "No se pudo guardar. Vuelve a intentarlo." });
      expect(await moverLeadAction("hydrup", "l1", "cliente")).toEqual({ ok: false, error: "No se pudo guardar. Vuelve a intentarlo." });
      expect(m.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("pasarAlEmbudoAction", () => {
    test("exige sesión", async () => {
      m.accesoMarcaAccion.mockRejectedValue(new Error("NEXT_REDIRECT"));
      await expect(pasarAlEmbudoAction("dinkbit", "l1", null, new FormData())).rejects.toThrow();
      expect(m.pasarLeadAlEmbudo).not.toHaveBeenCalled();
    });

    test("un slug distinto de dinkbit se rechaza sin mirar el lead", async () => {
      const r = await pasarAlEmbudoAction("hydrup", "l1", null, new FormData());
      expect(r.ok).toBe(false);
      expect(m.getLead).not.toHaveBeenCalled();
      expect(m.pasarLeadAlEmbudo).not.toHaveBeenCalled();
    });

    test("un lead de otra marca da no encontrado", async () => {
      m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: USUARIA, marca: MARCA_DINKBIT });
      m.getLead.mockResolvedValue({ ...LEAD, marca_id: "otra" });
      expect(await pasarAlEmbudoAction("dinkbit", "l1", null, new FormData())).toEqual({ ok: false, error: "Lead no encontrado." });
      expect(m.pasarLeadAlEmbudo).not.toHaveBeenCalled();
    });

    test("delega con la usuaria de la sesión y refresca la marca", async () => {
      m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: USUARIA, marca: MARCA_DINKBIT });
      m.getLead.mockResolvedValue({ ...LEAD, marca_id: "m2" });
      m.pasarLeadAlEmbudo.mockResolvedValue({ ok: true, mensaje: "Lead pasado al embudo principal." });
      expect(await pasarAlEmbudoAction("dinkbit", "l1", null, new FormData())).toEqual({ ok: true, mensaje: "Lead pasado al embudo principal." });
      expect(m.pasarLeadAlEmbudo).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1" });
      expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/dinkbit", "layout");
    });

    test("si el servicio falla se devuelve su error y no se refresca", async () => {
      m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: USUARIA, marca: MARCA_DINKBIT });
      m.getLead.mockResolvedValue({ ...LEAD, marca_id: "m2" });
      m.pasarLeadAlEmbudo.mockResolvedValue({ ok: false, error: "No se pudo crear el lead en el embudo principal." });
      expect(await pasarAlEmbudoAction("dinkbit", "l1", null, new FormData())).toEqual({ ok: false, error: "No se pudo crear el lead en el embudo principal." });
      expect(m.revalidatePath).not.toHaveBeenCalled();
    });
  });
});

describe("acceso por marca", () => {
  const SIN_PERMISO = { ok: false, error: "No tienes permiso para esto." };

  test("ninguna acción de leads escribe si el acceso a la marca falla", async () => {
    m.accesoMarcaAccion.mockResolvedValue(SIN_PERMISO);
    m.getLead.mockResolvedValue(LEAD);

    expect(await moverLeadAction("dinkbit", "l1", "contactado")).toEqual(SIN_PERMISO);
    expect(await notaAction("dinkbit", "l1", null, fd({ nota: "hola" }))).toEqual(SIN_PERMISO);
    expect(await registrarLlamadaAction("dinkbit", "l1", null, fd({ resultado: "interesado" }))).toEqual(SIN_PERMISO);
    expect(await cambiarFaseAction("dinkbit", "l1", null, fd({ fase: "cliente" }))).toEqual(SIN_PERMISO);
    expect(await asignarLeadAction("dinkbit", "l1", "u2")).toEqual(SIN_PERMISO);
    expect(await actualizarLeadAction("dinkbit", "l1", null, fd({ negocio: "X", telefono: "600000000" }))).toEqual(SIN_PERMISO);
    expect(await crearLeadManualAction("dinkbit", null, fd({ negocio: "X", telefono: "600000000" }))).toEqual(SIN_PERMISO);
    expect(await muestrasEnviadasAction("dinkbit", "l1", null, fd({ nota: "x" }))).toEqual(SIN_PERMISO);
    expect(await pasarAlEmbudoAction("dinkbit", "l1", null, new FormData())).toEqual(SIN_PERMISO);
    expect(await previsualizarLeadsAction("dinkbit", "x")).toEqual(SIN_PERMISO);
    expect(await importarLeadsAction("dinkbit", null, fd({ csv: "x" }))).toEqual({ ok: false, error: SIN_PERMISO.error, errores: [] });

    for (const escritura of [
      m.moverLead, m.anadirNota, m.registrarLlamada, m.cambiarFaseManual, m.asignarLead, m.actualizarDatosLead,
      m.crearLeadManual, m.marcarMuestrasEnviadas, m.pasarLeadAlEmbudo, m.importarLeadsCsv, m.previsualizarImportacion,
    ]) {
      expect(escritura).not.toHaveBeenCalled();
    }
  });

  test("las acciones piden la sección «leads» (o «tablero» al mover)", async () => {
    m.getLead.mockResolvedValue(LEAD);
    m.anadirNota.mockResolvedValue({ ok: true });
    m.moverLead.mockResolvedValue({ ok: true });
    await notaAction("hydrup", "l1", null, fd({ nota: "hola" }));
    expect(m.accesoMarcaAccion).toHaveBeenLastCalledWith("hydrup", "leads");
    await moverLeadAction("hydrup", "l1", "contactado");
    expect(m.accesoMarcaAccion).toHaveBeenLastCalledWith("hydrup", "tablero");
  });
});

describe("eliminarLeadAction", () => {
  const ADMIN = { id: "a1", rol: "admin", activa: true };
  const confirmacion = (texto: string) => fd({ confirmacion: texto });

  test("solo admin: una comercial o una clienta no borran", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    for (const rol of ["comercial", "cliente"]) {
      m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { id: "u1", rol, activa: true }, marca: MARCA });
      expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("Bar Paco"))).toEqual({ ok: false, error: "Solo una admin puede eliminar leads." });
    }
    expect(m.eliminarLeads).not.toHaveBeenCalled();
  });

  test("lead de otra marca: no encontrado", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, marca_id: "m2", negocio: "Bar Paco" });
    expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("Bar Paco"))).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.eliminarLeads).not.toHaveBeenCalled();
  });

  test("la confirmación tiene que ser el nombre del negocio", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("bar"))).toEqual({ ok: false, error: "Escribe el nombre del negocio tal cual para confirmar." });
    expect(m.eliminarLeads).not.toHaveBeenCalled();
  });

  test("borra con la marca del lead y vuelve a la lista", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    m.eliminarLeads.mockResolvedValue({ ok: true, borrados: 1 });
    await expect(eliminarLeadAction("hydrup", "l1", null, confirmacion("  bar paco "))).rejects.toThrow("NEXT_REDIRECT:/panel/ventas/hydrup/leads");
    expect(m.eliminarLeads).toHaveBeenCalledWith("m1", ["l1"]);
  });

  test("si la base no borra nada, se dice", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.getLead.mockResolvedValue({ ...LEAD, negocio: "Bar Paco" });
    m.eliminarLeads.mockResolvedValue({ ok: true, borrados: 0 });
    expect(await eliminarLeadAction("hydrup", "l1", null, confirmacion("Bar Paco"))).toEqual({ ok: false, error: "Lead no encontrado." });
  });
});
