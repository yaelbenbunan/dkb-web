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
import { opcionesAutorespuesta, REMITENTE, textoAutorespuesta } from "./autorespuesta";
import { decidir, extraerEstados, extraerMensajes, type MensajeEntrante } from "./entrante";
import { elegirSecuencia } from "./eleccion";
import { aEstadoGuardado, desdeEstadoGuardado, indiceDeBoton, mensajesAEnviar, type EstadoGuardado } from "./guion";
import { crearMensajero, type MensajeroWhatsApp } from "./mensajero";
import { calcularVentana, telefonoDeWaId } from "./ventana";
import { MARCA_DINKBIT_SLUG } from "../ventas/dominio";
import {
  buscarLeadPorContacto,
  crearLeads,
  getMarcaPorSlug,
  listSecuencias,
  registrarActividad,
  type SecuenciaRow,
} from "../ventas/db";
import { parsearSecuencia } from "../ventas/secuencias";
import {
  iniciarSimulacion,
  responderBoton,
  responderTexto,
  type ContextoSimulacion,
  type EntradaConversacion,
} from "../ventas/simulador";

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
 * nada). `getMarcaPorSlug` es fase A: si `getMarcaPorSlug("dinkbit")`
 * devuelve `null` (las migraciones son MANUALES, así que el día del
 * despliegue es el momento más probable de que la fila todavía no exista) se
 * LANZA a propósito, no se traga: no se ha persistido nada todavía, así que
 * el 500 resultante es reintentable sin riesgo de duplicado, y el reintento
 * recupera el mensaje en cuanto alguien aplique el SQL. Tragárselo aquí
 * respondería 200, Meta lo daría por entregado y el mensaje —y el anuncio
 * pagado que lo trajo— se perderían para siempre (Hallazgo I2, ronda de
 * arreglos 2).
 */
export interface Deps {
  mensajero: MensajeroWhatsApp;
  getConversacion: typeof getConversacion;
  crearConversacion: typeof crearConversacion;
  actualizarConversacion: typeof actualizarConversacion;
  guardarEntrante: typeof guardarEntrante;
  guardarSaliente: typeof guardarSaliente;
  setEstadoMensaje: typeof setEstadoMensaje;
  /** `negocio`/`contacto`/`ciudad` van aquí (ronda de arreglos 1, tarea 7)
   *  para poder rellenar `ContextoSimulacion.valores` con los datos reales
   *  del lead cuando existen: sin esto, `{{contacto}}` saldría en blanco
   *  para siempre incluso para un lead que ya tiene su nombre en la base. */
  buscarLeadPorTelefono: (
    marcaId: string,
    telefono: string,
  ) => Promise<{ id: string; negocio: string; contacto: string | null; ciudad: string | null } | null>;
  crearLeadDeAnuncio: (input: {
    marcaId: string;
    waId: string;
    telefono: string | null;
    campana: string | null;
    anuncio: string | null;
  }) => Promise<{ id: string; negocio: string; contacto: string | null; ciudad: string | null }>;
  /** Las secuencias activas de la marca, para elegir la que sirve al anuncio
   *  del lead (task-7-brief.md). Ya existe en `ventas/db.ts`: no es un dato
   *  nuevo, solo entra en `Deps` para poder sustituirla en los tests. */
  listSecuencias: (marcaId: string) => Promise<SecuenciaRow[]>;
}

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
      return lead ? { id: lead.id, negocio: lead.negocio, contacto: lead.contacto, ciudad: lead.ciudad } : null;
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
      return { id: creado.id, negocio: creado.negocio, contacto: creado.contacto, ciudad: creado.ciudad };
    },
    listSecuencias,
  };
}

/**
 * La ventana de conversación NUNCA se encoge, solo se extiende.
 *
 * Secuencia real que esto evita (Hallazgo I1, ronda de arreglos 2): llega un
 * mensaje de anuncio en T y la ventana queda en T+72h (correcto para CTWA);
 * la persona contesta a la pregunta de cualificación en T+2h, ese mensaje ya
 * NO trae `referral`, así que sin este máximo la ventana se recalcularía a
 * T+26h — 46 horas de ventana legítima tiradas. Como la bandeja es
 * fail-safe (campo deshabilitado y `responder()` rechaza el envío cuando la
 * ventana aparece cerrada), el efecto no es solo "perder tiempo": es que la
 * comercial no puede contestar a un lead que Meta sí seguiría aceptando.
 */
function ventanaExtendida(existente: Conversacion | null, nueva: Date): Date {
  if (!existente?.ventana_hasta) return nueva;
  const actual = new Date(existente.ventana_hasta);
  if (!Number.isFinite(actual.getTime())) return nueva;
  return actual.getTime() > nueva.getTime() ? actual : nueva;
}

/** Lo que hace falta para mandar el primer paso de una secuencia arrancada. */
interface SecuenciaArrancada {
  secuenciaId: string;
  estado: EstadoGuardado;
  mensajes: EntradaConversacion[];
}

/** Lo que se conoce del lead para rellenar variables del guion (`{{negocio}}`,
 *  `{{contacto}}`, `{{ciudad}}`). `null` cuando el lead no se ha resuelto en
 *  esta vuelta (ver `procesarMensaje`): en ese caso el hueco se deja visible,
 *  no se bloquea el envío (decisión 4 del brief de la tarea 7). */
type LeadDatos = { negocio: string; contacto: string | null; ciudad: string | null } | null;

/**
 * Elige la secuencia que sirve al anuncio del lead, la arranca y devuelve su
 * primer mensaje. Devuelve `null` si ninguna secuencia activa sirve a este
 * anuncio o si la que sirve no parsea (forma inválida en la base, p.ej. tras
 * un cambio manual): en ambos casos el llamador cae al RESPALDO de
 * `autorespuesta.ts`, que NO es la fuente — es la garantía de que el canal
 * nunca se queda mudo si alguien archiva o rompe una secuencia por error.
 *
 * `marca` y `remitente` siempre tienen valor. `negocio`/`contacto`/`ciudad`
 * salen de `leadDatos` cuando el lead se resolvió en esta vuelta (ronda de
 * arreglos 1, Hallazgo 1: antes se dejaban siempre vacíos, así que
 * `{{contacto}}` nunca se rellenaba ni para un lead que ya existía con su
 * nombre en la base). Cuando `leadDatos` es `null` (Meta no manda estos
 * datos en un mensaje, o el lead venía ya vinculado a una conversación
 * previa sin volver a leerse), el hueco se deja visible: `renderizarTexto`
 * (dentro de `iniciarSimulacion`) no bloquea el envío por una variable que
 * falta.
 */
function arrancarSecuencia(
  secuencias: SecuenciaRow[],
  anuncio: string | null,
  marcaNombre: string,
  leadDatos: LeadDatos,
): SecuenciaArrancada | null {
  const elegida = elegirSecuencia(secuencias, anuncio);
  if (!elegida) return null;

  const parseada = parsearSecuencia(elegida.pasos);
  if (!parseada.ok) {
    console.error(`[whatsapp] la secuencia "${elegida.id}" no parsea, se usa el respaldo: ${parseada.error}`);
    return null;
  }

  const ctx: ContextoSimulacion = {
    valores: {
      marca: marcaNombre,
      remitente: REMITENTE,
      negocio: leadDatos?.negocio ?? null,
      contacto: leadDatos?.contacto ?? null,
      ciudad: leadDatos?.ciudad ?? null,
    },
    faseInicial: "nuevo",
  };
  // Al arrancar no hay estado previo: es justo la precondición que documenta
  // el JSDoc de `mensajesAEnviar` (ver guion.ts) para su parámetro `anterior`.
  const estadoSimulacion = iniciarSimulacion(parseada.secuencia, ctx);
  return {
    secuenciaId: elegida.id,
    estado: aEstadoGuardado(estadoSimulacion),
    mensajes: mensajesAEnviar(null, estadoSimulacion),
  };
}

/**
 * Lo que hace falta tras avanzar la secuencia con la respuesta del lead, o
 * el motivo por el que no hubo nada que avanzar. `motivo` es texto pensado
 * para la ficha del lead (ronda de arreglos 1, Hallazgo 2): todo lo que saca
 * una conversación del bot tiene que verse ahí, no solo en un `console.error`.
 */
type ResultadoAvance =
  | { ok: true; estado: EstadoGuardado; mensajes: EntradaConversacion[]; avisos: string[] }
  | { ok: false; motivo: string };

/**
 * Reconstruye el estado del motor desde lo que ya estaba guardado en la
 * conversación (`guardado`), le aplica la respuesta del lead —un botón si
 * `indiceDeBoton` traduce el id que mandó Meta, texto libre si no (tarea 8,
 * decisión 5 la delega a `responderBoton`/`responderTexto`, no a este
 * módulo)— y devuelve lo que hay que mandar y lo que hay que guardar.
 *
 * Devuelve `{ ok: false }` cuando no hay nada que avanzar:
 * - La fila de `secuenciaId` ya no está en `secuencias`, o su forma no
 *   parsea (alguien la borró o la rompió con esta conversación en vuelo).
 * - `responderBoton` no encontró nada que hacer con la respuesta: el botón
 *   pulsado ya no existe en el paso actual (`indiceDeBoton` tradujo un
 *   índice, pero el paso tiene menos botones ahora), o el propio paso
 *   actual ya no existe en la secuencia. Ninguno de los dos casos levanta
 *   aviso por sí solo dentro del motor —a diferencia de un `ir_a` roto, que
 *   sí lo hace en `entrarEnPaso`— así que sin este chequeo la conversación
 *   se quedaría en `bot`, con el mismo paso, esperando una respuesta que
 *   nunca llegaría, y nadie se enteraría (Hallazgo 1 Critical, ronda de
 *   arreglos 1). Se detecta comparando por referencia: `responderBoton`
 *   devuelve el MISMO objeto `anterior` sin tocar nada en sus dos ramas
 *   tempranas (paso sin botón que encaje, o paso que ya no existe); en
 *   cualquier avance real construye un objeto nuevo, aunque el resultado
 *   final no tenga mensajes ni avisos (p.ej. una ruta que termina sin
 *   `avisar`).
 *
 * OJO con `secuencias`: viene de `listSecuencias`, que trae TODAS las filas
 * de la marca, archivadas incluidas — aquí no se filtra por `estado`, a
 * propósito y a diferencia de `elegirSecuencia` (que sí filtra por
 * "activa", porque esa función decide qué secuencia EMPEZAR para un anuncio
 * nuevo). Archivar una secuencia significa "no empieces conversaciones
 * nuevas con esta", no "abandona a quien ya está hablando contigo": una
 * conversación en marcha con una secuencia archivada tiene que poder seguir
 * avanzando hasta que termine.
 */
function avanzarSecuencia(
  secuencias: SecuenciaRow[],
  secuenciaId: string,
  guardado: EstadoGuardado,
  mensaje: Pick<MensajeEntrante, "botonId" | "texto">,
  marcaNombre: string,
  leadDatos: LeadDatos,
): ResultadoAvance {
  const fila = secuencias.find((s) => s.id === secuenciaId);
  if (!fila) {
    const motivo = `la secuencia "${secuenciaId}" ya no existe entre las de la marca`;
    console.error(`[whatsapp] ${motivo}, se pasa a humana`);
    return { ok: false, motivo };
  }

  const parseada = parsearSecuencia(fila.pasos);
  if (!parseada.ok) {
    const motivo = `la secuencia "${secuenciaId}" tiene una forma inválida (${parseada.error})`;
    console.error(`[whatsapp] ${motivo}, se pasa a humana`);
    return { ok: false, motivo };
  }

  const ctx: ContextoSimulacion = {
    valores: {
      marca: marcaNombre,
      remitente: REMITENTE,
      negocio: leadDatos?.negocio ?? null,
      contacto: leadDatos?.contacto ?? null,
      ciudad: leadDatos?.ciudad ?? null,
    },
    // La fase del lead no forma parte de `EstadoGuardado` (no se persiste
    // entre webhooks: no hay hoy dónde leerla/escribirla por conversación),
    // así que se reconstruye siempre desde "nuevo", igual que al arrancar en
    // `arrancarSecuencia`. Solo importa para `ruta.fase`, que esta tarea no
    // usa todavía.
    faseInicial: "nuevo",
  };

  // Precondición de `mensajesAEnviar` (ver su JSDoc en guion.ts): `anterior`
  // tiene que ser EXACTAMENTE el estado que sirvió de base a la transición
  // que produce `nuevo`. Aquí es el estado reconstruido: el motor no
  // persiste el suyo propio entre webhooks, así que no hay otro candidato.
  const anterior = desdeEstadoGuardado(guardado, ctx.faseInicial);
  const indice = indiceDeBoton(mensaje.botonId);
  const nuevo =
    indice !== null
      ? responderBoton(parseada.secuencia, anterior, indice, ctx)
      : responderTexto(parseada.secuencia, anterior, mensaje.texto ?? "", ctx);

  if (nuevo === anterior) {
    return {
      ok: false,
      motivo: "el lead pulsó una opción que ya no existe en el paso actual de la secuencia",
    };
  }

  return {
    ok: true,
    estado: aEstadoGuardado(nuevo),
    mensajes: mensajesAEnviar(anterior, nuevo),
    avisos: nuevo.avisos,
  };
}

/** Deja rastro en la ficha del lead de que la conversación pasó a manos de
 *  una persona y por qué (Hallazgo 2, ronda de arreglos 1 de la tarea 8):
 *  todo lo que saca a un lead del bot tiene que verse en su ficha, no solo
 *  en un log que nadie mira salvo cuando ya hay una queja. Best-effort, como
 *  el resto de FASE B: un fallo aquí solo se registra. */
async function avisarComercial(leadId: string, motivo: string): Promise<void> {
  try {
    const resultado = await registrarActividad({
      leadId,
      usuariaId: null,
      tipo: "nota",
      nota: `Avisar a la comercial: ${motivo}`,
    });
    if (!resultado.ok) {
      console.error("[whatsapp] fallo registrando el aviso a la comercial", leadId, resultado.error);
    }
  } catch (e) {
    console.error("[whatsapp] fallo registrando el aviso a la comercial", leadId, e);
  }
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
  marcaNombre: string,
  mensaje: MensajeEntrante,
  deps: Deps,
  ahora: Date,
): Promise<boolean> {
  // ---- FASE A: reintentable ----------------------------------------------
  const conversacionExistente = await deps.getConversacion(marcaId, mensaje.waId);
  const telefono = telefonoDeWaId(mensaje.waId);
  // `recibidoEn` sale de parsear el timestamp de Meta (segundos como texto).
  //
  // Política unificada de timestamps fuera de rango (Minor 4, ronda de
  // arreglos 2): `entrante.ts` es la ÚNICA autoridad que descarta un mensaje
  // por timestamp inválido o imposible (con `console.warn` para que quede
  // rastro, en vez del `continue` mudo de antes). Por construcción, un
  // `MensajeEntrante` que llega hasta aquí YA pasó ese filtro, así que
  // `recibidoEn.getTime()` nunca debería ser `NaN`. Este `ahora` (inyectable
  // en tests) es defensa en profundidad, no una segunda política de
  // descarte: para cuando se llega aquí, la FASE A ya pudo haber leído
  // Supabase (`getConversacion`), y añadir aquí un `continue` silencioso
  // sería un tercer comportamiento inconsistente en mitad del procesado. Si
  // algún día un refactor de `entrante.ts` dejara pasar una fecha corrupta,
  // mejor seguir con `ahora` como aproximación razonable que perder el lead
  // a medio camino.
  const recibidoEn = Number.isFinite(mensaje.recibidoEn.getTime()) ? mensaje.recibidoEn : ahora;

  // El lead "actual" prioriza el ya vinculado a la conversación: así un
  // reintento de Meta (o un segundo mensaje de la misma persona) nunca vuelve
  // a buscar —ni, sobre todo, a CREAR— el lead.
  let leadId: string | null = conversacionExistente?.lead_id ?? null;
  let leadExiste = leadId !== null;
  // Solo se rellena cuando este mensaje resuelve el lead de verdad (lo
  // encuentra por teléfono o lo crea): si venía ya vinculado a una
  // conversación previa (`conversacionExistente.lead_id`), no se vuelve a
  // leer aquí y se deja en `null` — el hueco de `{{contacto}}` queda visible
  // en vez de inventar un valor o forzar una lectura extra de Supabase.
  let leadDatos: LeadDatos = null;
  if (!leadExiste && telefono) {
    const encontrado = await deps.buscarLeadPorTelefono(marcaId, telefono);
    if (encontrado) {
      leadId = encontrado.id;
      leadExiste = true;
      leadDatos = { negocio: encontrado.negocio, contacto: encontrado.contacto, ciudad: encontrado.ciudad };
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
    const ventanaHasta = ventanaExtendida(conversacionExistente, calcularVentana(recibidoEn, true));

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
      leadDatos = { negocio: creado.negocio, contacto: creado.contacto, ciudad: creado.ciudad };
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
        // Si hay una secuencia en marcha (secuencia_id Y paso_actual), la
        // conversación se queda en "bot" aquí: FASE B (abajo) intenta
        // avanzarla y decide el estado final —sigue en "bot" si el motor no
        // levanta ningún aviso, pasa a "humana" si lo hace o si algo falla.
        // Sin secuencia en marcha no hay bot que interprete la respuesta:
        // se comporta como siempre, directo a una persona.
        estado = conversacionExistente?.secuencia_id && conversacionExistente?.paso_actual ? "bot" : "humana";
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

    const ventanaHasta = ventanaExtendida(conversacionExistente, calcularVentana(recibidoEn, deAnuncio));
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
    const anuncio = mensaje.referral?.anuncio ?? null;

    // Cargar, elegir Y arrancar la secuencia van en su propio try: un fallo
    // en cualquiera de los tres (Supabase al listar, una fila con forma
    // inválida al parsear, o el propio motor al arrancar) no debe impedir el
    // RESPALDO de abajo — deja `arrancada` en null y cae a la autorespuesta
    // en código, igual que si ninguna secuencia sirviera al anuncio.
    let arrancada: SecuenciaArrancada | null = null;
    try {
      const secuencias = await deps.listSecuencias(marcaId);
      arrancada = arrancarSecuencia(secuencias, anuncio, marcaNombre, leadDatos);
    } catch (e) {
      console.error("[whatsapp] fallo cargando o arrancando la secuencia de la marca, se usa el respaldo", mensaje.waId, e);
    }

    try {
      if (arrancada && arrancada.mensajes.length > 0) {
        // La FUENTE: el primer paso de la secuencia que sirve a este anuncio.
        // Un paso con botones se manda con `enviarBotones`; uno sin botones,
        // con `enviarTexto` (decisión 5 del brief).
        for (const entrada of arrancada.mensajes) {
          const resultado =
            entrada.botones && entrada.botones.length > 0
              ? await deps.mensajero.enviarBotones(mensaje.waId, entrada.texto, entrada.botones)
              : await deps.mensajero.enviarTexto(mensaje.waId, entrada.texto);
          await deps.guardarSaliente({
            conversacionId: conversacion.id,
            wamid: resultado.ok ? resultado.wamid : null,
            texto: entrada.texto,
            error: resultado.ok ? undefined : resultado.error,
          });
        }
        // Puntero de por dónde va el guion: sin esto, el próximo mensaje del
        // lead no tendría con qué estado continuar la secuencia.
        try {
          await deps.actualizarConversacion(conversacion.id, {
            secuenciaId: arrancada.secuenciaId,
            pasoActual: arrancada.estado.pasoActual,
            datos: arrancada.estado.datos,
          });
        } catch (e) {
          // El mensaje YA se mandó (y ya se guardó como saliente, arriba).
          // Si este guardado falla, la conversación se queda con
          // `paso_actual` en `null` — que es EXACTAMENTE lo que significa
          // "secuencia terminada" (ver `desdeEstadoGuardado` en guion.ts) — y
          // la idempotencia por wamid impide que un reintento de Meta lo
          // repare: nadie volverá a intentar guardar este estado. No podemos
          // garantizar que este segundo intento tenga más suerte que el
          // primero (best-effort, en su propio try), pero sí evitar que el
          // lead se quede mudo SIN QUE NADIE LO NOTE: se pasa la conversación
          // a `humana` para que aparezca en la bandeja y una persona pueda
          // retomarla a mano (Hallazgo 2, ronda de arreglos 1).
          console.error(
            "[whatsapp] fallo guardando el estado de la secuencia tras enviar su primer paso, se pasa a humana",
            mensaje.waId,
            e,
          );
          try {
            await deps.actualizarConversacion(conversacion.id, { estado: "humana" });
          } catch (e2) {
            console.error(
              "[whatsapp] fallo también pasando la conversación a humana tras el error anterior",
              mensaje.waId,
              e2,
            );
          }
        }
      } else {
        // RESPALDO, NO la fuente: solo se manda si ninguna secuencia activa
        // sirve a este anuncio, si la que sirve no parsea, o si arrancarla
        // falló (capturado arriba). El canal no puede quedarse mudo porque
        // alguien archive una secuencia por error.
        const texto = textoAutorespuesta({ anuncio });
        // Con botones en vez de texto: la respuesta del lead vuelve como
        // `button_reply` y `entrante.ts` la guarda igual que un texto, así que
        // queda en su ficha. Es además lo que más sube la tasa de respuesta.
        const resultado = await deps.mensajero.enviarBotones(
          mensaje.waId,
          texto,
          opcionesAutorespuesta(anuncio),
        );
        await deps.guardarSaliente({
          conversacionId: conversacion.id,
          wamid: resultado.ok ? resultado.wamid : null,
          texto,
          // Un fallo de ENVÍO no tumba el procesado: el saliente queda con su
          // error para que se vea en la bandeja (esto no lanza, es un
          // resultado tipado de `enviarTexto`/`enviarBotones`).
          error: resultado.ok ? undefined : resultado.error,
        });
      }
    } catch (e) {
      // Este catch es para un fallo al ENVIAR o GUARDAR el primer mensaje.
      // El envío pudo haber tenido éxito (el cliente ya recibió el mensaje):
      // no hay nada seguro que reintentar, y el gate de idempotencia de
      // arriba cortaría igualmente un reintento de Meta. Solo queda
      // registrarlo para que alguien lo note.
      console.error("[whatsapp] fallo mandando el primer mensaje de la conversación (puede que sí se enviara)", mensaje.waId, e);
    }
  } else if (decision.accion === "guardar_respuesta") {
    // Solo se avanza si la conversación sigue en `bot` y tiene un paso
    // guardado (decisión 2 del brief de la tarea 8): una conversación en
    // `humana` ya la lleva una persona, y sin `paso_actual` no hay de dónde
    // partir. `desdeEstadoGuardado` ya se protege sola derivando `terminada`
    // de que no haya paso, pero no basta apoyarse solo en eso — se comprueba
    // aquí también antes de tocar nada.
    // Capturados en `const` (no releídos de `conversacion` tras el `await`
    // de abajo): así el estrechado de tipos de este `if` (de `string | null`
    // a `string`) sigue siendo válido después del punto de suspensión.
    const secuenciaId = conversacion.secuencia_id;
    const pasoGuardado = conversacion.paso_actual;
    if (conversacion.estado === "bot" && secuenciaId && pasoGuardado) {
      try {
        const secuencias = await deps.listSecuencias(marcaId);
        const avanzada = avanzarSecuencia(
          secuencias,
          secuenciaId,
          { pasoActual: pasoGuardado, datos: conversacion.datos },
          mensaje,
          marcaNombre,
          leadDatos,
        );

        if (avanzada.ok) {
          // Igual que al arrancar: un paso con botones se manda con
          // `enviarBotones`, uno sin botones con `enviarTexto` (decisión 5).
          for (const entrada of avanzada.mensajes) {
            const resultado =
              entrada.botones && entrada.botones.length > 0
                ? await deps.mensajero.enviarBotones(mensaje.waId, entrada.texto, entrada.botones)
                : await deps.mensajero.enviarTexto(mensaje.waId, entrada.texto);
            await deps.guardarSaliente({
              conversacionId: conversacion.id,
              wamid: resultado.ok ? resultado.wamid : null,
              texto: entrada.texto,
              error: resultado.ok ? undefined : resultado.error,
            });
          }

          // Cualquier aviso del motor (`avisar: true` de una ruta, la
          // respuesta libre que se sale del guion, o el destino de una ruta
          // que ya no existe) significa que el bot no debe seguir solo: se
          // entrega la conversación a una persona.
          const pasaAHumana = avanzada.avisos.length > 0;
          try {
            await deps.actualizarConversacion(conversacion.id, {
              pasoActual: avanzada.estado.pasoActual,
              datos: avanzada.estado.datos,
              ...(pasaAHumana ? { estado: "humana" as const } : {}),
            });
            if (pasaAHumana) conversacion = { ...conversacion, estado: "humana" };
          } catch (e) {
            // El mensaje YA se mandó (y ya se guardó como saliente, arriba).
            // Igual que al arrancar (Hallazgo 2, ronda de arreglos 1): si
            // este guardado falla, nadie vuelve a intentarlo —la idempotencia
            // por wamid lo impide—, así que se pasa a `humana` para que la
            // conversación no se quede muda sin que nadie lo note.
            console.error(
              "[whatsapp] fallo guardando el avance de la secuencia, se pasa a humana",
              mensaje.waId,
              e,
            );
            try {
              await deps.actualizarConversacion(conversacion.id, { estado: "humana" });
              conversacion = { ...conversacion, estado: "humana" };
            } catch (e2) {
              console.error(
                "[whatsapp] fallo también pasando la conversación a humana tras el error anterior",
                mensaje.waId,
                e2,
              );
            }
          }

          if (pasaAHumana && leadId) {
            await avisarComercial(leadId, avanzada.avisos.join("; "));
          }
        } else {
          // Nada que avanzar (secuencia borrada/rota, botón u opción que ya
          // no existe — ver el JSDoc de `avanzarSecuencia`): se entrega a una
          // persona en vez de dejar al lead sin respuesta, y se deja el
          // motivo en su ficha (Hallazgo 2, ronda de arreglos 1), no solo en
          // el `console.error` que ya dejó `avanzarSecuencia`.
          await deps.actualizarConversacion(conversacion.id, { estado: "humana" });
          conversacion = { ...conversacion, estado: "humana" };
          if (leadId) await avisarComercial(leadId, avanzada.motivo);
        }
      } catch (e) {
        // Best-effort (fase B): un fallo aquí (p.ej. `listSecuencias` cae)
        // nunca debe tumbar el procesado, solo queda registrado.
        console.error("[whatsapp] fallo avanzando la secuencia con la respuesta del lead", mensaje.waId, e);
      }
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

  const marca = await getMarcaPorSlug(MARCA_DINKBIT_SLUG);
  if (!marca) {
    // Se LANZA a propósito (Hallazgo I2, ronda de arreglos 2): todavía no se
    // ha persistido nada, así que la ruta responde 500 sin riesgo de
    // duplicado y Meta reintenta durante horas. Las tres migraciones son
    // MANUALES, así que "la marca todavía no está insertada" es el estado
    // más probable el día del despliegue — tragárselo aquí respondería 200,
    // Meta daría el mensaje por entregado, y el lead (y el anuncio pagado
    // que lo trajo) se perderían para siempre.
    throw new Error(`[whatsapp] no existe la marca "${MARCA_DINKBIT_SLUG}"`);
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
    if (await procesarMensaje(marca.id, marca.nombre, mensaje, deps, ahora)) procesados += 1;
  }

  return { procesados };
}
