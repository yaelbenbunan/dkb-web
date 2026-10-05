import "server-only";
import { CONTACT_INFO } from "../contact-info";
import { MARCA_DINKBIT_SLUG } from "../ventas/dominio";
import { getMarcaPorSlug } from "../ventas/db";
import { cerrarRecordatorio, listConversacionesEnBot, listMensajes, reclamarRecordatorio } from "./db";
import { crearMensajero, type ResultadoEnvio } from "./mensajero";
import { ventanaAbierta } from "./ventana";

/**
 * Recordatorios automáticos a quien entró por un anuncio, recibió el saludo y
 * no contestó.
 *
 * Un clic de anuncio abre 72 h en las que escribir es gratis y no hace falta
 * plantilla; sin esto, esa ventana se perdía en cuanto el lead no pulsaba un
 * botón. Son DOS por conversación —a las 3 h y a las 8 h del saludo— y nunca
 * de noche. No tocan el puntero de la secuencia: si después el lead pulsa un
 * botón del saludo, el guion sigue donde estaba.
 *
 * El bot solo reacciona a mensajes entrantes, así que esto necesita un reloj:
 * lo llama `/api/cron/campaigns`, que Supabase dispara cada 5 minutos.
 *
 * Solo la marca `dinkbit`: los textos ofrecen la demo de Growth, que no pinta
 * nada en las conversaciones de otra marca.
 */

const HORA = 60 * 60 * 1000;
/** De 9:00 a 20:00, hora de Madrid. */
const HORA_DESDE = 9;
const HORA_HASTA = 20;
/** Entre un recordatorio y el siguiente. Hace falta porque el primero puede
 *  retrasarse hasta la mañana: sin esto, a un saludo de las 23:00 le saldrían
 *  los dos seguidos a las 9:00. */
const SEPARACION_HORAS = 4;

/**
 * En orden. `horas` se cuenta desde el saludo. El segundo no repite el
 * primero: da una salida fácil («dime qué día») porque cualquier respuesta,
 * aunque sea «ahora no», ya pone la conversación en manos de una persona.
 */
export const RECORDATORIOS: ReadonlyArray<{ horas: number; texto: string }> = [
  {
    horas: 3,
    texto:
      "Hola de nuevo 👋 Si te va mejor verlo en directo, te enseño en 15 minutos cómo funcionaría en tu caso. " +
      `Elige el hueco que te venga bien: ${CONTACT_INFO.calendly}`,
  },
  {
    horas: 8,
    texto:
      "Soy Paula otra vez, y es la última vez que insisto 🙂 Si ahora no es buen momento, dime qué día te viene mejor y te escribo entonces. " +
      `Y si prefieres verlo ya, aquí tienes los huecos: ${CONTACT_INFO.calendly}`,
  },
];

/** La hora que marca el reloj en Madrid, no en el servidor (que va en UTC). */
export function enHorario(ahora: Date): boolean {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hourCycle: "h23" }).format(ahora),
  );
  return hora >= HORA_DESDE && hora < HORA_HASTA;
}

export interface MensajeParaRecordatorio {
  direccion: "entrante" | "saliente";
  estado: "enviado" | "entregado" | "leido" | "fallido";
  created_at: string;
  /** Los recordatorios llevan aquí `{ recordatorio: n }` (lo deja
   *  `reclamarRecordatorio`); es lo que los distingue de lo que escribe una
   *  persona desde la bandeja. */
  payload?: unknown;
}

function esRecordatorio(payload: unknown): boolean {
  return typeof payload === "object" && payload !== null && Boolean((payload as { recordatorio?: unknown }).recordatorio);
}

/**
 * El recordatorio que toca mandar ahora, o `null`.
 *
 * Solo toca si, aparte del saludo, lo único que ha salido son recordatorios, y
 * el lead no ha escrito después del saludo. Esa regla cubre los dos casos en
 * los que NO hay que insistir: contestó, o una persona ya le escribió desde la
 * bandeja. Un recordatorio que falló al enviarse cuenta como mandado: se ve en
 * la bandeja y no se reintenta solo.
 */
export function recordatorioPendiente(
  mensajes: MensajeParaRecordatorio[],
  ahora: Date,
): { numero: number; texto: string } | null {
  const [saludo, ...resto] = mensajes.filter((m) => m.direccion === "saliente");
  if (!saludo || saludo.estado === "fallido" || esRecordatorio(saludo.payload)) return null;
  if (!resto.every((m) => esRecordatorio(m.payload))) return null;

  const siguiente = RECORDATORIOS[resto.length];
  if (!siguiente) return null;

  const enviadoEn = new Date(saludo.created_at).getTime();
  if (!Number.isFinite(enviadoEn)) return null;
  const contesto = mensajes.some((m) => m.direccion === "entrante" && new Date(m.created_at).getTime() > enviadoEn);
  if (contesto) return null;

  if (ahora.getTime() - enviadoEn < siguiente.horas * HORA) return null;
  const anterior = resto.at(-1);
  if (anterior && ahora.getTime() - new Date(anterior.created_at).getTime() < SEPARACION_HORAS * HORA) return null;

  return { numero: resto.length + 1, texto: siguiente.texto };
}

export interface DepsRecordatorio {
  getMarca(): Promise<{ id: string } | null>;
  listCandidatas(marcaId: string, ahora: Date): Promise<Array<{ id: string; wa_id: string; ventana_hasta: string | null }>>;
  listMensajes(conversacionId: string): Promise<MensajeParaRecordatorio[]>;
  /** Apunta el recordatorio ANTES de enviarlo. `null` si otra pasada ya lo
   *  había apuntado: es lo que impide mandarlo dos veces. */
  reclamar(conversacionId: string, numero: number, texto: string): Promise<string | null>;
  enviarTexto(waId: string, texto: string): Promise<ResultadoEnvio>;
  cerrar(input: { mensajeId: string; conversacionId: string; texto: string; wamid: string | null; error?: string }): Promise<void>;
}

export function depsReales(): DepsRecordatorio {
  const mensajero = crearMensajero();
  return {
    getMarca: () => getMarcaPorSlug(MARCA_DINKBIT_SLUG),
    listCandidatas: listConversacionesEnBot,
    listMensajes,
    reclamar: reclamarRecordatorio,
    enviarTexto: (waId, texto) => mensajero.enviarTexto(waId, texto),
    cerrar: cerrarRecordatorio,
  };
}

export async function enviarRecordatoriosPendientes(
  deps: DepsRecordatorio = depsReales(),
  ahora: Date = new Date(),
): Promise<{ enviados: number; fallidos: number }> {
  const resultado = { enviados: 0, fallidos: 0 };
  if (!enHorario(ahora)) return resultado;

  const marca = await deps.getMarca();
  if (!marca) return resultado;

  for (const conversacion of await deps.listCandidatas(marca.id, ahora)) {
    // Cada conversación por separado: un fallo con una no puede dejar sin
    // recordatorio a las demás.
    try {
      if (!ventanaAbierta(conversacion.ventana_hasta, ahora)) continue;
      const pendiente = recordatorioPendiente(await deps.listMensajes(conversacion.id), ahora);
      if (!pendiente) continue;

      const mensajeId = await deps.reclamar(conversacion.id, pendiente.numero, pendiente.texto);
      if (!mensajeId) continue;

      const envio = await deps.enviarTexto(conversacion.wa_id, pendiente.texto);
      await deps.cerrar({
        mensajeId,
        conversacionId: conversacion.id,
        texto: pendiente.texto,
        wamid: envio.ok ? envio.wamid : null,
        error: envio.ok ? undefined : envio.error,
      });
      if (envio.ok) resultado.enviados += 1;
      else resultado.fallidos += 1;
    } catch (e) {
      resultado.fallidos += 1;
      console.error("[whatsapp/recordatorio] fallo con la conversación", conversacion.id, e);
    }
  }
  return resultado;
}
