import { describe, expect, test } from "vitest";
import {
  hoyMadrid,
  mesDe,
  esMes,
  mesAnterior,
  mesSiguiente,
  nombreMes,
  rangoConsultaMes,
  formatoFecha,
  calcularEmbudo,
  pctPaso,
  resumenMes,
  agruparSeguimientos,
} from "../ventas/metricas";

describe("fechas en hora de Madrid", () => {
  test("a las 23:30 UTC del 30 de septiembre en Madrid ya es 1 de octubre", () => {
    expect(hoyMadrid(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(mesDe("2026-09-30T23:30:00Z")).toBe("2026-10");
  });

  test("navegación y validación de meses", () => {
    expect(esMes("2026-09")).toBe(true);
    expect(esMes("2026-13")).toBe(false);
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSiguiente("2026-12")).toBe("2027-01");
    expect(nombreMes("2026-09")).toBe("septiembre de 2026");
  });

  test("el rango de consulta cubre el mes con un día de margen", () => {
    expect(rangoConsultaMes("2026-09")).toEqual({
      desde: "2026-08-31T00:00:00.000Z",
      hasta: "2026-10-02T00:00:00.000Z",
    });
  });

  test("formato de fecha corto", () => {
    expect(formatoFecha("2026-09-20")).toBe("20/09/2026");
  });
});

describe("calcularEmbudo", () => {
  test("los «fuera de perfil» no cuentan: nunca fueron una oportunidad", () => {
    // Si contaran, la tasa de conversión se hundiría por leads que no eran
    // nuestro público y que además están archivados fuera del embudo.
    const leads = [
      { id: "a", fase: "cliente" as const },
      { id: "b", fase: "fuera_de_perfil" as const },
      { id: "c", fase: "fuera_de_perfil" as const },
    ];
    const embudo = calcularEmbudo(leads, []);
    expect(embudo.total).toBe(1);
    expect(embudo.alcanzaron.contactado).toBe(1);
    expect(embudo.porFase.fuera_de_perfil).toBe(2);
  });

  test("«volver a llamar» cuenta como contactado: alguien lo intentó", () => {
    const embudo = calcularEmbudo([{ id: "a", fase: "volver_a_llamar" as const }], []);
    expect(embudo.alcanzaron.contactado).toBe(1);
    expect(embudo.alcanzaron.interesado).toBe(0);
  });

  test("cuenta a cada lead en todas las etapas que alcanzó, aunque luego se cerrara", () => {
    const leads = [
      { id: "a", fase: "nuevo" as const },
      { id: "b", fase: "interesado" as const },
      { id: "c", fase: "no_interesa" as const },
      { id: "d", fase: "muestras" as const },
    ];
    const cambios = [{ lead_id: "c", datos: { fase_anterior: "muestras", fase_nueva: "no_interesa" } }, { lead_id: "c", datos: { fase_nueva: "muestras" } }];
    const e = calcularEmbudo(leads, cambios);
    expect(e.total).toBe(4);
    expect(e.alcanzaron).toEqual({ contactado: 3, interesado: 3, muestras: 2, cliente: 0 });
    expect(e.porFase.no_interesa).toBe(1);
  });

  test("un lead cerrado sin historial cuenta al menos como contactado", () => {
    const e = calcularEmbudo([{ id: "x", fase: "ilocalizable" }], []);
    expect(e.alcanzaron.contactado).toBe(1);
    expect(e.alcanzaron.interesado).toBe(0);
  });

  test("pctPaso", () => {
    expect(pctPaso(1, 4)).toBe(25);
    expect(pctPaso(0, 0)).toBeNull();
  });
});

describe("resumenMes", () => {
  test("cuenta lo del mes y los seguimientos atrasados de fases activas", () => {
    const leads = [
      { created_at: "2026-09-02T10:00:00Z", fase: "contactado" as const, proximo_seguimiento: "2026-09-10" },
      { created_at: "2026-08-20T10:00:00Z", fase: "no_interesa" as const, proximo_seguimiento: "2026-09-01" },
      { created_at: "2026-09-15T10:00:00Z", fase: "nuevo" as const, proximo_seguimiento: "2026-09-17" },
    ];
    const actividad = [
      { tipo: "llamada", datos: {}, created_at: "2026-09-05T09:00:00Z" },
      { tipo: "llamada", datos: {}, created_at: "2026-08-31T09:00:00Z" },
      { tipo: "cambio_fase", datos: { fase_nueva: "interesado" }, created_at: "2026-09-06T09:00:00Z" },
      { tipo: "muestras_enviadas", datos: {}, created_at: "2026-09-07T09:00:00Z" },
    ];
    expect(resumenMes("2026-09", leads, actividad, "2026-09-17")).toEqual({
      leadsNuevos: 2,
      llamadas: 1,
      interesados: 1,
      muestras: 1,
      seguimientosAtrasados: 1,
    });
  });
});

describe("agruparSeguimientos", () => {
  test("separa atrasados (ordenados) de los de hoy e ignora futuros", () => {
    const r = agruparSeguimientos(
      [
        { id: 1, proximo_seguimiento: "2026-09-17" },
        { id: 2, proximo_seguimiento: "2026-09-15" },
        { id: 3, proximo_seguimiento: "2026-09-10" },
        { id: 4, proximo_seguimiento: "2026-09-20" },
        { id: 5, proximo_seguimiento: null },
      ],
      "2026-09-17",
    );
    expect(r.atrasados.map((l) => l.id)).toEqual([3, 2]);
    expect(r.hoy.map((l) => l.id)).toEqual([1]);
  });
});
