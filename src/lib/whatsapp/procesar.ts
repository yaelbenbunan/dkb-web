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

// Autorespuesta provisional y fija del primer turno del bot (acuse de recibo
// + una pregunta de cualificación). La Tarea 8 la sustituye por un módulo de
// plantillas propio con ramas y textos por marca; aquí basta con un texto
// razonable que deje probar el flujo de punta a punta.
const AUTORESPUESTA_PROVISIONAL =
  "¡Hola! Gracias por escribirnos. En breve te atiende una persona del equipo. Mientras tanto, ¿qué tipo de negocio tienes?";

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
 * Procesa un mensaje entrante ya clasificado. Devuelve `true` si el mensaje
 * era nuevo (no un reintento de Meta del mismo wamid).
 */
async function procesarMensaje(
  marcaId: string,
  mensaje: MensajeEntrante,
  deps: Deps,
  ahora: Date,
): Promise<boolean> {
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

  let estado: Conversacion["estado"];
  let deAnuncio: boolean;

  switch (decision.accion) {
    case "crear_lead_y_responder": {
      // decidir() solo devuelve esta acción cuando mensaje.referral no es
      // null (así está construida la tabla de decisión de entrante.ts).
      const referral = mensaje.referral;
      if (!referral) throw new Error("[whatsapp] crear_lead_y_responder sin referral: no debería pasar");
      const creado = await deps.crearLeadDeAnuncio({
        marcaId,
        waId: mensaje.waId,
        telefono,
        campana: referral.campana,
        anuncio: referral.anuncio,
      });
      leadId = creado.id;
      estado = "bot";
      deAnuncio = true;
      break;
    }
    case "responder":
      estado = "bot";
      deAnuncio = true;
      break;
    case "guardar_respuesta":
      estado = "humana";
      deAnuncio = false;
      break;
    case "solo_guardar":
      // Sin conversación previa (primer contacto sin anuncio) arranca ya en
      // `humana`: no hay bot que la esté esperando. Si ya existía, conserva
      // su estado (una conversación `humana` sigue `humana`).
      estado = conversacionExistente?.estado ?? "humana";
      deAnuncio = false;
      break;
  }

  const ventanaHasta = calcularVentana(recibidoEn, deAnuncio);
  const conversacion = conversacionExistente
    ? await actualizarYDevolver(deps, conversacionExistente, { estado, leadId, ventanaHasta })
    : await deps.crearConversacion({ marcaId, waId: mensaje.waId, leadId, estado, ventanaHasta });

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

  if (decision.accion === "crear_lead_y_responder" || decision.accion === "responder") {
    const resultado = await deps.mensajero.enviarTexto(mensaje.waId, AUTORESPUESTA_PROVISIONAL);
    await deps.guardarSaliente({
      conversacionId: conversacion.id,
      wamid: resultado.ok ? resultado.wamid : null,
      texto: AUTORESPUESTA_PROVISIONAL,
      // Un fallo de envío no tumba el procesado: el entrante ya está
      // guardado y el saliente queda con su error para que se vea en la
      // bandeja.
      error: resultado.ok ? undefined : resultado.error,
    });
  }

  if (decision.accion === "guardar_respuesta" && leadId) {
    // Best-effort: `registrarActividad` ya devuelve `{ ok, error }` en vez de
    // lanzar (ver ventas/db.ts), así que basta con registrar el fallo.
    const resultado = await registrarActividad({
      leadId,
      usuariaId: null,
      tipo: "nota",
      nota: mensaje.texto,
    });
    if (!resultado.ok) {
      console.error("[whatsapp] fallo registrando la respuesta como actividad del lead", leadId, resultado.error);
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
    try {
      if (await procesarMensaje(marca.id, mensaje, deps, ahora)) procesados += 1;
    } catch (e) {
      // Un fallo con un mensaje no debe impedir procesar el resto del lote;
      // como nada se guardó, un reintento de Meta lo repetirá desde cero.
      console.error("[whatsapp] fallo procesando un mensaje", mensaje.wamid, e);
    }
  }

  return { procesados };
}
