import { describe, expect, test } from "vitest";
import { agruparTareas, contarPrimerContacto, leadsQuePidenMuestras, tareasAutomaticas, tareasManuales, type TareaManual } from "../ventas/tareas";

const lead = (id: string, extra: Partial<Parameters<typeof tareasAutomaticas>[0][number]> = {}) => ({
  id,
  negocio: `Negocio ${id}`,
  fase: "contactado" as const,
  asignada_a: "u1",
  proximo_seguimiento: null,
  proximo_seguimiento_hora: null,
  ...extra,
});

describe("leadsQuePidenMuestras", () => {
  test("solo cuenta la ÚLTIMA llamada de cada lead (vienen en orden cronológico)", () => {
    const pide = leadsQuePidenMuestras([
      { lead_id: "a", resultado: "pide_muestras" },
      { lead_id: "b", resultado: "pide_muestras" },
      { lead_id: "b", resultado: "volver_a_llamar" },
      { lead_id: "c", resultado: "no_contesta" },
    ]);
    expect([...pide]).toEqual(["a"]);
  });
});

describe("tareasAutomaticas", () => {
  test("llamar: fase activa con fecha, a nombre de quien lleva el lead y con su hora", () => {
    const t = tareasAutomaticas([lead("a", { proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30:00", asignada_a: "u7" })], new Set());
    expect(t).toEqual([
      { clave: "llamar:a", tipo: "llamar", titulo: "Llamar a Negocio a", leadId: "a", negocio: "Negocio a", fecha: "2026-10-20", hora: "16:30", asignadaA: "u7", tareaId: null, hecha: false },
    ]);
  });
  test("un lead cerrado con fecha no genera llamada", () => {
    expect(tareasAutomaticas([lead("a", { fase: "no_interesa", proximo_seguimiento: "2026-10-20" })], new Set())).toEqual([]);
  });
  test("enviar muestras: interesado que las pidió; sin fecha propia", () => {
    const t = tareasAutomaticas([lead("a", { fase: "interesado" }), lead("b", { fase: "muestras" })], new Set(["a", "b"]));
    expect(t.map((x) => [x.clave, x.titulo, x.fecha])).toEqual([["muestras:a", "Enviar muestras a Negocio a", null]]);
  });
  test("un interesado que pidió muestras y tiene fecha genera las dos tareas", () => {
    const t = tareasAutomaticas([lead("a", { fase: "interesado", proximo_seguimiento: "2026-10-21" })], new Set(["a"]));
    expect(t.map((x) => x.clave).sort()).toEqual(["llamar:a", "muestras:a"]);
  });
});

test("contarPrimerContacto: nuevos sin seguimiento", () => {
  expect(contarPrimerContacto([lead("a", { fase: "nuevo" }), lead("b", { fase: "nuevo", proximo_seguimiento: "2026-10-20" }), lead("c")])).toBe(1);
});

test("tareasManuales pone el negocio del lead y marca las hechas", () => {
  const base: TareaManual = { id: "t1", marca_id: "m1", lead_id: "a", titulo: "Mandar catálogo", vence: "2026-10-20", vence_hora: "09:00:00", asignada_a: "u1", creada_por: "u2", hecha_at: null, hecha_por: null, created_at: "2026-10-01T00:00:00Z" };
  const t = tareasManuales([base, { ...base, id: "t2", lead_id: null, hecha_at: "2026-10-02T00:00:00Z" }], new Map([["a", "Bar Paco"]]));
  expect(t[0]).toMatchObject({ clave: "manual:t1", tipo: "manual", negocio: "Bar Paco", hora: "09:00", tareaId: "t1", hecha: false });
  expect(t[1]).toMatchObject({ clave: "manual:t2", negocio: null, hecha: true });
});

describe("agruparTareas", () => {
  const ahora = { fecha: "2026-10-20", hora: "10:00" };
  const t = (clave: string, fecha: string | null, hora: string | null = null) => ({ clave, tipo: "manual" as const, titulo: clave, leadId: null, negocio: null, fecha, hora, asignadaA: null, tareaId: clave, hecha: false });

  test("reparte en atrasadas, hoy, próximas y sin fecha, teniendo en cuenta la hora", () => {
    const g = agruparTareas([t("ayer", "2026-10-19"), t("hoy-pasada", "2026-10-20", "09:00"), t("hoy-luego", "2026-10-20", "16:00"), t("hoy-sin-hora", "2026-10-20"), t("mañana", "2026-10-21"), t("nunca", null)], ahora);
    expect(g.atrasadas.map((x) => x.clave)).toEqual(["ayer", "hoy-pasada"]);
    expect(g.hoy.map((x) => x.clave)).toEqual(["hoy-luego", "hoy-sin-hora"]);
    expect(g.proximas.map((x) => x.clave)).toEqual(["mañana"]);
    expect(g.sin_fecha.map((x) => x.clave)).toEqual(["nunca"]);
  });

  test("las hechas no aparecen", () => {
    expect(agruparTareas([{ ...t("x", "2026-10-19"), hecha: true }], ahora).atrasadas).toEqual([]);
  });
});
