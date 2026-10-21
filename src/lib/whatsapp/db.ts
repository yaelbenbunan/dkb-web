import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import { FALTA_EN_LA_BASE } from "../ventas/db";

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
  /** Por dónde va la conversación dentro de su guion. El hilo de mensajes NO
   *  se duplica aquí (ya vive en `ventas_mensajes`): solo el puntero. */
  secuencia_id: string | null;
  /** `null` puede significar "todavía no ha empezado" o "ya terminó": ambos
   *  casos se resuelven fuera, mirando `secuencia_id`. */
  paso_actual: string | null;
  datos: Record<string, string>;
  /** Solo tiene valor si un paso usó `esperar_dias`. Sirve para ver, sin
   *  cron todavía, que una conversación quedó parada esperando. */
  reanudar_en: string | null;
  /** Nombre del perfil de WhatsApp del contacto. Opcional: depende de la migración. */
  nombre_contacto?: string | null;
}

export interface Mensaje {
  id: string;
  direccion: "entrante" | "saliente";
  wamid: string | null;
  texto: string | null;
  estado: "enviado" | "entregado" | "leido" | "fallido";
  error: string | null;
  /** Entrante: el mensaje crudo de Meta. Saliente: `{ botones }` si se mandó
   *  con botones (ver `botonesDePayload` en `bandeja.ts`). */
  payload: unknown;
  /** Quién lo escribió. Opcional: depende de la migración. */
  origen?: "cliente" | "bot" | "panel" | "movil" | "historial" | null;
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

type ErrorBase = { message: string; code?: string } | null;

/** Mientras falte la migración, CADA escritura con columnas nuevas cae aquí:
 *  con un aviso por proceso basta (igual que `listMensajes`), el resto sería
 *  ruido que tapa los errores de verdad en los logs de Vercel. */
let avisadoSinColumnasNuevas = false;

/**
 * Escribe `fila` con las columnas de la coexistencia (`nuevas`: `origen`,
 * `nombre_contacto`) y, si la base aún no las tiene (la migración
 * docs/sql/2026-10-20-whatsapp-por-marca.sql es MANUAL), repite la MISMA
 * escritura sin ellas. Así Dinkbit sigue recibiendo mensajes el día del
 * despliegue aunque nadie haya ejecutado el SQL todavía: perder el `origen` de
 * un mensaje es un dato de menos; perder el mensaje es un lead de menos.
 *
 * Las `nuevas` que llegan `undefined` no se escriben. Si sin ellas no queda
 * nada que escribir (p.ej. un update que solo traía el nombre), no se repite.
 */
async function conColumnasNuevas<R extends { error: ErrorBase }>(
  contexto: string,
  fila: Record<string, unknown>,
  nuevas: Record<string, unknown>,
  escribir: (fila: Record<string, unknown>) => PromiseLike<R>,
): Promise<R | null> {
  const presentes = Object.fromEntries(Object.entries(nuevas).filter(([, v]) => v !== undefined));
  const claves = Object.keys(presentes);
  if (claves.length === 0) return escribir(fila);

  const r = await escribir({ ...fila, ...presentes });
  if (!r.error?.code || !FALTA_EN_LA_BASE.has(r.error.code)) return r;
  if (!avisadoSinColumnasNuevas) {
    avisadoSinColumnasNuevas = true;
    console.error(
      `[whatsapp/db] ${contexto}: falta ejecutar la migración de WhatsApp por marca (${r.error.code}); se guarda sin ${claves.join(", ")}.`,
      r.error.message,
    );
  }
  if (Object.keys(fila).length === 0) return null;
  return escribir(fila);
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

/** Búsqueda puntual por id: para acciones que ya conocen la conversación
 *  (p.ej. responder desde la bandeja) y solo necesitan releer su fila para
 *  comprobar propiedad y ventana, sin traerse las hasta 500 de la marca. */
export async function getConversacionPorId(id: string): Promise<Conversacion | null> {
  const r = await db().from("ventas_conversaciones").select("*").eq("id", id).maybeSingle();
  if (r.error) throw new Error(`[whatsapp/db] getConversacionPorId: ${r.error.message}`);
  return r.data as Conversacion | null;
}

export async function crearConversacion(input: {
  marcaId: string;
  waId: string;
  leadId: string | null;
  estado: Conversacion["estado"];
  /** `null`: sin ventana abierta (una conversación importada del historial). */
  ventanaHasta: Date | null;
  /** Nombre del perfil de WhatsApp, si Meta lo mandó. */
  nombreContacto?: string | null;
  /** Por defecto, ahora. El historial la crea con la hora de su mensaje más
   *  antiguo: así guardarHistorial puede subirla al último sin que la
   *  conversación aparezca arriba de la bandeja como si fuera de hoy. */
  ultimoMensajeAt?: Date;
}): Promise<Conversacion> {
  const r = await conColumnasNuevas(
    "crearConversacion",
    {
      marca_id: input.marcaId,
      wa_id: input.waId,
      lead_id: input.leadId,
      estado: input.estado,
      ventana_hasta: input.ventanaHasta ? input.ventanaHasta.toISOString() : null,
      ...(input.ultimoMensajeAt ? { ultimo_mensaje_at: input.ultimoMensajeAt.toISOString() } : {}),
    },
    { nombre_contacto: input.nombreContacto ?? undefined },
    (fila) => db().from("ventas_conversaciones").insert(fila).select("*").single(),
  );
  if (!r || r.error) throw new Error(`[whatsapp/db] crearConversacion: ${r?.error?.message ?? "sin fila"}`);
  return r.data as Conversacion;
}

export async function actualizarConversacion(
  id: string,
  cambios: {
    estado?: Conversacion["estado"];
    leadId?: string | null;
    ventanaHasta?: Date;
    secuenciaId?: string | null;
    pasoActual?: string | null;
    datos?: Record<string, string>;
    reanudarEn?: Date | null;
    nombreContacto?: string | null;
  },
): Promise<void> {
  // `leadId`/`pasoActual`/`secuenciaId`/`reanudarEn` pueden venir
  // explícitamente a `null` (desvincular el lead, o terminar la secuencia a
  // propósito poniendo el paso a null), así que se distingue "no tocar" de
  // "poner a null" mirando si la clave llegó, no si su valor es falsy.
  const patch: Record<string, unknown> = {};
  if (cambios.estado !== undefined) patch.estado = cambios.estado;
  if (cambios.leadId !== undefined) patch.lead_id = cambios.leadId;
  if (cambios.ventanaHasta !== undefined) patch.ventana_hasta = cambios.ventanaHasta.toISOString();
  if (cambios.secuenciaId !== undefined) patch.secuencia_id = cambios.secuenciaId;
  if (cambios.pasoActual !== undefined) patch.paso_actual = cambios.pasoActual;
  if (cambios.datos !== undefined) patch.datos = cambios.datos;
  if (cambios.reanudarEn !== undefined) {
    patch.reanudar_en = cambios.reanudarEn ? cambios.reanudarEn.toISOString() : null;
  }
  if (Object.keys(patch).length === 0 && cambios.nombreContacto === undefined) return;

  const r = await conColumnasNuevas(
    "actualizarConversacion",
    patch,
    { nombre_contacto: cambios.nombreContacto },
    (fila) => db().from("ventas_conversaciones").update(fila).eq("id", id),
  );
  if (r?.error) throw new Error(`[whatsapp/db] actualizarConversacion: ${r.error.message}`);
}

/**
 * Update CONDICIONAL del puntero del guion: escribe `paso_actual` (y lo que
 * venga con él) SOLO si en la base sigue estando `pasoEsperado`, es decir el
 * paso que el llamador leyó antes de decidir el avance. Devuelve `true` si
 * esta entrega se quedó con el avance y `false` si no encajó ninguna fila,
 * que es la señal de que otra entrega concurrente ya avanzó desde ese mismo
 * paso (ronda B1, arreglo 1: el gate por wamid cubre el reintento del MISMO
 * mensaje, no dos mensajes distintos del lead entregados a la vez).
 *
 * Existe aparte de `actualizarConversacion` —y no como una opción suya— porque
 * su contrato es otro: esta función DEVUELVE si ganó la carrera, y el llamador
 * tiene que decidir en consecuencia (no enviar nada). Un `void` que se ignora,
 * como el de `actualizarConversacion`, no sirve para eso.
 *
 * El `.select("id")` no es decorativo: en supabase-js un update no dice cuántas
 * filas tocó si no le pides las filas afectadas, y sin ese dato no hay forma de
 * distinguir "reclamado" de "otra entrega se me adelantó".
 */
export async function reclamarPaso(
  id: string,
  cambios: {
    /** El `paso_actual` que el llamador leyó: la condición de la carrera.
     *  `null` reclama el ARRANQUE de una secuencia (una conversación que
     *  todavía no va por ningún paso), y se traduce a `is null` en vez de a
     *  `= null`, que en SQL no iguala nunca. */
    pasoEsperado: string | null;
    pasoActual: string | null;
    datos: Record<string, string>;
    secuenciaId?: string | null;
    estado?: Conversacion["estado"];
    reanudarEn?: Date | null;
  },
): Promise<boolean> {
  const patch: Record<string, unknown> = {
    paso_actual: cambios.pasoActual,
    datos: cambios.datos,
  };
  if (cambios.secuenciaId !== undefined) patch.secuencia_id = cambios.secuenciaId;
  if (cambios.estado !== undefined) patch.estado = cambios.estado;
  if (cambios.reanudarEn !== undefined) {
    patch.reanudar_en = cambios.reanudarEn ? cambios.reanudarEn.toISOString() : null;
  }

  const base = db().from("ventas_conversaciones").update(patch).eq("id", id);
  const filtrado =
    cambios.pasoEsperado === null
      ? base.is("paso_actual", null)
      : base.eq("paso_actual", cambios.pasoEsperado);
  const { data, error } = await filtrado.select("id");
  if (error) throw new Error(`[whatsapp/db] reclamarPaso: ${error.message}`);
  return (data ?? []).length > 0;
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
  /** Quién lo escribió; el webhook guarda `"cliente"`. */
  origen?: Mensaje["origen"];
}): Promise<{ nuevo: boolean }> {
  const r = await conColumnasNuevas(
    "guardarEntrante",
    {
      conversacion_id: input.conversacionId,
      direccion: "entrante",
      wamid: input.wamid,
      texto: input.texto,
      payload: input.payload ?? {},
      estado: "entregado",
    },
    { origen: input.origen ?? undefined },
    (fila) => db().from("ventas_mensajes").upsert(fila, { onConflict: "wamid", ignoreDuplicates: true }).select("id"),
  );
  if (!r || r.error) throw new Error(`[whatsapp/db] guardarEntrante: ${r?.error?.message ?? "sin respuesta"}`);
  const nuevo = (r.data ?? []).length > 0;

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

/**
 * Guarda un mensaje escrito desde la app de WhatsApp Business del móvil (un
 * «eco» de un número en coexistencia). Es un saliente, pero llega por el
 * webhook igual que un entrante, así que necesita la misma idempotencia por
 * `wamid`: Meta también reintenta los ecos. `created_at` es la hora en que se
 * envió desde el móvil, no la de llegada del webhook, para que el hilo de la
 * bandeja quede en el orden real.
 */
export async function guardarEco(input: {
  conversacionId: string;
  wamid: string;
  texto: string | null;
  enviadoEn: Date;
  payload: unknown;
}): Promise<{ nuevo: boolean }> {
  const enviadoEn = input.enviadoEn.toISOString();
  const r = await conColumnasNuevas(
    "guardarEco",
    {
      conversacion_id: input.conversacionId,
      direccion: "saliente",
      wamid: input.wamid,
      texto: input.texto,
      payload: input.payload ?? {},
      estado: "enviado",
      created_at: enviadoEn,
    },
    { origen: "movil" },
    (fila) => db().from("ventas_mensajes").upsert(fila, { onConflict: "wamid", ignoreDuplicates: true }).select("id"),
  );
  if (!r || r.error) throw new Error(`[whatsapp/db] guardarEco: ${r?.error?.message ?? "sin respuesta"}`);
  const nuevo = (r.data ?? []).length > 0;

  // Mismo criterio que guardarEntrante: solo si era nuevo, y best-effort. Y
  // solo si es más reciente que lo último de la conversación: un eco que se
  // procesa después de un entrante posterior (otro lote, un reintento) no
  // puede devolver el resumen de la bandeja a un mensaje más viejo.
  if (nuevo) {
    const conv = await db()
      .from("ventas_conversaciones")
      .update({ ultimo_texto: input.texto, ultimo_mensaje_at: enviadoEn })
      .eq("id", input.conversacionId)
      .lt("ultimo_mensaje_at", enviadoEn);
    if (conv.error) console.error(`[whatsapp/db] guardarEco (conversación): ${conv.error.message}`);
  }
  return { nuevo };
}

/**
 * Importa un hilo del historial que la empresa compartió al conectar el
 * número. Un solo upsert por lote, idempotente por `wamid` como los entrantes
 * y los ecos: Meta reintenta, y un mensaje escrito desde el móvil puede llegar
 * antes como eco y después otra vez en el historial. `created_at` es la hora
 * real del mensaje para que el hilo quede en orden. Devuelve cuántos eran
 * nuevos.
 */
export async function guardarHistorial(input: {
  conversacionId: string;
  mensajes: Array<{ wamid: string; deNegocio: boolean; texto: string | null; enviadoEn: Date; crudo: unknown }>;
}): Promise<number> {
  if (input.mensajes.length === 0) return 0;
  const filas = input.mensajes.map((m) => ({
    conversacion_id: input.conversacionId,
    direccion: m.deNegocio ? "saliente" : "entrante",
    wamid: m.wamid,
    texto: m.texto,
    payload: m.crudo ?? {},
    estado: m.deNegocio ? "enviado" : "entregado",
    created_at: m.enviadoEn.toISOString(),
  }));
  const escribir = (conOrigen: boolean) =>
    db()
      .from("ventas_mensajes")
      .upsert(conOrigen ? filas.map((f) => ({ ...f, origen: "historial" })) : filas, {
        onConflict: "wamid",
        ignoreDuplicates: true,
      })
      .select("wamid");

  // Mismo criterio que conColumnasNuevas, para un lote: sin la columna
  // `origen` (migración pendiente) se guarda igual, sin ella.
  let r = await escribir(true);
  if (r.error?.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    console.error(
      `[whatsapp/db] guardarHistorial: falta ejecutar la migración de WhatsApp por marca (${r.error.code}); se guarda sin origen.`,
      r.error.message,
    );
    r = await escribir(false);
  }
  if (r.error) throw new Error(`[whatsapp/db] guardarHistorial: ${r.error.message}`);

  const insertados = new Set(((r.data ?? []) as Array<{ wamid: string }>).map((f) => f.wamid));
  let ultimo: (typeof input.mensajes)[number] | null = null;
  for (const m of input.mensajes) {
    if (insertados.has(m.wamid) && (!ultimo || m.enviadoEn > ultimo.enviadoEn)) ultimo = m;
  }

  // Best-effort, como en guardarEco, y solo si lo importado no es más viejo
  // que lo que ya tenía la conversación: el historial llega por lotes y
  // después de los mensajes en vivo. `lte` y no `lt`: una conversación creada
  // para el historial nace con la hora de su mensaje más antiguo, que en un
  // hilo de un solo mensaje es justo la del último.
  if (ultimo) {
    const enviadoEn = ultimo.enviadoEn.toISOString();
    const conv = await db()
      .from("ventas_conversaciones")
      .update({ ultimo_texto: ultimo.texto, ultimo_mensaje_at: enviadoEn })
      .eq("id", input.conversacionId)
      .lte("ultimo_mensaje_at", enviadoEn);
    if (conv.error) console.error(`[whatsapp/db] guardarHistorial (conversación): ${conv.error.message}`);
  }
  return insertados.size;
}

/* Contactos --------------------------------------------------------------- */

/**
 * Nombres de la agenda de la app de WhatsApp Business, que llegan por la
 * sincronización de coexistencia. La tabla `ventas_whatsapp_contactos` es de
 * la migración MANUAL docs/sql/2026-10-20-whatsapp-por-marca.sql: hasta que
 * se ejecute, los nombres simplemente no se guardan (un nombre de menos, no
 * un webhook caído).
 */
export async function guardarContactos(marcaId: string, contactos: Array<{ waId: string; nombre: string }>): Promise<void> {
  if (contactos.length === 0) return;
  const actualizadoEn = new Date().toISOString();
  const r = await db()
    .from("ventas_whatsapp_contactos")
    .upsert(
      contactos.map((c) => ({ marca_id: marcaId, wa_id: c.waId, nombre: c.nombre, actualizado_en: actualizadoEn })),
      { onConflict: "marca_id,wa_id" },
    );
  if (!r.error) return;
  if (r.error.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    console.error(`[whatsapp/db] guardarContactos: falta ejecutar la migración de WhatsApp por marca (${r.error.code}); no se guardan.`);
    return;
  }
  throw new Error(`[whatsapp/db] guardarContactos: ${r.error.message}`);
}

export async function nombreDeContacto(marcaId: string, waId: string): Promise<string | null> {
  const r = await db()
    .from("ventas_whatsapp_contactos")
    .select("nombre")
    .eq("marca_id", marcaId)
    .eq("wa_id", waId)
    .maybeSingle();
  if (!r.error) return (r.data as { nombre: string } | null)?.nombre ?? null;
  if (r.error.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    console.error(`[whatsapp/db] nombreDeContacto: falta ejecutar la migración de WhatsApp por marca (${r.error.code}).`);
    return null;
  }
  throw new Error(`[whatsapp/db] nombreDeContacto: ${r.error.message}`);
}

export async function guardarSaliente(input: {
  conversacionId: string;
  wamid: string | null;
  texto: string;
  error?: string;
  /** Rótulos de los botones con los que se mandó, si los llevaba. */
  botones?: readonly string[];
  /** Quién lo escribió: `"bot"` para los del guion y el respaldo. */
  origen?: Mensaje["origen"];
}): Promise<void> {
  // `wamid` puede ser null (envío simulado): el índice único de `wamid` NO es
  // parcial (los NULL nunca chocan entre sí en un índice único de Postgres),
  // así que aquí basta un `insert` normal — no hace falta la idempotencia de
  // arriba porque cada envío saliente es un mensaje nuevo, nunca un reintento
  // de Meta.
  const r = await conColumnasNuevas(
    "guardarSaliente",
    {
      conversacion_id: input.conversacionId,
      direccion: "saliente",
      wamid: input.wamid,
      texto: input.texto,
      estado: input.error ? "fallido" : "enviado",
      error: input.error ?? null,
      ...(input.botones && input.botones.length > 0 ? { payload: { botones: [...input.botones] } } : {}),
    },
    { origen: input.origen ?? undefined },
    (fila) => db().from("ventas_mensajes").insert(fila),
  );
  if (r?.error) throw new Error(`[whatsapp/db] guardarSaliente: ${r.error.message}`);

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

const COLUMNAS_MENSAJE = "id, direccion, wamid, texto, estado, error, payload, created_at";
let avisadoSinOrigen = false;

export async function listMensajes(conversacionId: string): Promise<Mensaje[]> {
  const leer = (columnas: string) =>
    db().from("ventas_mensajes").select(columnas).eq("conversacion_id", conversacionId).order("created_at", { ascending: true });
  let r = await leer(`${COLUMNAS_MENSAJE}, origen`);
  // Migración sin ejecutar: la bandeja sigue funcionando, solo sin etiquetas de origen.
  if (r.error?.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    if (!avisadoSinOrigen) {
      avisadoSinOrigen = true;
      console.error(`[whatsapp/db] listMensajes: falta ejecutar la migración de WhatsApp por marca (${r.error.code}); se lee sin origen.`);
    }
    r = await leer(COLUMNAS_MENSAJE);
  }
  if (r.error) throw new Error(`[whatsapp/db] listMensajes: ${r.error.message}`);
  return (r.data ?? []) as unknown as Mensaje[];
}

/* Recordatorio automático ------------------------------------------------- */

/** Conversaciones que todavía lleva el bot y con la ventana abierta: las
 *  únicas a las que `recordatorio.ts` puede tener algo que decir. */
export async function listConversacionesEnBot(marcaId: string, ahora: Date): Promise<Conversacion[]> {
  const r = await db()
    .from("ventas_conversaciones")
    .select("*")
    .eq("marca_id", marcaId)
    .eq("estado", "bot")
    .gt("ventana_hasta", ahora.toISOString())
    .order("ultimo_mensaje_at", { ascending: true })
    .limit(200);
  if (r.error) throw new Error(`[whatsapp/db] listConversacionesEnBot: ${r.error.message}`);
  return (r.data ?? []) as Conversacion[];
}

const UNICO_VIOLADO = "23505";

/**
 * Apunta el recordatorio número `numero` de una conversación ANTES de enviarlo
 * y devuelve el id de la fila, o `null` si ya estaba apuntado.
 *
 * La reclamación es el propio `insert`: la fila nace con un `wamid`
 * provisional que depende solo de la conversación y del número, y `wamid`
 * tiene índice único, así que de dos pasadas del cron que se pisen solo una
 * inserta. Es lo que impide mandar el mismo recordatorio dos veces sin añadir
 * una columna. `cerrarRecordatorio` cambia después ese `wamid` por el real; a
 * partir de ahí lo que cuenta es la marca `payload.recordatorio`, que es por
 * donde `recordatorioPendiente` sabe cuántos han salido ya.
 */
export async function reclamarRecordatorio(conversacionId: string, numero: number, texto: string): Promise<string | null> {
  const r = await db()
    .from("ventas_mensajes")
    .insert({
      conversacion_id: conversacionId,
      direccion: "saliente",
      wamid: `recordatorio:${numero}:${conversacionId}`,
      texto,
      estado: "enviado",
      payload: { recordatorio: numero },
    })
    .select("id")
    .single();
  if (r.error) {
    if (r.error.code === UNICO_VIOLADO) return null;
    throw new Error(`[whatsapp/db] reclamarRecordatorio: ${r.error.message}`);
  }
  return (r.data as { id: string }).id;
}

/**
 * Deja el recordatorio ya reclamado con el resultado del envío. Si se envió,
 * pasa a llevar el `wamid` real, que es por donde Meta avisa luego de
 * «entregado» y «leído». Si falló, se queda con el provisional y en
 * `fallido`: se ve en la bandeja y no se reintenta solo.
 */
export async function cerrarRecordatorio(input: {
  mensajeId: string;
  conversacionId: string;
  texto: string;
  wamid: string | null;
  error?: string;
}): Promise<void> {
  const cambios: Record<string, unknown> = input.error ? { estado: "fallido", error: input.error } : {};
  if (input.wamid) cambios.wamid = input.wamid;
  if (Object.keys(cambios).length > 0) {
    const r = await db().from("ventas_mensajes").update(cambios).eq("id", input.mensajeId);
    if (r.error) throw new Error(`[whatsapp/db] cerrarRecordatorio: ${r.error.message}`);
  }

  // Mismo resumen desnormalizado que mantiene `guardarSaliente`, y con el
  // mismo criterio: best-effort, el mensaje ya está guardado.
  const conv = await db()
    .from("ventas_conversaciones")
    .update({ ultimo_texto: input.texto, ultimo_mensaje_at: new Date().toISOString() })
    .eq("id", input.conversacionId);
  if (conv.error) console.error(`[whatsapp/db] cerrarRecordatorio (conversación): ${conv.error.message}`);
}

export async function setEstadoMensaje(
  wamid: string,
  estado: "entregado" | "leido" | "fallido",
): Promise<void> {
  const { error } = await db().from("ventas_mensajes").update({ estado }).eq("wamid", wamid);
  if (error) throw new Error(`[whatsapp/db] setEstadoMensaje: ${error.message}`);
}
