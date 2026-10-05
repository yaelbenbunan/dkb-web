import { describe, expect, it } from "vitest";
import {
  enHorario,
  enviarRecordatoriosPendientes,
  RECORDATORIOS,
  recordatorioPendiente,
  type DepsRecordatorio,
  type MensajeParaRecordatorio,
} from "../recordatorio";

// 5 de octubre de 2026: en Madrid es horario de verano (UTC+2).
const MEDIODIA = new Date("2026-10-05T10:00:00Z"); // 12:00 en Madrid
const HORA = 60 * 60 * 1000;

function hace(horas: number, desde: Date = MEDIODIA): string {
  return new Date(desde.getTime() - horas * HORA).toISOString();
}

const saludo = (horas: number, extra: Partial<MensajeParaRecordatorio> = {}): MensajeParaRecordatorio => ({
  direccion: "saliente",
  estado: "leido",
  created_at: hace(horas),
  ...extra,
});
const entrante = (horas: number): MensajeParaRecordatorio => ({ direccion: "entrante", estado: "entregado", created_at: hace(horas) });
/** Un recordatorio ya mandado: saliente con la marca que deja `reclamarRecordatorio`. */
const recordatorio = (horas: number, numero = 1): MensajeParaRecordatorio => saludo(horas, { payload: { recordatorio: numero } });
/** Lo que escribe una persona desde la bandeja: saliente sin marca. */
const manual = (horas: number): MensajeParaRecordatorio => saludo(horas);
const [PRIMERO, SEGUNDO] = RECORDATORIOS;

describe("enHorario", () => {
  it("solo de 9:00 a 20:00 de Madrid, no del servidor", () => {
    expect(enHorario(new Date("2026-10-05T07:00:00Z"))).toBe(true); // 9:00
    expect(enHorario(new Date("2026-10-05T17:59:00Z"))).toBe(true); // 19:59
    expect(enHorario(new Date("2026-10-05T18:00:00Z"))).toBe(false); // 20:00
    expect(enHorario(new Date("2026-10-05T06:59:00Z"))).toBe(false); // 8:59
    expect(enHorario(new Date("2026-10-05T23:30:00Z"))).toBe(false); // 1:30
  });

  it("sigue el cambio de hora: en invierno Madrid es UTC+1", () => {
    expect(enHorario(new Date("2026-12-01T08:00:00Z"))).toBe(true); // 9:00
    expect(enHorario(new Date("2026-12-01T07:30:00Z"))).toBe(false); // 8:30
  });
});

describe("recordatorioPendiente", () => {
  it("son dos: a las 3 h y a las 8 h del saludo, con textos distintos y el calendario", () => {
    expect(RECORDATORIOS.map((r) => r.horas)).toEqual([3, 8]);
    expect(PRIMERO.texto).not.toBe(SEGUNDO.texto);
    for (const r of RECORDATORIOS) expect(r.texto).toContain("https://calendar.app.google/");
  });

  it("toca el primero cuando el saludo lleva 3 h sin respuesta", () => {
    expect(recordatorioPendiente([entrante(3.1), saludo(3)], MEDIODIA)).toEqual({ numero: 1, texto: PRIMERO.texto });
  });

  it("todavía no toca antes de las 3 h", () => {
    expect(recordatorioPendiente([entrante(2.6), saludo(2.5)], MEDIODIA)).toBeNull();
  });

  it("toca el segundo a las 8 h del saludo, si el primero ya salió", () => {
    expect(recordatorioPendiente([entrante(8), saludo(8), recordatorio(5)], MEDIODIA)).toEqual({ numero: 2, texto: SEGUNDO.texto });
  });

  it("entre el primero y las 8 h no toca nada", () => {
    expect(recordatorioPendiente([entrante(6), saludo(6), recordatorio(3)], MEDIODIA)).toBeNull();
  });

  // Saludo a las 23:00: el primero se retrasa a las 9:00 y a esa hora ya han
  // pasado más de 8 h. Sin separación mínima saldrían los dos seguidos.
  it("deja 4 h entre uno y otro aunque el primero se retrasara por la noche", () => {
    expect(recordatorioPendiente([entrante(10), saludo(10), recordatorio(0.1)], MEDIODIA)).toBeNull();
    expect(recordatorioPendiente([entrante(14), saludo(14), recordatorio(4)], MEDIODIA)?.numero).toBe(2);
  });

  it("después del segundo no hay más", () => {
    expect(recordatorioPendiente([entrante(30), saludo(30), recordatorio(27), recordatorio(22, 2)], MEDIODIA)).toBeNull();
  });

  it("un recordatorio que falló al enviarse cuenta como mandado: no se repite", () => {
    const fallido = saludo(5, { estado: "fallido", payload: { recordatorio: 1 } });
    expect(recordatorioPendiente([entrante(9), saludo(9), fallido], MEDIODIA)?.numero).toBe(2);
  });

  it("no toca si el lead contestó después del saludo", () => {
    expect(recordatorioPendiente([entrante(5), saludo(5), entrante(4)], MEDIODIA)).toBeNull();
    expect(recordatorioPendiente([entrante(9), saludo(9), recordatorio(6), entrante(5)], MEDIODIA)).toBeNull();
  });

  it("no toca si una persona ya le escribió desde la bandeja", () => {
    expect(recordatorioPendiente([entrante(5), saludo(5), manual(1)], MEDIODIA)).toBeNull();
    expect(recordatorioPendiente([entrante(9), saludo(9), recordatorio(6), manual(5)], MEDIODIA)).toBeNull();
  });

  it("no toca si el saludo no llegó a enviarse, ni si no hay saludo", () => {
    expect(recordatorioPendiente([entrante(5), saludo(5, { estado: "fallido" })], MEDIODIA)).toBeNull();
    expect(recordatorioPendiente([entrante(5)], MEDIODIA)).toBeNull();
    expect(recordatorioPendiente([], MEDIODIA)).toBeNull();
  });
});

/* Orquestador --------------------------------------------------------------- */

interface ConvFalsa {
  id: string;
  wa_id: string;
  ventana_hasta: string | null;
  mensajes: MensajeParaRecordatorio[];
}

function depsFalsas(convs: ConvFalsa[], opts: { enviar?: DepsRecordatorio["enviarTexto"]; marca?: { id: string } | null } = {}) {
  const enviados: Array<{ waId: string; texto: string }> = [];
  const reclamados = new Set<string>();
  const cerrados: Array<{ mensajeId: string; wamid: string | null; error?: string }> = [];
  const deps: DepsRecordatorio = {
    async getMarca() {
      return opts.marca === undefined ? { id: "m-dinkbit" } : opts.marca;
    },
    async listCandidatas() {
      return convs;
    },
    async listMensajes(id) {
      return convs.find((c) => c.id === id)?.mensajes ?? [];
    },
    async reclamar(conversacionId, numero) {
      const clave = `${numero}:${conversacionId}`;
      if (reclamados.has(clave)) return null;
      reclamados.add(clave);
      return `msg-${conversacionId}`;
    },
    async enviarTexto(waId, texto) {
      enviados.push({ waId, texto });
      return opts.enviar ? opts.enviar(waId, texto) : { ok: true, wamid: `wamid.${waId}` };
    },
    async cerrar(input) {
      cerrados.push({ mensajeId: input.mensajeId, wamid: input.wamid, error: input.error });
    },
  };
  return { deps, enviados, reclamados, cerrados };
}

const ABIERTA = new Date(MEDIODIA.getTime() + 60 * HORA).toISOString();
const pendiente = (id: string): ConvFalsa => ({ id, wa_id: `34${id}`, ventana_hasta: ABIERTA, mensajes: [entrante(4), saludo(4)] });

describe("enviarRecordatoriosPendientes", () => {
  it("manda el recordatorio con el enlace del calendario a quien no contestó", async () => {
    const { deps, enviados, cerrados } = depsFalsas([pendiente("600111222")]);

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 1, fallidos: 0 });
    expect(enviados).toEqual([{ waId: "34600111222", texto: PRIMERO.texto }]);
    expect(cerrados).toEqual([{ mensajeId: "msg-600111222", wamid: "wamid.34600111222", error: undefined }]);
  });

  it("de noche no manda nada, ni siquiera mira las conversaciones", async () => {
    const { deps, enviados } = depsFalsas([pendiente("600111222")]);
    const noche = new Date("2026-10-05T21:00:00Z"); // 23:00 en Madrid

    expect(await enviarRecordatoriosPendientes(deps, noche)).toEqual({ enviados: 0, fallidos: 0 });
    expect(enviados).toHaveLength(0);
  });

  it("no escribe con la ventana cerrada: fuera de ella haría falta una plantilla", async () => {
    const cerrada = { ...pendiente("600111222"), ventana_hasta: hace(1) };
    const { deps, enviados } = depsFalsas([cerrada]);

    await enviarRecordatoriosPendientes(deps, MEDIODIA);
    expect(enviados).toHaveLength(0);
  });

  it("salta a quien contestó y a quien todavía no lleva 3 h", async () => {
    const contesto: ConvFalsa = { ...pendiente("1"), mensajes: [entrante(4), saludo(4), entrante(3)] };
    const reciente: ConvFalsa = { ...pendiente("2"), mensajes: [entrante(1), saludo(1)] };
    const { deps, enviados } = depsFalsas([contesto, reciente, pendiente("3")]);

    await enviarRecordatoriosPendientes(deps, MEDIODIA);
    expect(enviados.map((e) => e.waId)).toEqual(["343"]);
  });

  // Dos pasadas del cron que se pisan: la reclamación es lo que impide que el
  // lead reciba el mismo recordatorio dos veces.
  it("si otra pasada ya lo reclamó, no lo manda", async () => {
    const { deps, enviados, reclamados } = depsFalsas([pendiente("600111222")]);
    reclamados.add("1:600111222");

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 0, fallidos: 0 });
    expect(enviados).toHaveLength(0);
  });

  it("un envío que falla queda apuntado y no corta el resto", async () => {
    const { deps, cerrados } = depsFalsas([pendiente("1"), pendiente("2")], {
      enviar: async (waId) => (waId === "341" ? { ok: false, error: "boom" } : { ok: true, wamid: "w2" }),
    });

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 1, fallidos: 1 });
    expect(cerrados).toEqual([
      { mensajeId: "msg-1", wamid: null, error: "boom" },
      { mensajeId: "msg-2", wamid: "w2", error: undefined },
    ]);
  });

  it("una conversación que revienta no impide atender a las demás", async () => {
    const { deps, enviados } = depsFalsas([pendiente("1"), pendiente("2")]);
    const original = deps.listMensajes;
    deps.listMensajes = async (id) => {
      if (id === "1") throw new Error("supabase caído");
      return original(id);
    };

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 1, fallidos: 1 });
    expect(enviados.map((e) => e.waId)).toEqual(["342"]);
  });

  it("manda el segundo, con su texto, a quien ya recibió el primero", async () => {
    const conv: ConvFalsa = { ...pendiente("600111222"), mensajes: [entrante(9), saludo(9), recordatorio(6)] };
    const { deps, enviados, reclamados } = depsFalsas([conv]);

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 1, fallidos: 0 });
    expect(enviados).toEqual([{ waId: "34600111222", texto: SEGUNDO.texto }]);
    expect([...reclamados]).toEqual(["2:600111222"]);
  });

  it("sin la marca dinkbit no hace nada", async () => {
    const { deps, enviados } = depsFalsas([pendiente("1")], { marca: null });

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 0, fallidos: 0 });
    expect(enviados).toHaveLength(0);
  });
});
