import "server-only";
import { CONTACT_INFO } from "../contact-info";
import { MARCA_DINKBIT_SLUG } from "../ventas/dominio";
import { getMarcaPorSlug } from "../ventas/db";
import { cerrarRecordatorio, listConversacionesEnBot, listMensajes, reclamarRecordatorio } from "./db";
import { crearMensajero, type ResultadoEnvio } from "./mensajero";
import { ventanaAbierta } from "./ventana";

/**
 * Recordatorio automático a quien entró por un anuncio, recibió el saludo y no
 * contestó.
 *
 * Un clic de anuncio abre 72 h en las que escribir es gratis y no hace falta
 * plantilla; sin esto, esa ventana se perdía en cuanto el lead no pulsaba un
 * botón. Es UNO solo por conversación, a las 3 h, y nunca de noche. No toca el
 * puntero de la secuencia: si después el lead pulsa un botón del saludo, el
 * guion sigue donde estaba.
 *
 * El bot solo reacciona a mensajes entrantes, así que esto necesita un reloj:
 * lo llama `/api/cron/campaigns`, que Supabase dispara cada 5 minutos.
 *
 * Solo la marca `dinkbit`: el texto ofrece la demo de Growth, que no pinta
 * nada en las conversaciones de otra marca.
 */

const HORA = 60 * 60 * 1000;
export const ESPERA_HORAS = 3;
/** De 9:00 a 20:00, hora de Madrid. */
const HORA_DESDE = 9;
const HORA_HASTA = 20;

export const TEXTO_RECORDATORIO =
  "Hola de nuevo 👋 Si te va mejor verlo en directo, te enseño en 15 minutos cómo funcionaría en tu caso. " +
  `Elige el hueco que te venga bien: ${CONTACT_INFO.calendly}`;

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
}

/**
 * Toca cuando lo único que ha salido es el saludo, hace 3 h o más, y el lead no
 * ha escrito después. «Lo único que ha salido» es la regla que cubre a la vez
 * los dos casos en los que NO hay que insistir: una persona ya le escribió
 * desde la bandeja, o el recordatorio ya se mandó.
 */
export function tocaRecordatorio(mensajes: MensajeParaRecordatorio[], ahora: Date): boolean {
  const salientes = mensajes.filter((m) => m.direccion === "saliente");
  if (salientes.length !== 1) return false;
  const [saludo] = salientes;
  if (saludo.estado === "fallido") return false;

  const enviadoEn = new Date(saludo.created_at).getTime();
  if (!Number.isFinite(enviadoEn)) return false;
  const contesto = mensajes.some((m) => m.direccion === "entrante" && new Date(m.created_at).getTime() > enviadoEn);
  if (contesto) return false;

  return ahora.getTime() - enviadoEn >= ESPERA_HORAS * HORA;
}

export interface DepsRecordatorio {
  getMarca(): Promise<{ id: string } | null>;
  listCandidatas(marcaId: string, ahora: Date): Promise<Array<{ id: string; wa_id: string; ventana_hasta: string | null }>>;
  listMensajes(conversacionId: string): Promise<MensajeParaRecordatorio[]>;
  /** Apunta el recordatorio ANTES de enviarlo. `null` si otra pasada ya lo
   *  había apuntado: es lo que impide mandarlo dos veces. */
  reclamar(conversacionId: string, texto: string): Promise<string | null>;
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
      if (!tocaRecordatorio(await deps.listMensajes(conversacion.id), ahora)) continue;

      const mensajeId = await deps.reclamar(conversacion.id, TEXTO_RECORDATORIO);
      if (!mensajeId) continue;

      const envio = await deps.enviarTexto(conversacion.wa_id, TEXTO_RECORDATORIO);
      await deps.cerrar({
        mensajeId,
        conversacionId: conversacion.id,
        texto: TEXTO_RECORDATORIO,
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
