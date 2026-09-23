import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";

/**
 * Acceso a `ventas_conversaciones` y `ventas_mensajes` con la clave de
 * servicio. Mismo criterio que `src/lib/ventas/db.ts`: las lecturas lanzan si
 * Supabase falla (una bandeja que enseña «0 conversaciones» por un error de
 * red engañaría justo en lo que sirve), y las escrituras que alimentan
 * formularios devuelven `{ ok, error }`. Las escrituras de aquí las dispara el
 * webhook de Meta o el envío de un mensaje, no un formulario, así que se
 * limitan a lanzar como el resto: no hay una pantalla que sepa qué hacer con
 * un `{ ok: false }` a mitad de un webhook.
 */

export interface Conversacion {
  id: string;
  marca_id: string;
  lead_id: string | null;
  wa_id: string;
  estado: "bot" | "humana" | "cerrada";
  ventana_hasta: string | null;
  ultimo_mensaje_at: string;
}

export interface Mensaje {
  id: string;
  direccion: "entrante" | "saliente";
  wamid: string | null;
  texto: string | null;
  estado: "enviado" | "entregado" | "leido" | "fallido";
  error: string | null;
  created_at: string;
}

/** `getSupabaseAdmin` puede devolver `null` si faltan las variables de
 *  entorno; aquí eso siempre es un error de configuración, no un caso a
 *  tratar en cada llamada. */
function db() {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return sb;
}

/* Conversaciones -------------------------------------------------------- */

export async function getConversacion(marcaId: string, waId: string): Promise<Conversacion | null> {
  const r = await db()
    .from("ventas_conversaciones")
    .select("*")
    .eq("marca_id", marcaId)
    .eq("wa_id", waId)
    .maybeSingle();
  if (r.error) throw new Error(`[whatsapp/db] getConversacion: ${r.error.message}`);
  return r.data as Conversacion | null;
}

export async function crearConversacion(input: {
  marcaId: string;
  waId: string;
  leadId: string | null;
  estado: Conversacion["estado"];
  ventanaHasta: Date;
}): Promise<Conversacion> {
  const r = await db()
    .from("ventas_conversaciones")
    .insert({
      marca_id: input.marcaId,
      wa_id: input.waId,
      lead_id: input.leadId,
      estado: input.estado,
      ventana_hasta: input.ventanaHasta.toISOString(),
    })
    .select("*")
    .single();
  if (r.error) throw new Error(`[whatsapp/db] crearConversacion: ${r.error.message}`);
  return r.data as Conversacion;
}

export async function actualizarConversacion(
  id: string,
  cambios: { estado?: Conversacion["estado"]; leadId?: string | null; ventanaHasta?: Date },
): Promise<void> {
  // `leadId` puede venir explícitamente a `null` (desvincular el lead), así
  // que se distingue "no tocar" de "poner a null" mirando si la clave llegó,
  // no si su valor es falsy.
  const patch: Record<string, unknown> = {};
  if (cambios.estado !== undefined) patch.estado = cambios.estado;
  if (cambios.leadId !== undefined) patch.lead_id = cambios.leadId;
  if (cambios.ventanaHasta !== undefined) patch.ventana_hasta = cambios.ventanaHasta.toISOString();
  if (Object.keys(patch).length === 0) return;

  const { error } = await db().from("ventas_conversaciones").update(patch).eq("id", id);
  if (error) throw new Error(`[whatsapp/db] actualizarConversacion: ${error.message}`);
}

export async function listConversaciones(
  marcaId: string,
): Promise<Array<Conversacion & { ultimo_texto: string | null }>> {
  // `ultimo_texto` vive desnormalizado en la propia fila (lo mantienen
  // guardarEntrante/guardarSaliente en cada mensaje), así que listar la
  // bandeja es una sola query: sin esto, habría que leer el historial
  // completo de mensajes de la marca solo para quedarse con uno por
  // conversación, y eso degrada con el total de mensajes, no con el número
  // de conversaciones. `.limit(500)`: una bandeja no necesita más, y evita
  // traerse la tabla entera si algún día la marca acumula muchas.
  const r = await db()
    .from("ventas_conversaciones")
    .select("*")
    .eq("marca_id", marcaId)
    .order("ultimo_mensaje_at", { ascending: false })
    .limit(500);
  if (r.error) throw new Error(`[whatsapp/db] listConversaciones: ${r.error.message}`);
  return (r.data ?? []) as Array<Conversacion & { ultimo_texto: string | null }>;
}

/* Mensajes ---------------------------------------------------------------- */

/**
 * Inserta el entrante con `upsert(..., { onConflict: "wamid", ignoreDuplicates: true })`.
 * Meta reintenta el webhook cuando tarda en llegar el 200, así que el mismo
 * mensaje puede llegar varias veces; `nuevo: false` es la señal de que no hay
 * que volver a responder. Se usa `upsert` y no `insert` porque en
 * supabase-js v2 `onConflict`/`ignoreDuplicates` solo existen en `upsert`:
 * pasarlos a `insert` los ignora en silencio y el reintento chocaría con el
 * índice único de `wamid`.
 */
export async function guardarEntrante(input: {
  conversacionId: string;
  wamid: string;
  texto: string | null;
  payload: unknown;
}): Promise<{ nuevo: boolean }> {
  const { data, error } = await db()
    .from("ventas_mensajes")
    .upsert(
      {
        conversacion_id: input.conversacionId,
        direccion: "entrante",
        wamid: input.wamid,
        texto: input.texto,
        payload: input.payload ?? {},
        estado: "entregado",
      },
      { onConflict: "wamid", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`[whatsapp/db] guardarEntrante: ${error.message}`);
  const nuevo = (data ?? []).length > 0;

  // Solo se toca la conversación si el mensaje era nuevo: un reintento de
  // Meta del mismo wamid no debe reescribir ultimo_texto/ultimo_mensaje_at,
  // porque eso es justo la señal que otra capa usaría para pensar que ha
  // llegado algo nuevo a lo que responder.
  //
  // Este update es BEST-EFFORT: el mensaje ya quedó guardado arriba, que es
  // lo que importa. Si lanzáramos aquí, un fallo puramente cosmético (el
  // extracto de la bandeja) tumbaría la petición entera; Meta reintentaría
  // el webhook, el upsert de más arriba devolvería `nuevo: false` por el
  // wamid ya insertado, y el resumen desnormalizado quedaría roto para
  // siempre. Mejor perder el extracto que perder el 200.
  if (nuevo) {
    const conv = await db()
      .from("ventas_conversaciones")
      .update({ ultimo_texto: input.texto, ultimo_mensaje_at: new Date().toISOString() })
      .eq("id", input.conversacionId);
    if (conv.error) console.error(`[whatsapp/db] guardarEntrante (conversación): ${conv.error.message}`);
  }
  return { nuevo };
}

export async function guardarSaliente(input: {
  conversacionId: string;
  wamid: string | null;
  texto: string;
  error?: string;
}): Promise<void> {
  // `wamid` puede ser null (envío simulado): el índice único de `wamid` NO es
  // parcial (los NULL nunca chocan entre sí en un índice único de Postgres),
  // así que aquí basta un `insert` normal — no hace falta la idempotencia de
  // arriba porque cada envío saliente es un mensaje nuevo, nunca un reintento
  // de Meta.
  const { error } = await db()
    .from("ventas_mensajes")
    .insert({
      conversacion_id: input.conversacionId,
      direccion: "saliente",
      wamid: input.wamid,
      texto: input.texto,
      estado: input.error ? "fallido" : "enviado",
      error: input.error ?? null,
    });
  if (error) throw new Error(`[whatsapp/db] guardarSaliente: ${error.message}`);

  // Ya hay que tocar la fila de la conversación de todos modos (no añade una
  // escritura nueva): se aprovecha para mantener el resumen desnormalizado
  // que lee listConversaciones. Igual que en guardarEntrante, es BEST-EFFORT:
  // el mensaje saliente ya quedó guardado, así que un fallo aquí solo debe
  // registrarse, nunca tumbar la petición que lo disparó (p.ej. el webhook).
  const conv = await db()
    .from("ventas_conversaciones")
    .update({ ultimo_texto: input.texto, ultimo_mensaje_at: new Date().toISOString() })
    .eq("id", input.conversacionId);
  if (conv.error) console.error(`[whatsapp/db] guardarSaliente (conversación): ${conv.error.message}`);
}

export async function listMensajes(conversacionId: string): Promise<Mensaje[]> {
  const r = await db()
    .from("ventas_mensajes")
    .select("id, direccion, wamid, texto, estado, error, created_at")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true });
  if (r.error) throw new Error(`[whatsapp/db] listMensajes: ${r.error.message}`);
  return (r.data ?? []) as Mensaje[];
}

export async function setEstadoMensaje(
  wamid: string,
  estado: "entregado" | "leido" | "fallido",
): Promise<void> {
  const { error } = await db().from("ventas_mensajes").update({ estado }).eq("wamid", wamid);
  if (error) throw new Error(`[whatsapp/db] setEstadoMensaje: ${error.message}`);
}
