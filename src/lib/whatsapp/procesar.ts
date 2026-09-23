import "server-only";
import {
  actualizarConversacion,
  crearConversacion,
  getConversacion,
  guardarEntrante,
  guardarSaliente,
  setEstadoMensaje,
  type Conversacion,
} from "./db";
import { textoAutorespuesta } from "./autorespuesta";
import { decidir, extraerEstados, extraerMensajes, type MensajeEntrante } from "./entrante";
import { crearMensajero, type MensajeroWhatsApp } from "./mensajero";
import { calcularVentana, telefonoDeWaId } from "./ventana";
import { buscarLeadPorContacto, crearLeads, getMarcaPorSlug, registrarActividad } from "../ventas/db";

/**
 * Orquestador del webhook de WhatsApp Cloud API: clasifica cada mensaje con
 * `entrante.ts` y ejecuta la acción (crear lead, responder, guardar,
 * actualizar estados) contra las dependencias reales o unas de test.
 *
 * `buscarLeadPorTelefono` y `crearLeadDeAnuncio` NO viven en `whatsapp/db.ts`:
 * son wiring sobre `src/lib/ventas/db.ts` (los leads son del dominio de
 * ventas, que ya tiene su propio acceso a datos). Mezclarlos en el módulo del
 * canal crearía dos caminos de escritura a la misma tabla.
 *
 * Política de fallos (ver `procesarMensaje` para el detalle): lo de ANTES de
 * guardar el mensaje entrante se propaga (es reintentable, la ruta responde
 * 500); lo de DESPUÉS se traga y se registra (es best-effort, nunca debe
 * costar el mensaje ya guardado ni forzar un reintento que no arreglaría
 * nada). `getMarcaPorSlug` sigue la misma regla: si LANZA, se propaga; si
 * devuelve `null` (la marca no existe), es un 200 normal, porque reintentar
 * no la va a crear.
 */
export interface Deps {
  mensajero: MensajeroWhatsApp;
  getConversacion: typeof getConversacion;
  crearConversacion: typeof crearConversacion;
  actualizarConversacion: typeof actualizarConversacion;
  guardarEntrante: typeof guardarEntrante;
  guardarSaliente: typeof guardarSaliente;
  setEstadoMensaje: typeof setEstadoMensaje;
  buscarLeadPorTelefono: (marcaId: string, telefono: string) => Promise<{ id: string } | null>;
  crearLeadDeAnuncio: (input: {
    marcaId: string;
    waId: string;
    telefono: string | null;
    campana: string | null;
    anuncio: string | null;
  }) => Promise<{ id: string }>;
}

// La marca en la que viven los leads/conversaciones de este canal (spec:
// "como una marca más del módulo de ventas").
const MARCA_SLUG = "dinkbit";

/**
 * Dependencias reales: `crearMensajero()` se llama SIN argumentos a
 * propósito. Pasarle `process.env.WHATSAPP_TOKEN` a mano marcaría las
 * credenciales como "explícitas" y saltaría la barrera que impide enviar
 * mensajes reales desde un entorno que no es producción (ver mensajero.ts).
 */
function depsReales(): Deps {
  return {
    mensajero: crearMensajero(),
    getConversacion,
    crearConversacion,
    actualizarConversacion,
    guardarEntrante,
    guardarSaliente,
    setEstadoMensaje,
    async buscarLeadPorTelefono(marcaId, telefono) {
      const lead = await buscarLeadPorContacto(marcaId, { telefono });
      return lead ? { id: lead.id } : null;
    },
    async crearLeadDeAnuncio({ marcaId, waId, telefono, anuncio }) {
      // Meta no manda nombre de negocio en un mensaje de WhatsApp: no hay
      // dato que rellenar ahí, así que se deja un rótulo identificable en vez
      // de inventar uno (memoria "Casos: solo lo que te dan").
      const resultado = await crearLeads({
        marcaId,
        usuariaId: null,
        origen: "anuncio",
        origenDetalle: anuncio,
        leads: [
          {
            negocio: `Lead de WhatsApp (${telefono ?? waId})`,
            tipo_negocio: null,
            contacto: "",
            telefono: telefono ?? waId,
            email: "",
            ciudad: "",
            cif: "",
            web: "",
            excluido: false,
          },
        ],
      });
      if (!resultado.ok) throw new Error(`[whatsapp] crearLeadDeAnuncio: ${resultado.error}`);
      // La RPC solo devuelve un contador, no el id creado: se recupera
      // buscando por el mismo teléfono con el que se acaba de crear.
      const creado = await buscarLeadPorContacto(marcaId, { telefono: telefono ?? waId });
      if (!creado) throw new Error("[whatsapp] crearLeadDeAnuncio: no se encontró el lead recién creado");
      return { id: creado.id };
    },
  };
}

/** Aplica un cambio a una conversación existente y devuelve la copia ya actualizada. */
async function actualizarYDevolver(
  deps: Pick<Deps, "actualizarConversacion">,
  actual: Conversacion,
  cambios: { estado: Conversacion["estado"]; leadId: string | null; ventanaHasta: Date },
): Promise<Conversacion> {
  await deps.actualizarConversacion(actual.id, cambios);
  return {
    ...actual,
    estado: cambios.estado,
    lead_id: cambios.leadId,
    ventana_hasta: cambios.ventanaHasta.toISOString(),
  };
}

/**
 * Crea la conversación SIN lead todavía. El índice único `(marca_id, wa_id)`
 * de `ventas_conversaciones` es el único mutex real contra dos ENTREGAS
 * CONCURRENTES del mismo webhook (no un reintento secuencial, que ya cubre
 * el wamid, sino dos peticiones a la vez de Meta). Por eso se reserva la
 * conversación antes de crear el lead: si dos entregas llegan a la vez,
 * como mucho una gana la inserción y, por tanto, como mucho se crea un lead.
 *
 * Si la inserción choca con el índice único, la otra entrega ya ganó la
 * carrera: se relee la conversación existente y se sigue con ella. Si el
 * fallo no es esa colisión (p.ej. un hipo real de Supabase), se propaga:
 * sigue siendo un fallo de fase A, reintentable desde cero.
 */
async function crearConversacionOReleer(
  deps: Pick<Deps, "crearConversacion" | "getConversacion">,
  input: { marcaId: string; waId: string; ventanaHasta: Date },
): Promise<Conversacion> {
  try {
    return await deps.crearConversacion({
      marcaId: input.marcaId,
      waId: input.waId,
      leadId: null,
      estado: "bot",
      ventanaHasta: input.ventanaHasta,
    });
  } catch (e) {
    const existente = await deps.getConversacion(input.marcaId, input.waId);
    if (!existente) throw e;
    return existente;
  }
}

/**
 * Procesa un mensaje entrante ya clasificado. Devuelve `true` si el mensaje
 * era nuevo (no un reintento de Meta del mismo wamid).
 *
 * Dos fases con reglas de fallo opuestas, separadas por `guardarEntrante`:
 *
 * FASE A (todo lo de antes de `guardarEntrante`): el mensaje TODAVÍA no está
 * persistido. Un fallo aquí (un hipo transitorio de Supabase en
 * `getConversacion`, `buscarLeadPorTelefono`, `crearLeadDeAnuncio`,
 * `crearConversacion`...) se deja propagar a propósito: `procesarWebhook` y
 * la ruta no lo atrapan, así que la ruta responde 500 y Meta reintenta. Como
 * el wamid todavía no existe en `ventas_mensajes`, el reintento no duplica
 * nada — es justo para esto que se construyó la idempotencia por wamid.
 *
 * FASE B (todo lo de después): el mensaje YA está guardado. Un fallo aquí
 * (el envío, el guardado del saliente, la actividad) NUNCA debe tumbar el
 * procesado: se registra con `console.error` y se sigue. Propagarlo sería
 * peor que perder el acuse, porque el gate de idempotencia de arriba
 * impediría que un reintento de Meta lo repare.
 */
async function procesarMensaje(
  marcaId: string,
  mensaje: MensajeEntrante,
  deps: Deps,
  ahora: Date,
): Promise<boolean> {
  // ---- FASE A: reintentable ----------------------------------------------
  const conversacionExistente = await deps.getConversacion(marcaId, mensaje.waId);
  const telefono = telefonoDeWaId(mensaje.waId);
  // `recibidoEn` sale de parsear el timestamp de Meta (segundos como texto);
  // si viniera corrupto sería `Invalid Date`, y `calcularVentana(...).toISOString()`
  // reventaría al guardar. `ahora` (inyectable en tests) es el respaldo.
  const recibidoEn = Number.isFinite(mensaje.recibidoEn.getTime()) ? mensaje.recibidoEn : ahora;

  // El lead "actual" prioriza el ya vinculado a la conversación: así un
  // reintento de Meta (o un segundo mensaje de la misma persona) nunca vuelve
  // a buscar —ni, sobre todo, a CREAR— el lead.
  let leadId: string | null = conversacionExistente?.lead_id ?? null;
  let leadExiste = leadId !== null;
  if (!leadExiste && telefono) {
    const encontrado = await deps.buscarLeadPorTelefono(marcaId, telefono);
    if (encontrado) {
      leadId = encontrado.id;
      leadExiste = true;
    }
  }

  const decision = decidir({
    mensaje,
    conversacion: conversacionExistente ? { estado: conversacionExistente.estado } : null,
    leadExiste,
  });

  let conversacion: Conversacion;

  if (decision.accion === "crear_lead_y_responder") {
    // decidir() solo devuelve esta acción cuando mensaje.referral no es
    // null (así está construida la tabla de decisión de entrante.ts).
    const referral = mensaje.referral;
    if (!referral) throw new Error("[whatsapp] crear_lead_y_responder sin referral: no debería pasar");
    const ventanaHasta = calcularVentana(recibidoEn, true);

    // Orden a propósito (ver crearConversacionOReleer): primero la
    // conversación —que es el mutex real—, el lead después.
    conversacion = conversacionExistente
      ? await actualizarYDevolver(deps, conversacionExistente, {
          estado: "bot",
          leadId: conversacionExistente.lead_id,
          ventanaHasta,
        })
      : await crearConversacionOReleer(deps, { marcaId, waId: mensaje.waId, ventanaHasta });

    if (conversacion.lead_id) {
      // Ya tenía lead: lo creó la otra entrega concurrente que ganó la
      // carrera, o ya lo tenía de una conversación previa sin referral.
      leadId = conversacion.lead_id;
    } else {
      const creado = await deps.crearLeadDeAnuncio({
        marcaId,
        waId: mensaje.waId,
        telefono,
        campana: referral.campana,
        anuncio: referral.anuncio,
      });
      leadId = creado.id;
      conversacion = await actualizarYDevolver(deps, conversacion, { estado: "bot", leadId, ventanaHasta });
    }
  } else {
    let estado: Conversacion["estado"];
    let deAnuncio: boolean;

    switch (decision.accion) {
      case "responder":
        estado = "bot";
        deAnuncio = true;
        break;
      case "guardar_respuesta":
        estado = "humana";
        deAnuncio = false;
        break;
      case "solo_guardar":
        // Sin conversación previa (primer contacto sin anuncio) arranca ya
        // en `humana`: no hay bot que la esté esperando. Si ya existía,
        // conserva su estado (una conversación `humana` sigue `humana`).
        estado = conversacionExistente?.estado ?? "humana";
        deAnuncio = false;
        break;
    }

    const ventanaHasta = calcularVentana(recibidoEn, deAnuncio);
    conversacion = conversacionExistente
      ? await actualizarYDevolver(deps, conversacionExistente, { estado, leadId, ventanaHasta })
      : await deps.crearConversacion({ marcaId, waId: mensaje.waId, leadId, estado, ventanaHasta });
  }

  const { nuevo } = await deps.guardarEntrante({
    conversacionId: conversacion.id,
    wamid: mensaje.wamid,
    texto: mensaje.texto,
    // `payload` guarda el mensaje CRUDO de Meta (no el `MensajeEntrante` ya
    // normalizado): la columna jsonb existe para poder recuperar más
    // adelante lo que `entrante.ts` no extrae, como adjuntos.
    payload: mensaje.crudo,
  });
  // Reintento de Meta del mismo wamid: ya se procesó la primera vez. Ni se
  // responde de nuevo ni se registra actividad otra vez.
  if (!nuevo) return false;

  // ---- FASE B: best-effort ------------------------------------------------
  if (decision.accion === "crear_lead_y_responder" || decision.accion === "responder") {
    try {
      const texto = textoAutorespuesta({ titularAnuncio: mensaje.referral?.titular ?? null });
      const resultado = await deps.mensajero.enviarTexto(mensaje.waId, texto);
      await deps.guardarSaliente({
        conversacionId: conversacion.id,
        wamid: resultado.ok ? resultado.wamid : null,
        texto,
        // Un fallo de ENVÍO no tumba el procesado: el saliente queda con su
        // error para que se vea en la bandeja (esto no lanza, es un
        // resultado tipado de `enviarTexto`).
        error: resultado.ok ? undefined : resultado.error,
      });
    } catch (e) {
      // Este catch es para un fallo al GUARDAR el saliente, no al enviarlo.
      // El envío pudo haber tenido éxito (el cliente ya recibió el mensaje):
      // no hay nada seguro que reintentar, y el gate de idempotencia de
      // arriba cortaría igualmente un reintento de Meta. Solo queda
      // registrarlo para que alguien lo note.
      console.error("[whatsapp] fallo guardando la autorespuesta (puede que sí se enviara)", mensaje.waId, e);
    }
  }

  // Actividad en la ficha del lead: cuando se reutiliza uno ya existente
  // ("responder"), cuando responde a la pregunta del bot
  // ("guardar_respuesta"), o cuando escribe por primera vez sin conversación
  // previa y ya era un lead conocido por teléfono ("solo_guardar" de
  // primer contacto). Si la conversación YA estaba en marcha (`humana`), no
  // se anota cada mensaje suelto — eso ensuciaría la ficha sin aportar nada.
  const teniaConversacionPrevia = conversacionExistente !== null;
  const registrarNota =
    leadId !== null &&
    (decision.accion === "responder" ||
      decision.accion === "guardar_respuesta" ||
      (decision.accion === "solo_guardar" && !teniaConversacionPrevia));
  if (registrarNota) {
    try {
      // Best-effort: `registrarActividad` ya devuelve `{ ok, error }` en vez
      // de lanzar (ver ventas/db.ts); se envuelve igual por si acaso.
      const resultado = await registrarActividad({
        leadId: leadId as string,
        usuariaId: null,
        tipo: "nota",
        nota: mensaje.texto,
      });
      if (!resultado.ok) {
        console.error("[whatsapp] fallo registrando la respuesta como actividad del lead", leadId, resultado.error);
      }
    } catch (e) {
      console.error("[whatsapp] fallo registrando la respuesta como actividad del lead", leadId, e);
    }
  }

  return true;
}

export async function procesarWebhook(input: {
  cuerpo: unknown;
  deps?: Deps;
  ahora?: Date;
}): Promise<{ procesados: number }> {
  const deps = input.deps ?? depsReales();

  const marca = await getMarcaPorSlug(MARCA_SLUG);
  if (!marca) {
    // Reintentar no va a crear la marca: se registra y no se procesa nada.
    // La ruta igualmente responde 200 (reintentar tampoco arreglaría esto).
    console.error(`[whatsapp] no existe la marca "${MARCA_SLUG}"`);
    return { procesados: 0 };
  }

  // `statuses[]` primero: son independientes de los mensajes y una entrada
  // rara no debe impedir que se procesen las demás ni los mensajes.
  for (const estado of extraerEstados(input.cuerpo)) {
    try {
      await deps.setEstadoMensaje(estado.wamid, estado.estado);
    } catch (e) {
      console.error("[whatsapp] fallo actualizando el estado de un saliente", estado.wamid, e);
    }
  }

  const ahora = input.ahora ?? new Date();
  let procesados = 0;
  for (const mensaje of extraerMensajes(input.cuerpo)) {
    // NO se atrapa aquí a propósito: por construcción, `procesarMensaje` solo
    // deja escapar fallos de FASE A (antes de `guardarEntrante`), que son
    // reintentables — todo lo de fase B ya se atrapa dentro. Se propaga hasta
    // la ruta para que responda 500 y Meta reintente el lote entero; el resto
    // de mensajes de este lote que ya se hubieran guardado son idempotentes
    // por wamid, así que el reintento no los duplica.
    if (await procesarMensaje(marca.id, mensaje, deps, ahora)) procesados += 1;
  }

  return { procesados };
}
