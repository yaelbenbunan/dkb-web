import { describe, expect, it } from "vitest";
import {
  enHorario,
  enviarRecordatoriosPendientes,
  TEXTO_RECORDATORIO,
  tocaRecordatorio,
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

describe("tocaRecordatorio", () => {
  it("toca cuando el saludo lleva 3 h sin respuesta", () => {
    expect(tocaRecordatorio([entrante(3.1), saludo(3)], MEDIODIA)).toBe(true);
  });

  it("todavía no toca antes de las 3 h", () => {
    expect(tocaRecordatorio([entrante(2.6), saludo(2.5)], MEDIODIA)).toBe(false);
  });

  it("no toca si el lead contestó después del saludo", () => {
    expect(tocaRecordatorio([entrante(5), saludo(5), entrante(4)], MEDIODIA)).toBe(false);
  });

  it("no toca si ya salió otro mensaje: una persona escribió, o el recordatorio ya se mandó", () => {
    expect(tocaRecordatorio([entrante(5), saludo(5), saludo(1)], MEDIODIA)).toBe(false);
  });

  it("no toca si el saludo no llegó a enviarse, ni si no hay saludo", () => {
    expect(tocaRecordatorio([entrante(5), saludo(5, { estado: "fallido" })], MEDIODIA)).toBe(false);
    expect(tocaRecordatorio([entrante(5)], MEDIODIA)).toBe(false);
    expect(tocaRecordatorio([], MEDIODIA)).toBe(false);
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
    async reclamar(conversacionId) {
      if (reclamados.has(conversacionId)) return null;
      reclamados.add(conversacionId);
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
    expect(enviados).toEqual([{ waId: "34600111222", texto: TEXTO_RECORDATORIO }]);
    expect(TEXTO_RECORDATORIO).toContain("https://calendar.app.google/");
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
    reclamados.add("600111222");

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

  it("sin la marca dinkbit no hace nada", async () => {
    const { deps, enviados } = depsFalsas([pendiente("1")], { marca: null });

    expect(await enviarRecordatoriosPendientes(deps, MEDIODIA)).toEqual({ enviados: 0, fallidos: 0 });
    expect(enviados).toHaveLength(0);
  });
});
