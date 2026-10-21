import "server-only";
import {
  actualizarConversacion,
  crearConversacion,
  getConversacion,
  guardarContactos,
  guardarEco,
  guardarEntrante,
  guardarHistorial,
  guardarSaliente,
  nombreDeContacto,
  reclamarPaso,
  setEstadoMensaje,
  vincularLead,
  type Conversacion,
} from "./db";
import { opcionesAutorespuesta, REMITENTE, textoAutorespuesta } from "./autorespuesta";
import {
  decidir,
  extraerAvisosCuenta,
  extraerContactos,
  extraerEcos,
  extraerEstados,
  extraerHistorial,
  extraerMensajes,
  type AvisoCuenta,
  type ContactoSync,
  type EcoSaliente,
  type LoteHistorial,
  type MensajeEntrante,
} from "./entrante";
import { elegirSecuencia } from "./eleccion";
import { elegirMarca } from "./enrutado";
import { aEstadoGuardado, desdeEstadoGuardado, indiceDeBoton, mensajesAEnviar, type EstadoGuardado } from "./guion";
import type { MensajeroWhatsApp } from "./mensajero";
import { getMarcaPorNumero, getMarcasPorWaba, marcarDesconectada, mensajeroDeMarca, setHistorialMarca } from "./numeros";
import { calcularVentana, telefonoDeWaId } from "./ventana";
import { esFaseDescarte, FASE_LABELS, MARCA_DINKBIT_SLUG, type Fase } from "../ventas/dominio";
import {
  actualizarLeadWeb,
  buscarLeadPorContacto,
  crearLeads,
  getMarcaPorSlug,
  listExclusiones,
  listSecuencias,
  registrarActividad,
  type Exclusion,
  type Marca,
  type SecuenciaRow,
} from "../ventas/db";
import { clasificarLeads } from "../ventas/leads-csv";
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
 * `buscarLeadPorTelefono` y `crearLeadDeWhatsApp` NO viven en `whatsapp/db.ts`:
 * son wiring sobre `src/lib/ventas/db.ts` (los leads son del dominio de
 * ventas, que ya tiene su propio acceso a datos). Mezclarlos en el módulo del
 * canal crearía dos caminos de escritura a la misma tabla.
 *
 * Política de fallos (ver `procesarMensaje` para el detalle): lo de ANTES de
 * guardar el mensaje entrante se propaga (es reintentable, la ruta responde
 * 500); lo de DESPUÉS se traga y se registra (es best-effort, nunca debe
 * costar el mensaje ya guardado ni forzar un reintento que no arreglaría
 * nada). Resolver la marca es fase A: si `marcaDinkbit()`
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
  /** El `phone_number_id` de entorno (`WHATSAPP_PHONE_NUMBER_ID`): el número
   *  de Dinkbit desde antes de la coexistencia. `null` si no está configurado. */
  numeroEntorno: string | null;
  /** La marca que tiene conectado ese número propio, o `null`. */
  marcaDeNumero: (numeroId: string) => Promise<Marca | null>;
  /** La marca Dinkbit, dueña del número de entorno. */
  marcaDinkbit: () => Promise<Marca | null>;
  /** El mensajero que envía por el número de ESA marca (ver numeros.ts). */
  mensajeroDeMarca: (marca: Marca) => Promise<MensajeroWhatsApp>;
  getConversacion: typeof getConversacion;
  crearConversacion: typeof crearConversacion;
  actualizarConversacion: typeof actualizarConversacion;
  /** El update CONDICIONAL del puntero (ronda B1, arreglo 1). Está en `Deps`
   *  —y no se llama al de `db.ts` directamente— porque es la pieza que decide
   *  si esta entrega puede enviar, así que los tests tienen que poder
   *  sustituirla para reproducir la carrera. */
  reclamarPaso: typeof reclamarPaso;
  /** Vincula el lead SOLO si la conversación aún no tiene uno (update
   *  condicional): dos entregas del primer contacto no pueden vincular las
   *  dos. En `Deps` para poder reproducir la carrera en los tests. */
  vincularLead: typeof vincularLead;
  guardarEntrante: typeof guardarEntrante;
  /** Los mensajes escritos desde el móvil (ecos de coexistencia). */
  guardarEco: typeof guardarEco;
  guardarSaliente: typeof guardarSaliente;
  setEstadoMensaje: typeof setEstadoMensaje;
  /** `negocio`/`contacto`/`ciudad` van aquí (ronda de arreglos 1, tarea 7)
   *  para poder rellenar `ContextoSimulacion.valores` con los datos reales
   *  del lead cuando existen: sin esto, `{{contacto}}` saldría en blanco
   *  para siempre incluso para un lead que ya tiene su nombre en la base.
   *  `excluido`/`fase` deciden si un primer contacto sin anuncio puede
   *  arrancar la secuencia (ver `procesarMensaje`). */
  buscarLeadPorTelefono: (marcaId: string, telefono: string) => Promise<LeadEncontrado | null>;
  /** Crea el lead de una conversación de WhatsApp: `"anuncio"` si llegó por
   *  un clic de anuncio, `"whatsapp"` si escribió sin más a una marca con
   *  número propio. `nombre` es el del perfil de WhatsApp, si Meta lo mandó. */
  crearLeadDeWhatsApp: (input: {
    marcaId: string;
    waId: string;
    telefono: string | null;
    nombre: string | null;
    origen: "anuncio" | "whatsapp";
    anuncio: string | null;
    /** Las exclusiones de la marca ya leídas (una vez por webhook, ver
     *  `procesarWebhook`). Sin ellas, se leen aquí. */
    exclusiones?: Exclusion[];
  }) => Promise<LeadEncontrado>;
  /** Las exclusiones de la marca. En `Deps` para que `procesarWebhook` las lea
   *  una sola vez por marca y webhook, no una por lead creado. */
  listExclusiones: (marcaId: string) => Promise<Exclusion[]>;
  /** Las secuencias activas de la marca, para elegir la que sirve al anuncio
   *  del lead (task-7-brief.md). Ya existe en `ventas/db.ts`: no es un dato
   *  nuevo, solo entra en `Deps` para poder sustituirla en los tests. */
  listSecuencias: (marcaId: string) => Promise<SecuenciaRow[]>;
  /** Las marcas de una WABA (puede haber varias), para los avisos de cuenta
   *  (`account_update`). */
  marcasPorWaba: (wabaId: string) => Promise<Marca[]>;
  marcarDesconectada: typeof marcarDesconectada;
  setHistorialMarca: typeof setHistorialMarca;
  guardarHistorial: typeof guardarHistorial;
  guardarContactos: typeof guardarContactos;
  nombreDeContacto: typeof nombreDeContacto;
  /** Pone el nombre de la agenda en `contacto` de un lead que no lo tenía. */
  rellenarContactoLead: (leadId: string, nombre: string) => Promise<void>;
}

/** Lo que el canal necesita saber de un lead al resolverlo por teléfono o al
 *  crearlo. */
export type LeadEncontrado = {
  id: string;
  negocio: string;
  contacto: string | null;
  ciudad: string | null;
  excluido: boolean;
  fase: Fase;
};

/** Si la marca tiene su propio número de WhatsApp conectado (coexistencia). */
export function tieneNumeroPropio(marca: Marca): boolean {
  return !!marca.whatsapp_phone_number_id;
}

/**
 * Crea el lead de una conversación de WhatsApp. Exportada (y no escondida en
 * `depsReales`) para poder probar la marca de exclusión sin Supabase.
 *
 * Meta no manda nombre de negocio en un mensaje de WhatsApp: no hay dato que
 * rellenar ahí, así que se deja un rótulo identificable en vez de inventar
 * uno (memoria "Casos: solo lo que te dan"). El nombre del perfil, si llega,
 * va a `contacto`, que es lo que de verdad es.
 *
 * Un teléfono que ya era cliente de la marca (sus exclusiones) se crea igual,
 * pero marcado `excluido`: la conversación existe y la comercial tiene que
 * verla, pero no debe entrar en la prospección como si fuera nuevo.
 */
export async function crearLeadDeWhatsApp(input: Parameters<Deps["crearLeadDeWhatsApp"]>[0]): Promise<LeadEncontrado> {
  const { marcaId, waId, telefono, nombre, origen, anuncio } = input;
  const telefonoLead = telefono ?? waId;
  const exclusiones = input.exclusiones ?? (await listExclusiones(marcaId));
  const { excluidos } = clasificarLeads([{ telefono: telefonoLead }], [], exclusiones);
  const resultado = await crearLeads({
    marcaId,
    usuariaId: null,
    origen,
    origenDetalle: anuncio,
    leads: [
      {
        negocio: `Lead de WhatsApp (${telefonoLead})`,
        tipo_negocio: null,
        contacto: nombre ?? "",
        telefono: telefonoLead,
        email: "",
        ciudad: "",
        cif: "",
        web: "",
        excluido: excluidos.length > 0,
      },
    ],
  });
  if (!resultado.ok) throw new Error(`[whatsapp] crearLeadDeWhatsApp: ${resultado.error}`);
  // La RPC solo devuelve un contador, no el id creado: se recupera
  // buscando por el mismo teléfono con el que se acaba de crear.
  const creado = await buscarLeadPorContacto(marcaId, { telefono: telefonoLead });
  if (!creado) throw new Error("[whatsapp] crearLeadDeWhatsApp: no se encontró el lead recién creado");
  // Puede ser un lead que ya existía con ese teléfono (la RPC hace `on
  // conflict do nothing`), así que `excluido`/`fase` son los de la base.
  return leadEncontrado(creado);
}

function leadEncontrado(lead: {
  id: string;
  negocio: string;
  contacto: string | null;
  ciudad: string | null;
  excluido: boolean;
  fase: Fase;
}): LeadEncontrado {
  return {
    id: lead.id,
    negocio: lead.negocio,
    contacto: lead.contacto,
    ciudad: lead.ciudad,
    excluido: lead.excluido,
    fase: lead.fase,
  };
}

/**
 * Dependencias reales. El mensajero ya no es uno global: `mensajeroDeMarca`
 * da el de cada marca, y para Dinkbit (sin número propio) sigue siendo
 * `crearMensajero()` SIN argumentos, a propósito — pasarle
 * `process.env.WHATSAPP_TOKEN` a mano marcaría las credenciales como
 * "explícitas" y saltaría la barrera que impide enviar mensajes reales desde
 * un entorno que no es producción (ver mensajero.ts y numeros.ts).
 */
function depsReales(): Deps {
  return {
    numeroEntorno: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
    marcaDeNumero: getMarcaPorNumero,
    marcaDinkbit: () => getMarcaPorSlug(MARCA_DINKBIT_SLUG),
    mensajeroDeMarca,
    getConversacion,
    crearConversacion,
    actualizarConversacion,
    reclamarPaso,
    vincularLead,
    guardarEntrante,
    guardarEco,
    guardarSaliente,
    setEstadoMensaje,
    async buscarLeadPorTelefono(marcaId, telefono) {
      const lead = await buscarLeadPorContacto(marcaId, { telefono });
      return lead ? leadEncontrado(lead) : null;
    },
    crearLeadDeWhatsApp,
    listExclusiones,
    listSecuencias,
    marcasPorWaba: getMarcasPorWaba,
    marcarDesconectada,
    setHistorialMarca,
    guardarHistorial,
    guardarContactos,
    nombreDeContacto,
    async rellenarContactoLead(leadId, nombre) {
      // Un nombre de menos no merece tumbar el webhook: actualizarLeadWeb ya
      // deja el fallo en el log.
      await actualizarLeadWeb(leadId, { contacto: nombre });
    },
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
 * Fase con la que se reconstruye el estado del motor en cada webhook (ver
 * `faseInicial` en `arrancarSecuencia`/`avanzarSecuencia`): no es la fase
 * real del lead, es solo el punto de partida neutro — la fase real no se
 * persiste entre webhooks (comentario en `avanzarSecuencia`), así que no hay
 * de dónde leerla. Sirve para detectar si LA RUTA que se acaba de aplicar
 * asignó una fase: si `estado.fase` ya no es esta, es porque una `ruta.fase`
 * la cambió en esta misma vuelta (tarea 9), no porque ya viniera así.
 */
const FASE_RECONSTRUIDA: Fase = "nuevo";

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
    faseInicial: FASE_RECONSTRUIDA,
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
  | {
      ok: true;
      estado: EstadoGuardado;
      mensajes: EntradaConversacion[];
      avisos: string[];
      /** La fase con la que quedó el motor tras esta transición. Comparar
       *  contra `FASE_RECONSTRUIDA` (el llamador lo hace) es cómo se sabe si
       *  la ruta aplicada la cambió — ver el JSDoc de esa constante. */
      fase: Fase;
      /** Los días de `esperar_dias` si la ruta aplicada usó una espera, `null`
       *  si no (ronda B1, arreglo 2). NO pasa por `EstadoGuardado`: la espera
       *  no es estado que haya que reconstruir en el webhook siguiente, es un
       *  hecho de ESTA transición — el llamador lo convierte en `reanudar_en`
       *  y entrega la conversación a una persona. */
      esperaDias: number | null;
    }
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
    // así que se reconstruye siempre desde `FASE_RECONSTRUIDA`, igual que al
    // arrancar en `arrancarSecuencia`. El llamador (tarea 9) compara
    // `nuevo.fase` contra esta misma constante para saber si `ruta.fase`
    // cambió algo en esta vuelta.
    faseInicial: FASE_RECONSTRUIDA,
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
    fase: nuevo.fase,
    esperaDias: nuevo.esperaDias,
  };
}

/** Añade un punto final si la frase no lo trae ya (algunos avisos de
 *  `simulador.ts` terminan en punto, otros no — ver `fraseDeAviso`). */
function conPuntoFinal(frase: string): string {
  return /[.!?]$/.test(frase) ? frase : `${frase}.`;
}

/**
 * Arma la frase de "por qué se avisa" de la nota de `avisarComercial` a
 * partir de DOS vocabularios que no se pueden mezclar con el mismo prefijo
 * (Hallazgo Important, ronda de arreglos 2 sobre el commit 3ce8299):
 *
 * - `avisos`: frases COMPLETAS e independientes que ya redacta
 *   `simulador.ts` («Avisar a la comercial», «Respuesta libre: la secuencia
 *   se para y se avisa a la comercial»...). Van tal cual, unidas por "; " si
 *   hay más de una — nunca con "Avisar a la comercial:" delante, porque en
 *   el camino MÁS COMÚN (una ruta que cierra con `avisar: true`, sin más) el
 *   único aviso YA ES esa frase: anteponerle el mismo texto como prefijo la
 *   dejaba duplicada literalmente («Avisar a la comercial: Avisar a la
 *   comercial») en CADA lead que cierra por ahí, no en un caso raro.
 * - `motivoDetenido`: frase de CONTINUACIÓN en minúscula que devuelve
 *   `avanzarSecuencia` (p.ej. `la secuencia "X" ya no existe...`), pensada
 *   para encajar detrás de `[whatsapp] ${motivo}, se pasa a humana` en un
 *   log, no para ser una frase suelta. Se introduce con un cierre propio en
 *   español en vez de heredar el prefijo de `avisos`, que dejaría una
 *   minúscula justo tras un punto.
 *
 * Ninguno de los dos textos se toca por su contenido (nada de `startsWith`
 * ni comparar contra `AVISO_AVISAR`): el mensaje pasado por el LLAMADOR ya
 * dice de qué vocabulario es, y eso es lo único de lo que depende esta
 * función — así no se rompe el día que alguien reescriba un aviso.
 *
 * `esperaDias` es un TERCER vocabulario, y se AÑADE en vez de competir con
 * los otros dos (ronda B1, arreglo 2): una ruta puede llevar `avisar: true` y
 * `esperar_dias` a la vez, y entonces la comercial necesita saber las dos
 * cosas — por qué se le avisa y hasta cuándo estaba parada la conversación.
 */
function fraseDeAviso(cambios: {
  avisos?: string[];
  motivoDetenido?: string;
  esperaDias?: number | null;
  cerradaSinRespuesta?: boolean;
  /** Si el lead llegó aquí pulsando un botón o escribiendo texto libre: cambia
   *  la redacción de `cerradaSinRespuesta`, no la decisión. */
  pulsoBoton?: boolean;
}): string | null {
  const frases: string[] = [];
  if (cambios.avisos && cambios.avisos.length > 0) frases.push(conPuntoFinal(cambios.avisos.join("; ")));
  else if (cambios.motivoDetenido) frases.push(`La secuencia se detuvo: ${cambios.motivoDetenido}.`);
  else if (cambios.cerradaSinRespuesta) {
    // Cuarto vocabulario, y el que menos debería aparecer: el guion cerró el
    // camino sin mandar nada y sin pedir que se avise (ver `sinRespuesta` en el
    // avance). Dos redacciones, porque son dos cosas distintas y culpar al
    // guion cuando no tiene culpa hace que la nota deje de creerse: si el lead
    // PULSÓ UN BOTÓN y no recibió nada, el guion tiene un hueco de verdad; si
    // escribió texto libre sobre un paso que ya era el último, el guion
    // simplemente no tenía nada más que decir y la conversación se acabó.
    frases.push(
      cambios.pulsoBoton
        ? "El guion no contestó a esa opción: revisa ese camino."
        : "La secuencia ya había terminado, así que no había nada más que contestar.",
    );
  }
  if (cambios.esperaDias != null) frases.push(fraseDeEspera(cambios.esperaDias));
  return frases.length > 0 ? frases.join(" ") : null;
}

/**
 * Cómo se le cuenta a la comercial que la conversación quedó esperando. Dice
 * que la retoma UNA PERSONA a propósito: no hay cron que reanude la secuencia
 * (`aplicarRuta` deja la espera apuntada y no avanza al destino), así que la
 * nota no debe prometer un envío automático que no va a ocurrir.
 */
function fraseDeEspera(dias: number): string {
  return `La secuencia quedó esperando ${dias} ${dias === 1 ? "día" : "días"}: no hay envío automático que la reanude, la retoma una persona.`;
}

/**
 * Redacta la nota completa de `avisarComercial`: qué contestó el lead
 * (`respuestaLead`, Hallazgo 2, ronda de arreglos 1 de la tarea 9) y, si la
 * hay, la frase de por qué se avisa (`frase`, ver `fraseDeAviso`). Antes de
 * la tarea 9 la nota solo llevaba el motivo —o a qué fase se movió el lead,
 * en `console.error`— pero nunca lo que el lead había respondido: para una
 * comercial que abre la ficha para llamar, qué botón pulsó (o qué escribió)
 * es justo el dato que cambia la llamada entera. Sin `frase` (una ruta que
 * SOLO cambia de fase) se deja solo la respuesta, sin inventar un "avisar"
 * que no aplica.
 */
function notaAvisoComercial(frase: string | null, respuestaLead: string | null | undefined): string | null {
  const dijoElLead = respuestaLead ? `El lead respondió: «${respuestaLead}».` : null;
  if (!frase) return dijoElLead;
  return dijoElLead ? `${dijoElLead} ${frase}` : frase;
}

/**
 * Deja rastro en la ficha del lead de lo que decidió el guion: por qué la
 * conversación pasó a manos de una persona (`avisos`/`motivoDetenido`, ver
 * `fraseDeAviso`) y/o a qué fase se movió el lead (`faseNueva`, tarea 9). Las
 * dos cosas van en la MISMA llamada a `registrarActividad` a propósito:
 * `registrarActividad` ya admite `faseNueva` (lo usa `ventas/servicios.ts`
 * para lo mismo desde el panel), así que separar esto en dos llamadas solo
 * conseguiría que la comercial viera dos NOTAS para un único cierre de guion.
 *
 * Ojo con qué es «duplicar» aquí, porque confundirlo ya costó un arreglo del
 * revés: que la RPC escriba una fila de nota y otra de cambio de fase NO es
 * duplicar. La segunda se pinta como «Fase: Nuevo → Interesado»
 * (`ventas/historial.ts`) y es historial que la comercial quiere, igual que
 * cuando se registra una llamada que además mueve la fase. Lo que sí sobra es
 * una fila de NOTA EN BLANCO, y eso es lo que evita la elección de `tipo` de
 * más abajo.
 *
 * `tipo` se elige según si hay algo que avisar de verdad (Hallazgo 1, ronda
 * de arreglos 1 de la tarea 9): `"cambio_fase"` cuando `fraseDeAviso`
 * devuelve `null` (una ruta que SOLO mueve la fase), `"nota"` cuando hay
 * frase. Antes se llamaba siempre con `"nota"`, así que una ruta sin
 * `avisar` dejaba `nota: null` con tipo "nota" — la RPC
 * (`ventas_registrar_actividad`, ver docs/sql/2026-09-17-ventas-fase1.sql)
 * inserta esa nota vacía Y, aparte, la entrada `cambio_fase` que le
 * corresponde por la fase: dos apuntes para un único cambio, uno de ellos en
 * blanco. Con `"cambio_fase"` la nota (si la hay) viaja DENTRO de esa misma
 * entrada, igual que hace el panel (`cambiarFaseManual`/`moverLead` en
 * `ventas/servicios.ts`) para lo mismo.
 * Best-effort, como el resto de FASE B: un fallo aquí solo se registra.
 */
async function avisarComercial(
  leadId: string,
  cambios: {
    avisos?: string[];
    motivoDetenido?: string;
    esperaDias?: number | null;
    cerradaSinRespuesta?: boolean;
    pulsoBoton?: boolean;
    faseNueva?: Fase;
    respuestaLead?: string | null;
  },
): Promise<void> {
  try {
    const frase = fraseDeAviso(cambios);
    const resultado = await registrarActividad({
      leadId,
      usuariaId: null,
      // El tipo lo decide SI HAY FRASE, y hay que leer la RPC entera para ver
      // por qué (`ventas_registrar_actividad`, en
      // docs/sql/2026-09-17-ventas-fase1.sql sobre la línea 270):
      //
      // - Con `p_tipo <> 'cambio_fase'` inserta la fila de su tipo Y ADEMÁS una
      //   `cambio_fase` si la fase difiere. Son dos filas, sí, pero ninguna
      //   sobra: una lleva la nota y la otra se pinta como «Fase: Nuevo →
      //   Interesado» (ver `ventas/historial.ts`). Es lo mismo que hace
      //   `registrarLlamada` desde antes de esta entrega.
      // - Con `p_tipo = 'cambio_fase'` la primera fila se salta SIEMPRE, y la
      //   segunda solo se inserta `if p_fase_nueva <> v_lead.fase`. O sea que si
      //   el lead YA está en la fase destino no se escribe NADA y la frase se
      //   tira: un lead que vuelve a pedir una llamada desaparece de su ficha.
      //
      // Así que `cambio_fase` solo se usa cuando no hay frase que perder, y
      // sirve para lo que se añadió en la tarea 9: evitar la fila de nota EN
      // BLANCO que `tipo: "nota"` con `nota: null` insertaría.
      tipo: frase ? "nota" : "cambio_fase",
      nota: notaAvisoComercial(frase, cambios.respuestaLead),
      faseNueva: cambios.faseNueva ?? null,
    });
    if (!resultado.ok) {
      console.error("[whatsapp] fallo registrando el aviso/cambio de fase del lead", leadId, resultado.error);
    }
  } catch (e) {
    console.error("[whatsapp] fallo registrando el aviso/cambio de fase del lead", leadId, e);
  }
}

/** Aplica un cambio a una conversación existente y devuelve la copia ya actualizada. */
async function actualizarYDevolver(
  deps: Pick<Deps, "actualizarConversacion">,
  actual: Conversacion,
  cambios: { estado: Conversacion["estado"]; leadId: string | null; ventanaHasta: Date; nombreContacto?: string },
): Promise<Conversacion> {
  await deps.actualizarConversacion(actual.id, cambios);
  return {
    ...actual,
    estado: cambios.estado,
    lead_id: cambios.leadId,
    ventana_hasta: cambios.ventanaHasta.toISOString(),
    ...(cambios.nombreContacto !== undefined ? { nombre_contacto: cambios.nombreContacto } : {}),
  };
}

/** El nombre del perfil, solo si la conversación todavía no tenía uno: el
 *  que ya hay (p.ej. corregido a mano) no se pisa con cada mensaje. */
function nombreNuevo(existente: Conversacion | null, nombrePerfil: string | null): { nombreContacto?: string } {
  if (!nombrePerfil || existente?.nombre_contacto) return {};
  return { nombreContacto: nombrePerfil };
}

/**
 * Primer contacto que no llegó a terminar: conversación en `bot` que nunca
 * arrancó secuencia (sin `secuencia_id` ni `paso_actual`). Se trata igual que
 * si no hubiera conversación (ver `procesarMensaje`). Sale en tres casos:
 * - Reintento de Meta tras un fallo de fase A entre crear la conversación y
 *   crear o vincular el lead: sin esto, el reintento caía en
 *   `guardar_respuesta` sin secuencia y pasaba a `humana` sin haber mandado
 *   nunca el primer paso.
 * - Ráfaga: el segundo mensaje del contacto llega mientras la entrega del
 *   primero todavía no ha reclamado el arranque. Como primer contacto, como
 *   mucho una de las dos manda el primer paso (`reclamarPaso` con el puntero
 *   leído y `yaEnEstePaso`), ninguna crea un segundo lead (búsqueda justo
 *   antes de crear y `vincularOReleer`) y ninguna la entrega a una persona
 *   por error.
 * - La respuesta al respaldo de `autorespuesta.ts` (Dinkbit, anuncio sin
 *   secuencia: el respaldo limpia el puntero). El respaldo solo sale cuando
 *   no hay secuencia que sirva —ni siquiera la general—, así que esa
 *   respuesta sigue acabando en `humana` con su nota, como antes.
 * Una secuencia terminada o entregada deja `secuencia_id`, así que no entra.
 */
export function primerContactoPendiente(c: Conversacion | null): boolean {
  return c !== null && c.estado === "bot" && c.secuencia_id === null && c.paso_actual === null;
}

/**
 * Vincula `leadId` a la conversación solo si todavía no tiene lead. Si otra
 * entrega concurrente ya vinculó el suyo, relee la conversación y la devuelve
 * con ese (el llamador lo adopta). Un fallo aquí es de fase A: se propaga.
 */
async function vincularOReleer(
  deps: Pick<Deps, "vincularLead" | "getConversacion">,
  conversacion: Conversacion,
  leadId: string,
): Promise<Conversacion> {
  if (await deps.vincularLead(conversacion.id, leadId)) return { ...conversacion, lead_id: leadId };
  const actual = await deps.getConversacion(conversacion.marca_id, conversacion.wa_id);
  if (!actual?.lead_id) throw new Error("[whatsapp] no se pudo vincular el lead a la conversación");
  return actual;
}

/** La nota del primer contacto sin anuncio que no arranca la secuencia. */
function notaPrimerContactoSinBot(texto: string | null, estado: { excluido: boolean; fase: Fase }): string {
  const motivo = estado.excluido
    ? "el contacto está en las exclusiones de la marca"
    : `el lead ya está en fase «${FASE_LABELS[estado.fase]}»`;
  const dijo = texto ? `Escribió por WhatsApp: «${texto}». ` : "Escribió por WhatsApp. ";
  return `${dijo}No se arranca la secuencia porque ${motivo}: lo atiende una persona.`;
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
  input: {
    marcaId: string;
    waId: string;
    estado: Conversacion["estado"];
    ventanaHasta: Date | null;
    nombreContacto?: string;
    ultimoMensajeAt?: Date;
  },
): Promise<Conversacion> {
  try {
    return await deps.crearConversacion({
      marcaId: input.marcaId,
      waId: input.waId,
      leadId: null,
      estado: input.estado,
      ventanaHasta: input.ventanaHasta,
      nombreContacto: input.nombreContacto,
      ultimoMensajeAt: input.ultimoMensajeAt,
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
 * `getConversacion`, `buscarLeadPorTelefono`, `crearLeadDeWhatsApp`,
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
 *
 * `marca` y `mensajero` son los del número que recibió el mensaje (ver
 * `procesarWebhook`): todo lo que se envía aquí sale por ESE número, nunca por
 * el de otra marca del mismo lote.
 */
async function procesarMensaje(
  marca: Marca,
  mensajero: MensajeroWhatsApp,
  mensaje: MensajeEntrante,
  deps: Deps,
  ahora: Date,
): Promise<boolean> {
  const marcaId = marca.id;
  const marcaNombre = marca.nombre;
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

  // Un primer contacto que no llegó a terminar (ver `primerContactoPendiente`)
  // se vuelve a tratar como primer contacto: es la única forma de que un
  // reintento de Meta o el segundo mensaje de una ráfaga no lo entreguen a
  // una persona sin que la secuencia haya llegado a arrancar.
  const pendiente = primerContactoPendiente(conversacionExistente);
  const primerContacto = conversacionExistente === null || pendiente;

  // El lead "actual" prioriza el ya vinculado a la conversación: así un
  // reintento de Meta (o un segundo mensaje de la misma persona) nunca vuelve
  // a CREAR el lead.
  let leadId: string | null = conversacionExistente?.lead_id ?? null;
  let leadExiste = leadId !== null;
  // Solo se rellena cuando este mensaje resuelve el lead de verdad (lo
  // encuentra por teléfono o lo crea): si venía ya vinculado a una
  // conversación previa (`conversacionExistente.lead_id`), no se vuelve a
  // leer aquí y se deja en `null` — el hueco de `{{contacto}}` queda visible
  // en vez de inventar un valor o forzar una lectura extra de Supabase.
  let leadDatos: LeadDatos = null;
  // `excluido`/`fase` del lead, cuando se conocen: un primer contacto SIN
  // anuncio no arranca la secuencia a un contacto excluido ni a un lead que
  // ya se está trabajando (fase distinta de «nuevo»). Por eso, en ese caso,
  // se lee el lead aunque ya viniera vinculado a la conversación.
  let leadEstado: { excluido: boolean; fase: Fase } | null = null;
  // Devuelve el id porque TypeScript no ve las asignaciones hechas dentro de
  // un cierre y seguiría creyendo `leadId` nulo tras llamarlo.
  const resolverLead = (lead: LeadEncontrado): string => {
    leadId = lead.id;
    leadExiste = true;
    leadDatos = { negocio: lead.negocio, contacto: lead.contacto, ciudad: lead.ciudad };
    leadEstado = { excluido: lead.excluido, fase: lead.fase };
    return lead.id;
  };
  if ((!leadExiste || (primerContacto && !mensaje.referral)) && telefono) {
    const encontrado = await deps.buscarLeadPorTelefono(marcaId, telefono);
    // Si la conversación ya tenía OTRO lead, manda el de la conversación.
    if (encontrado && (leadId === null || encontrado.id === leadId)) resolverLead(encontrado);
  }
  // Tras vincular, la conversación puede traer el lead de otra entrega
  // concurrente: ese gana, y lo que se sabía del nuestro ya no vale. En un
  // primer contacto sin anuncio se vuelve a leer por teléfono para saber si
  // ese lead está excluido o ya trabajado; si no se puede confirmar que es
  // él, `leadEstado` queda en `null` y la fase B lo entrega a una persona
  // (ver `sinBot`), en vez de arrancarle el bot a ciegas.
  const adoptarLeadDe = async (c: Conversacion) => {
    if (c.lead_id === null || c.lead_id === leadId) return;
    leadId = c.lead_id;
    leadExiste = true;
    leadDatos = null;
    leadEstado = null;
    if (primerContacto && !mensaje.referral && telefono) {
      const releido = await deps.buscarLeadPorTelefono(marcaId, telefono);
      if (releido && releido.id === c.lead_id) resolverLead(releido);
    }
  };

  const decision = decidir({
    mensaje,
    conversacion: conversacionExistente && !pendiente ? { estado: conversacionExistente.estado } : null,
    leadExiste,
  });

  let conversacion: Conversacion;
  // Ver el bloque de `guardar_respuesta` más abajo: se pone a `false` cuando
  // el motor de la secuencia llega a decidir algo sobre este mensaje (avance
  // u ok:false), porque en ese caso ya queda su propia nota, más concreta,
  // vía `avisarComercial`. Se queda en `true` para el resto de casos y para
  // cuando el motor ni siquiera llega a decidir (p.ej. `listSecuencias` lanza).
  let notaGenerica = true;

  if (decision.accion === "crear_lead_y_responder") {
    // decidir() devuelve esta acción con un clic de anuncio (`referral`) o en
    // el PRIMER CONTACTO aunque no lo traiga (no hay conversación previa). Sin
    // anuncio, el lead nace con origen "whatsapp" y la ventana es la normal
    // de 24 h: Meta solo abre 72 h a quien llega desde un anuncio CTWA.
    const referral = mensaje.referral;
    const ventanaHasta = ventanaExtendida(conversacionExistente, calcularVentana(recibidoEn, referral !== null));

    // Orden a propósito (ver crearConversacionOReleer): primero la
    // conversación —que es el mutex real—, el lead después.
    conversacion = conversacionExistente
      ? await actualizarYDevolver(deps, conversacionExistente, {
          estado: "bot",
          leadId: conversacionExistente.lead_id,
          ventanaHasta,
          ...nombreNuevo(conversacionExistente, mensaje.nombrePerfil),
        })
      : await crearConversacionOReleer(deps, {
          marcaId,
          waId: mensaje.waId,
          estado: "bot",
          ventanaHasta,
          ...nombreNuevo(null, mensaje.nombrePerfil),
        });

    if (conversacion.lead_id) {
      // Ya tenía lead: lo creó la otra entrega concurrente que ganó la
      // carrera, o ya lo tenía de una conversación previa sin referral.
      await adoptarLeadDe(conversacion);
    } else {
      // Se vuelve a buscar JUSTO antes de crear: en una ráfaga, la otra
      // entrega puede haberlo creado entre la lectura de arriba y ahora.
      const yaCreado = telefono ? await deps.buscarLeadPorTelefono(marcaId, telefono) : null;
      const nuevoId = resolverLead(
        yaCreado ??
          (await deps.crearLeadDeWhatsApp({
            marcaId,
            waId: mensaje.waId,
            telefono,
            nombre: mensaje.nombrePerfil,
            origen: referral ? "anuncio" : "whatsapp",
            anuncio: referral?.anuncio ?? null,
          })),
      );
      // Vínculo condicional (`lead_id is null`): si otra entrega vinculó el
      // suyo mientras tanto, se sigue con ese en vez de pisarlo.
      conversacion = await vincularOReleer(deps, conversacion, nuevoId);
      await adoptarLeadDe(conversacion);
    }
  } else {
    let estado: Conversacion["estado"];
    let deAnuncio: boolean;

    switch (decision.accion) {
      case "responder":
        // Con anuncio, o primer contacto sin él de un lead que ya existía
        // (ver `decidir`): la ventana de 72 h solo la abre el anuncio.
        estado = "bot";
        deAnuncio = mensaje.referral !== null;
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
        // Solo llega con una conversación previa que YA no es primer
        // contacto: el primer contacto (sin conversación, o con una en `bot`
        // que no llegó a arrancar, ver `primerContactoPendiente`) va siempre
        // por `crear_lead_y_responder`/`responder`, con o sin anuncio.
        // Conserva su estado (una conversación `humana` sigue `humana`). El
        // `?? "humana"` es defensa por si la tabla de `decidir` cambiara.
        estado = conversacionExistente?.estado ?? "humana";
        deAnuncio = false;
        break;
    }

    const ventanaHasta = ventanaExtendida(conversacionExistente, calcularVentana(recibidoEn, deAnuncio));
    const nombre = nombreNuevo(conversacionExistente, mensaje.nombrePerfil);
    // Una marca con número propio recibe en él TODAS sus conversaciones, no
    // solo las de anuncios: cada una tiene que acabar en su CRM como lead,
    // aunque `decidir` diga `solo_guardar` (aquí solo llega una conversación
    // que ya existía sin lead; en Dinkbit esa sigue sin lead — el primer
    // contacto, que sí lo crea en todas las marcas, va por
    // `crear_lead_y_responder`). `!leadExiste` cubre también el reintento de
    // Meta tras un fallo entre crear la conversación y crear el lead: la
    // conversación ya existe, sin lead.
    // Mismo orden y mismo mutex que el camino del anuncio: conversación
    // primero (índice único, `crearConversacionOReleer`), lead después y con
    // vínculo condicional (`vincularOReleer`), para que dos entregas a la vez
    // ni creen dos conversaciones ni vinculen dos leads.
    conversacion = conversacionExistente
      ? await actualizarYDevolver(deps, conversacionExistente, {
          estado,
          leadId: conversacionExistente.lead_id,
          ventanaHasta,
          ...nombre,
        })
      : await crearConversacionOReleer(deps, { marcaId, waId: mensaje.waId, estado, ventanaHasta, ...nombre });
    if (leadId !== null && conversacion.lead_id === null) {
      conversacion = await vincularOReleer(deps, conversacion, leadId);
    }
    await adoptarLeadDe(conversacion);

    if (tieneNumeroPropio(marca) && leadId === null) {
      const nuevoId = resolverLead(
        await deps.crearLeadDeWhatsApp({
          marcaId,
          waId: mensaje.waId,
          telefono,
          nombre: mensaje.nombrePerfil,
          origen: "whatsapp",
          anuncio: null,
        }),
      );
      conversacion = await vincularOReleer(deps, conversacion, nuevoId);
      await adoptarLeadDe(conversacion);
    }
  }

  const { nuevo } = await deps.guardarEntrante({
    conversacionId: conversacion.id,
    wamid: mensaje.wamid,
    texto: mensaje.texto,
    // `payload` guarda el mensaje CRUDO de Meta (no el `MensajeEntrante` ya
    // normalizado): la columna jsonb existe para poder recuperar más
    // adelante lo que `entrante.ts` no extrae, como adjuntos.
    payload: mensaje.crudo,
    origen: "cliente",
  });
  // Reintento de Meta del mismo wamid: ya se procesó la primera vez. Ni se
  // responde de nuevo ni se registra actividad otra vez.
  if (!nuevo) return false;

  // ---- FASE B: best-effort ------------------------------------------------
  // Primer contacto SIN anuncio de un contacto excluido o de un lead que ya se
  // está trabajando: no se le arranca el guion de captación (le hablaría como
  // a un desconocido). Pasa a una persona sin mandar nada y queda una nota en
  // su ficha. Con anuncio no cambia nada: el clic pagado sigue su secuencia.
  // El `as`: `leadEstado` solo se asigna dentro de `resolverLead`/`adoptarLeadDe`
  // y TypeScript, que no lo ve, lo estrecharía a `null`.
  //
  // Si NO se sabe cómo está el lead vinculado (el teléfono da otro lead, no
  // hay teléfono con el que comprobarlo, o se adoptó el de otra entrega y no
  // se pudo releer), se hace lo mismo: ante la duda, una persona. Ahí no hay
  // motivo que contar, así que se deja la nota genérica de siempre.
  const estadoConocido = leadEstado as { excluido: boolean; fase: Fase } | null;
  const primerContactoSinAnuncio =
    (decision.accion === "crear_lead_y_responder" || decision.accion === "responder") && !mensaje.referral;
  const sinBot =
    primerContactoSinAnuncio &&
    (estadoConocido === null || estadoConocido.excluido || estadoConocido.fase !== "nuevo");
  if (sinBot) {
    try {
      // CONDICIONADO al puntero leído, como en las recuperaciones del
      // arranque: si otra entrega concurrente ya arrancó la secuencia
      // mientras tanto, un `humana` ciego la congelaría con botones vivos.
      const pasado = await deps.reclamarPaso(conversacion.id, {
        pasoEsperado: conversacion.paso_actual,
        pasoActual: conversacion.paso_actual,
        datos: conversacion.datos,
        estado: "humana",
      });
      if (pasado) conversacion = { ...conversacion, estado: "humana" };
      else console.warn("[whatsapp] otra entrega ya arrancó esta conversación: no se fuerza a humana", mensaje.waId, conversacion.id);
    } catch (e) {
      console.error("[whatsapp] fallo pasando a humana el primer contacto de un lead que no lleva bot", mensaje.waId, e);
    }
    // Con motivo conocido, esta nota sustituye a la genérica: lleva el texto
    // Y el motivo.
    if (estadoConocido && leadId) {
      notaGenerica = false;
      try {
        const resultado = await registrarActividad({
          leadId,
          usuariaId: null,
          tipo: "nota",
          nota: notaPrimerContactoSinBot(mensaje.texto, estadoConocido),
        });
        if (!resultado.ok) console.error("[whatsapp] fallo dejando la nota del primer contacto sin bot", leadId, resultado.error);
      } catch (e) {
        console.error("[whatsapp] fallo dejando la nota del primer contacto sin bot", leadId, e);
      }
    }
  } else if (decision.accion === "crear_lead_y_responder" || decision.accion === "responder") {
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
        // RECLAMAR el arranque ANTES de enviar, por el mismo motivo que en el
        // avance: dos entregas concurrentes (el lead toca «Enviar» dos veces
        // sobre el mensaje prerrellenado del anuncio, o vuelve a pulsar el
        // anuncio en el mismo segundo) leen las dos la misma conversación y las
        // dos mandan el primer paso, así que el lead se queda con dos juegos de
        // botones vivos e indistinguibles.
        //
        // La condición es EL PUNTERO QUE SE LEYÓ, no `null`. Condicionar a
        // `paso_actual is null` parecía natural —una conversación que arranca no
        // va por ningún paso— y era un error grave: este camino se recorre
        // SIEMPRE que el mensaje trae `referral` (`decidir` no mira
        // `paso_actual`), así que un lead que clicó un anuncio y no pulsó ningún
        // botón, y vuelve a clicar —el mismo anuncio u otro—, tiene el puntero
        // puesto: el reclamo no encajaba, no se enviaba NADA (ni el guion ni el
        // respaldo, porque esa rama ya no se alcanza) y el único rastro era un
        // `console.warn` que además decía otra cosa. Un clic pagado contestado
        // con silencio, que es justo lo que esta entrega existe para evitar.
        // Pero el puntero leído SOLO no serializa dos entregas del MISMO clic
        // (el lead toca «Enviar» dos veces sobre el mensaje prerrellenado): la
        // que pierde puede releer la conversación tras chocar con el índice
        // único, leer ya el puntero de la ganadora y encajar también. De ahí
        // `yaEnEstePaso`: si la conversación ya está en el paso de inicio DE
        // ESTA MISMA secuencia, el primer paso ya salió y repetirlo solo le
        // deja al lead dos juegos de botones idénticos. Un re-clic de OTRO
        // anuncio no entra por aquí (la secuencia es distinta), y uno del mismo
        // anuncio después de pulsar tampoco (el puntero ya se movió).
        const punteroLeido = conversacion.paso_actual;
        const yaEnEstePaso =
          conversacion.secuencia_id === arrancada.secuenciaId &&
          conversacion.paso_actual === arrancada.estado.pasoActual;
        let reclamado = false;
        // `false` significa «otra entrega ganó la carrera»; se pone a `true`
        // cuando NO se envía por cualquier otra razón, para que el `warn` de
        // más abajo no diagnostique mal el fallo más caro de este camino.
        let falloAlReclamar = false;
        if (yaEnEstePaso) {
          console.warn(
            "[whatsapp] esta conversación ya está en el primer paso de esta secuencia, no se reenvía",
            mensaje.waId,
            conversacion.id,
          );
          falloAlReclamar = true;
        } else {
          try {
            reclamado = await deps.reclamarPaso(conversacion.id, {
              pasoEsperado: punteroLeido,
              secuenciaId: arrancada.secuenciaId,
              pasoActual: arrancada.estado.pasoActual,
              datos: arrancada.estado.datos,
              // Solo sobre una conversación que sigue en `bot`: si otra entrega
              // ya la pasó a una persona (p.ej. su lead estaba excluido), el
              // primer paso no sale.
              estadoEsperado: "bot",
              // Un re-arranque borra la espera de la secuencia anterior: si no,
              // `reanudar_en` seguiría marcando como «parada esperando» una
              // conversación que acaba de volver a arrancar.
              reanudarEn: null,
            });
          } catch (e) {
            // No se pudo ni reclamar, y no se ha enviado nada: el lead no va a
            // recibir el primer paso, y la idempotencia por wamid impide que un
            // reintento de Meta lo repare. Se pasa a `humana` para que aparezca
            // en la bandeja y una persona la retome a mano, en vez de dejar al
            // lead mudo sin que nadie lo note (Hallazgo 2, ronda de arreglos 1).
            console.error(
              "[whatsapp] fallo reclamando el arranque de la secuencia, se pasa a humana",
              mensaje.waId,
              e,
            );
            try {
              // CONDICIONADO al puntero leído, por el mismo motivo que en el
              // avance: `reclamarPaso` puede haber lanzado DESPUÉS de que otra
              // entrega concurrente ganara la carrera y mandara el primer paso.
              // Un `humana` ciego aquí congelaría esa secuencia para siempre — el
              // lead tendría delante botones vivos, y `decidir` ya no devolvería
              // `guardar_respuesta` (exige `estado === "bot"`), así que al
              // pulsarlos no avanzaría nada ni quedaría nota.
              const recuperado = await deps.reclamarPaso(conversacion.id, {
                pasoEsperado: punteroLeido,
                pasoActual: punteroLeido,
                datos: conversacion.datos,
                estado: "humana",
              });
              if (!recuperado) {
                console.warn(
                  "[whatsapp] otra entrega ya arrancó esta conversación: no se fuerza el paso a humana",
                  mensaje.waId,
                  conversacion.id,
                );
              }
            } catch (e2) {
              console.error(
                "[whatsapp] fallo también pasando la conversación a humana tras el error anterior",
                mensaje.waId,
                e2,
              );
            }
            // `fallado` distingue las dos razones por las que no se envía: aquí
            // el reclamo LANZÓ (y ya se ha registrado y recuperado arriba), no es
            // que otra entrega ganara la carrera. Sin esto el `warn` de abajo
            // diagnosticaba mal el fallo más caro de este camino.
            falloAlReclamar = true;
          }
        }

        if (!reclamado) {
          if (!falloAlReclamar) {
            console.warn(
              "[whatsapp] otra entrega ya arrancó esta conversación o ya no está en bot, no se reenvía el primer paso",
              mensaje.waId,
              conversacion.id,
            );
          }
        } else {
          // La FUENTE: el primer paso de la secuencia que sirve a este anuncio.
          // Un paso con botones se manda con `enviarBotones`; uno sin botones,
          // con `enviarTexto` (decisión 5 del brief).
          try {
            for (const entrada of arrancada.mensajes) {
              const resultado =
                entrada.botones && entrada.botones.length > 0
                  ? await mensajero.enviarBotones(mensaje.waId, entrada.texto, entrada.botones)
                  : await mensajero.enviarTexto(mensaje.waId, entrada.texto);
              await deps.guardarSaliente({
                conversacionId: conversacion.id,
                wamid: resultado.ok ? resultado.wamid : null,
                texto: entrada.texto,
                error: resultado.ok ? undefined : resultado.error,
                botones: entrada.botones,
                origen: "bot",
              });
            }
          } catch (e) {
            // El arranque YA está reclamado: la conversación cree que va por el
            // paso de inicio, pero el lead puede no haber recibido nada, y
            // nadie va a reintentarlo (idempotencia por wamid). Se pasa a
            // `humana` para que la conversación aparezca en la bandeja en vez
            // de quedarse esperando un botón que el lead nunca vio.
            console.error(
              "[whatsapp] fallo enviando el primer paso ya reclamado, se pasa a humana",
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
        }
      } else if (!mensaje.referral || marca.slug !== MARCA_DINKBIT_SLUG) {
        // El respaldo de `autorespuesta.ts` habla de clínicas y firma Paula:
        // es el guion de Dinkbit, no sirve para otra marca. Sin secuencia
        // propia que conteste, la conversación pasa a una persona en vez de
        // mandarle al cliente de otra marca un texto que no es el suyo.
        // Y tampoco sirve sin anuncio, ni en Dinkbit: el respaldo es la
        // garantía de que un clic PAGADO no quede sin respuesta; a quien
        // escribe por primera vez sin anuncio y sin secuencia general que lo
        // atienda le contesta una persona (ver `decidir`).
        console.warn(
          mensaje.referral
            ? "[whatsapp] la marca no tiene secuencia para este anuncio, se pasa a humana sin autorespuesta"
            : "[whatsapp] primer contacto sin anuncio y sin secuencia general, se pasa a humana sin autorespuesta",
          marca.slug,
          mensaje.waId,
        );
        try {
          await deps.actualizarConversacion(conversacion.id, { estado: "humana" });
          conversacion = { ...conversacion, estado: "humana" };
        } catch (e) {
          console.error("[whatsapp] fallo pasando a humana la conversación sin secuencia", mensaje.waId, e);
        }
      } else {
        // RESPALDO, NO la fuente: solo se manda si ninguna secuencia activa
        // sirve a este anuncio, si la que sirve no parsea, o si arrancarla
        // falló (capturado arriba). El canal no puede quedarse mudo porque
        // alguien archive una secuencia por error. Solo para Dinkbit (ver la
        // rama de arriba).
        const texto = textoAutorespuesta({ anuncio });

        // Se limpia el puntero de la secuencia que traía la conversación de
        // antes, ANTES de enviar (Hallazgo 4, ronda de arreglos 3; el orden,
        // ronda B1 arreglo 3). Los botones que estamos a punto de mandar son
        // los GENÉRICOS del respaldo, no los de ningún guion: si
        // `secuencia_id`/`paso_actual` sobreviven, la pulsación siguiente
        // vuelve a entrar por la rama `guardar_respuesta` (que solo mira que
        // los dos tengan valor) y se avanza por índice la secuencia VIEJA —
        // el caso real es un teléfono que clicó el anuncio de psicología hace
        // semanas y hoy clica otro sin mapear: recibiría copy de psicología y
        // se le guardaría un `problema_principal` que no es el que pulsó.
        //
        // Va ANTES del envío a propósito: si estuviera después, un fallo al
        // enviar o al guardar el saliente saltaría al `catch` de fuera sin
        // limpiar nada y el puntero viejo seguiría ahí — o sea, el mismo
        // fallo que esta limpieza existe para evitar. Adelantarla no cuesta
        // nada: el puntero viejo no sirve para mandar el respaldo.
        //
        // `datos` entra también en la limpieza: sin eso queda colgando el
        // `problema_principal` de otro sector, mientras que la rama que sí
        // arranca secuencia escribe `datos` de la secuencia nueva. Y sigue
        // condicionado a que haya algo que limpiar, para no gastar una
        // escritura en el caso normal (primer contacto, sin puntero).
        if (conversacion.secuencia_id || conversacion.paso_actual) {
          try {
            await deps.actualizarConversacion(conversacion.id, {
              secuenciaId: null,
              pasoActual: null,
              datos: {},
              // Y la espera de la secuencia anterior, por el mismo motivo que
              // al re-arrancar: si no, el panel seguiría enseñando como «parada
              // esperando» una conversación que acaba de recibir el respaldo.
              reanudarEn: null,
            });
            conversacion = { ...conversacion, secuencia_id: null, paso_actual: null, datos: {} };
          } catch (e) {
            // Best-effort como el resto de la fase B, pero aquí el coste de
            // seguir es real: si no se pudo limpiar, el respaldo se manda
            // igualmente (mejor eso que dejar al lead sin respuesta) y queda
            // registrado que el puntero viejo sobrevivió.
            console.error(
              "[whatsapp] fallo limpiando el puntero de la secuencia al caer al respaldo",
              mensaje.waId,
              e,
            );
          }
        }

        // Con botones en vez de texto: la respuesta del lead vuelve como
        // `button_reply` y `entrante.ts` la guarda igual que un texto, así que
        // queda en su ficha. Es además lo que más sube la tasa de respuesta.
        const opciones = opcionesAutorespuesta(anuncio);
        const resultado = await mensajero.enviarBotones(mensaje.waId, texto, opciones);
        await deps.guardarSaliente({
          conversacionId: conversacion.id,
          wamid: resultado.ok ? resultado.wamid : null,
          texto,
          botones: opciones,
          origen: "bot",
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
        // El motor llegó a decidir algo (avanzó o no): a partir de aquí, la
        // nota genérica de más abajo (el texto crudo del lead) se salta —
        // si hay algo que contar, ya queda dicho en la nota de
        // `avisarComercial`, más concreta (por qué se avisa, a qué fase se
        // movió); si no hay nada que avisar, es un paso normal del guion y
        // anotarlo ensuciaría la ficha sin aportar nada (mismo criterio que
        // ya usa esta función para una conversación ya en `humana`, ver el
        // comentario de `registrarNota` más abajo). Si en cambio el motor NI
        // SIQUIERA llega a decidir (el `catch` de más abajo, p.ej.
        // `listSecuencias` lanza), `notaGenerica` se queda en `true`: hace
        // falta el rastro mínimo de que el lead escribió algo.
        notaGenerica = false;

        if (avanzada.ok) {
          // Cualquier aviso del motor (`avisar: true` de una ruta, la
          // respuesta libre que se sale del guion, o el destino de una ruta
          // que ya no existe) significa que el bot no debe seguir solo: se
          // entrega la conversación a una persona.
          const pasaAHumana = avanzada.avisos.length > 0;
          // `ruta.fase` cambió en esta vuelta si el motor ya no está en la
          // fase con la que se reconstruyó el estado (tarea 9: hasta ahora
          // nadie leía `estado.fase`, así que un cierre que movía la fase del
          // lead en el guion no se veía reflejado en el CRM).
          const faseNueva = avanzada.fase !== FASE_RECONSTRUIDA ? avanzada.fase : null;
          // Una ruta con `esperar_dias` también entrega la conversación a una
          // persona (ronda B1, arreglo 2). `aplicarRuta` deja la espera
          // apuntada y NO avanza al destino, contando con un cron que aquí no
          // existe: sin esto la conversación se quedaba en `bot`, sin mensaje,
          // sin nota y sin `reanudar_en` — el lead mudo para siempre. Se
          // persiste `reanudar_en` (la escritura que el spec define y que
          // nadie hacía) para que en el panel se vea desde cuándo está parada,
          // y se pasa a `humana` porque, sin cron, lo que de verdad la reanuda
          // es una llamada.
          const esperaDias = avanzada.esperaDias;
          // RED DE SEGURIDAD contra el cierre en silencio. Si una transición no
          // produce mensaje, ni aviso, ni deja el lead en una fase de descarte,
          // entonces el lead pulsó un botón y NO PASÓ NADA: ni respuesta, ni
          // apunte en la ficha, ni nadie a quien llamarle. Es la forma exacta
          // del CRITICAL de esta rama, y puede volver por el panel —un botón
          // con `terminar` a secas— sin que `validarSecuencia` lo marque,
          // porque su regla 10 solo aplica a secuencias que avisan en algún
          // camino (ahí ser estricto pondría en rojo cada secuencia nueva).
          // Así que el validador aconseja y esto garantiza: se entrega a una
          // persona. Un cierre CON fase de descarte no entra: ahí el lead dijo
          // que no y queda registrado, no hay nada que recoger.
          // Una espera NO entra aquí: es una parada deliberada del guion, no un
          // hueco, y ya tiene su propia frase y su `reanudar_en`.
          const sinRespuesta =
            avanzada.mensajes.length === 0 &&
            avanzada.avisos.length === 0 &&
            esperaDias == null &&
            !esFaseDescarte(avanzada.fase);
          const entregaAPersona = pasaAHumana || esperaDias != null || sinRespuesta;

          // RECLAMAR el paso ANTES de enviar (ronda B1, arreglo 1). El orden
          // importa y es contraintuitivo, así que: el gate por `wamid` de
          // `guardarEntrante` cubre el REINTENTO del mismo mensaje, pero no
          // dos mensajes DISTINTOS del lead entregados a la vez —pulsa el
          // botón dos veces en un segundo y Meta manda los dos POST en
          // paralelo—. Las dos entregas leen el mismo `paso_actual` y las dos
          // avanzan desde él. Condicionar el guardado a posteriori no
          // arreglaría nada: con el orden anterior (enviar y luego guardar) el
          // mensaje duplicado ya habría salido cuando el guardado fallara.
          // Reclamando primero, la entrega que pierde la carrera se enterra
          // antes de gastar un envío. NO lo reordenes a enviar-y-luego-guardar.
          let reclamado = false;
          try {
            reclamado = await deps.reclamarPaso(conversacion.id, {
              pasoEsperado: pasoGuardado,
              // Cuando se entrega a una persona, el paso se limpia a `null` A
              // PROPÓSITO en vez de dejar el que devolvió el motor (tarea 9):
              // una ruta con `ir_a` a un mensaje de cierre que también avisa
              // deja `pasoActual` apuntando a ESE mensaje, no a `null` (el
              // motor solo termina de verdad cuando el lead vuelve a
              // escribir sobre un paso sin botones, ver `simulador.ts`). Sin
              // este `null` explícito, un mensaje suelto posterior del lead
              // volvería a ver `secuencia_id && paso_actual` como verdaderos
              // (el switch de más arriba en esta función solo mira eso) y
              // reactivaría el camino del bot sobre una conversación que ya
              // se entregó a una persona.
              pasoActual: entregaAPersona ? null : avanzada.estado.pasoActual,
              datos: avanzada.estado.datos,
              ...(entregaAPersona ? { estado: "humana" as const } : {}),
              ...(esperaDias != null
                ? { reanudarEn: new Date(ahora.getTime() + esperaDias * 24 * 60 * 60 * 1000) }
                : {}),
            });
          } catch (e) {
            // No se pudo ni reclamar: no se ha enviado nada todavía, así que
            // el lead no ha recibido un mensaje a medias. Pero tampoco va a
            // recibir ninguno, y la idempotencia por wamid impide que un
            // reintento de Meta lo repare, así que se entrega a una persona
            // para que la conversación no se quede muda.
            console.error(
              "[whatsapp] fallo reclamando el paso de la secuencia, se pasa a humana",
              mensaje.waId,
              e,
            );
            try {
              // CONDICIONADO al mismo paso que se leyó, no un update ciego. Si
              // esto fuera ciego y la otra entrega concurrente ya hubiera
              // reclamado y avanzado, le borraríamos el puntero y mataríamos
              // una secuencia que iba bien: el lead acabaría de recibir un paso
              // con botones, los pulsaría, y con `paso_actual` en `null` no se
              // avanzaría nada ni quedaría nota. O sea que un hipo de red en la
              // entrega PERDEDORA se llevaría por delante a la ganadora.
              const recuperado = await deps.reclamarPaso(conversacion.id, {
                pasoEsperado: pasoGuardado,
                pasoActual: null,
                datos: conversacion.datos,
                estado: "humana",
              });
              if (recuperado) conversacion = { ...conversacion, estado: "humana" };
              else {
                console.warn(
                  "[whatsapp] otra entrega ya avanzó esta conversación: no se fuerza el paso a humana",
                  mensaje.waId,
                  conversacion.id,
                );
              }
            } catch (e2) {
              console.error(
                "[whatsapp] fallo también pasando la conversación a humana tras el error anterior",
                mensaje.waId,
                e2,
              );
            }
          }

          if (!reclamado) {
            // Otra entrega concurrente ya avanzó desde este mismo paso (o el
            // reclamo falló, y entonces ya se entregó a una persona arriba).
            // No es un error del lead ni de Meta: es la segunda entrega
            // perdiendo la carrera. Se corta aquí SIN enviar nada, que es
            // justo lo que evita el mensaje duplicado.
            console.warn(
              "[whatsapp] otra entrega ya avanzó esta conversación, no se reenvía el paso",
              mensaje.waId,
              conversacion.id,
            );
          } else {
            if (entregaAPersona) conversacion = { ...conversacion, estado: "humana" };

            try {
              // Igual que al arrancar: un paso con botones se manda con
              // `enviarBotones`, uno sin botones con `enviarTexto` (decisión 5).
              for (const entrada of avanzada.mensajes) {
                const resultado =
                  entrada.botones && entrada.botones.length > 0
                    ? await mensajero.enviarBotones(mensaje.waId, entrada.texto, entrada.botones)
                    : await mensajero.enviarTexto(mensaje.waId, entrada.texto);
                await deps.guardarSaliente({
                  conversacionId: conversacion.id,
                  wamid: resultado.ok ? resultado.wamid : null,
                  texto: entrada.texto,
                  error: resultado.ok ? undefined : resultado.error,
                  botones: entrada.botones,
                  origen: "bot",
                });
              }
            } catch (e) {
              // El paso YA está reclamado: la conversación avanzó en la base
              // pero el lead puede no haber recibido nada. Nadie va a
              // reintentarlo (la idempotencia por wamid lo impide), así que se
              // entrega a una persona — la misma postura que el resto del
              // módulo toma cuando algo se queda a medias después de un punto
              // sin retorno.
              console.error(
                "[whatsapp] fallo enviando el paso ya reclamado, se pasa a humana",
                mensaje.waId,
                e,
              );
              try {
                await deps.actualizarConversacion(conversacion.id, { estado: "humana", pasoActual: null });
                conversacion = { ...conversacion, estado: "humana" };
              } catch (e2) {
                console.error(
                  "[whatsapp] fallo también pasando la conversación a humana tras el error anterior",
                  mensaje.waId,
                  e2,
                );
              }
            }
          }

          if (reclamado && (entregaAPersona || faseNueva) && leadId) {
            // `mensaje.texto` (Hallazgo 2, ronda de arreglos 1 de la tarea 9):
            // para un botón ya trae el rótulo que pulsó el lead, no solo el
            // texto libre — ver `respuestaDelMensaje` en entrante.ts.
            //
            // `avisos`, no `motivo` (ronda de arreglos 2 sobre 3ce8299):
            // `avanzada.avisos` ya son frases completas de `simulador.ts`,
            // así que van tal cual a `fraseDeAviso` en vez de por el campo
            // pensado para la frase de continuación de `avanzarSecuencia`.
            await avisarComercial(leadId, {
              avisos: pasaAHumana ? avanzada.avisos : undefined,
              // La espera se cuenta ADEMÁS del aviso, no en su lugar: una ruta
              // puede llevar `avisar: true` y `esperar_dias` a la vez, y la
              // comercial necesita las dos cosas — por qué se le avisa y
              // desde cuándo está parada la conversación (ronda B1, arreglo 2).
              esperaDias: esperaDias ?? undefined,
              cerradaSinRespuesta: sinRespuesta || undefined,
              pulsoBoton: mensaje.botonId != null,
              faseNueva: faseNueva ?? undefined,
              respuestaLead: mensaje.texto,
            });
          }
        } else {
          // Nada que avanzar (secuencia borrada/rota, botón u opción que ya
          // no existe — ver el JSDoc de `avanzarSecuencia`): se entrega a una
          // persona en vez de dejar al lead sin respuesta, y se deja el
          // motivo en su ficha (Hallazgo 2, ronda de arreglos 1), no solo en
          // el `console.error` que ya dejó `avanzarSecuencia`. El paso se
          // limpia a `null` por el mismo motivo que arriba (tarea 9): sin
          // esto, un segundo mensaje suelto del lead volvería a intentar
          // avanzar la MISMA secuencia rota y duplicaría este aviso.
          await deps.actualizarConversacion(conversacion.id, { estado: "humana", pasoActual: null });
          conversacion = { ...conversacion, estado: "humana" };
          // `motivoDetenido`, no `avisos` (ronda de arreglos 2 sobre 3ce8299):
          // `avanzada.motivo` es la frase de CONTINUACIÓN de `avanzarSecuencia`
          // (ver su JSDoc), no una frase suelta — `fraseDeAviso` la introduce
          // con su propio cierre en vez de tratarla como un aviso completo.
          if (leadId) await avisarComercial(leadId, { motivoDetenido: avanzada.motivo, respuestaLead: mensaje.texto });
        }
      } catch (e) {
        // Best-effort (fase B): un fallo aquí (p.ej. `listSecuencias` cae)
        // nunca debe tumbar el procesado, solo queda registrado.
        console.error("[whatsapp] fallo avanzando la secuencia con la respuesta del lead", mensaje.waId, e);
      }
    }
  }

  // Actividad en la ficha del lead: cuando se reutiliza uno ya existente
  // ("responder", con anuncio o en el primer contacto sin él), cuando
  // responde a la pregunta del bot ("guardar_respuesta"), o cuando se le
  // acaba de crear por escribir por primera vez sin anuncio
  // ("crear_lead_y_responder" sin `referral`: lo que escribe sí es suyo, no
  // el texto prerrellenado de un anuncio). Si la conversación YA estaba en
  // marcha (`humana`), no se anota cada mensaje suelto — eso ensuciaría la
  // ficha sin aportar nada.
  //
  // `notaGenerica` (tarea 9): cuando el motor de la secuencia llegó a
  // decidir algo sobre este mensaje, ya deja su propia nota vía
  // `avisarComercial` (con el motivo del aviso y/o la fase nueva) — anotar
  // ADEMÁS el texto crudo aquí duplicaría la nota para el mismo mensaje
  // (Avisar a la comercial: X / X), que es justo lo que no debe pasar.
  const teniaConversacionPrevia = conversacionExistente !== null;
  const registrarNota =
    leadId !== null &&
    notaGenerica &&
    (decision.accion === "responder" ||
      decision.accion === "guardar_respuesta" ||
      (decision.accion === "crear_lead_y_responder" && !mensaje.referral) ||
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

/**
 * Procesa un mensaje escrito desde la app de WhatsApp Business del móvil (un
 * eco). Devuelve `true` si era nuevo. Un eco solo existe en números en
 * coexistencia, pero si su número cae en Dinkbit por entorno se trata igual.
 *
 * Misma política de fases que `procesarMensaje`, separadas por `guardarEco`:
 *
 * FASE A: encontrar o crear la conversación y su lead. Se propaga: el eco
 * todavía no está guardado, así que el 500 es reintentable sin duplicar. El
 * lead sigue la misma regla que un mensaje sin anuncio: el que ya tiene la
 * conversación, el que ya existe con ese teléfono o, en una marca con número
 * propio, uno nuevo de origen `"whatsapp"` (sin nombre: el eco no trae el
 * perfil del destinatario). En Dinkbit no se crea lead, como siempre.
 *
 * Parar la secuencia también es FASE A, ANTES de guardar el eco: si alguien
 * escribe desde el móvil, esa conversación ya la lleva una persona, y un lead
 * no puede tener nunca al bot y a una persona en paralelo. Pasa a `humana` y
 * se limpia el paso, igual que cuando el guion la entrega (así el siguiente
 * mensaje del lead no reactiva el bot). Si se hiciera después del guardado y
 * fallara, el reintento de Meta chocaría con el wamid y el bot seguiría
 * suelto para siempre; antes, un fallo da 500 y el reintento lo vuelve a
 * intentar (reaplicarlo es idempotente). La ventana NO se toca: un mensaje de
 * la empresa no la abre.
 *
 * No queda FASE B: tras guardar el eco no hay nada más que hacer.
 */
async function procesarEco(marca: Marca, eco: EcoSaliente, deps: Deps): Promise<boolean> {
  const marcaId = marca.id;
  // ---- FASE A: reintentable ----------------------------------------------
  const existente = await deps.getConversacion(marcaId, eco.waId);
  const telefono = telefonoDeWaId(eco.waId);

  let leadId: string | null = existente?.lead_id ?? null;
  if (!leadId && telefono) leadId = (await deps.buscarLeadPorTelefono(marcaId, telefono))?.id ?? null;
  const leadDeWhatsApp = tieneNumeroPropio(marca) && !leadId;

  let conversacion: Conversacion;
  if (existente) {
    conversacion = existente;
    if (leadId && !existente.lead_id) {
      await deps.actualizarConversacion(existente.id, { leadId });
      conversacion = { ...existente, lead_id: leadId };
    }
  } else {
    // Sin conversación previa nadie le ha escrito a la empresa, así que no hay
    // ventana abierta: nace ya vencida (`enviadoEn`), y en `humana`, que es
    // justo quien la lleva.
    const nueva = { marcaId, waId: eco.waId, estado: "humana" as const, ventanaHasta: eco.enviadoEn };
    conversacion = leadDeWhatsApp
      ? await crearConversacionOReleer(deps, nueva)
      : await deps.crearConversacion({ ...nueva, leadId });
  }

  if (leadDeWhatsApp && !conversacion.lead_id) {
    const creado = await deps.crearLeadDeWhatsApp({
      marcaId,
      waId: eco.waId,
      telefono,
      nombre: null,
      origen: "whatsapp",
      anuncio: null,
    });
    await deps.actualizarConversacion(conversacion.id, { leadId: creado.id });
    conversacion = { ...conversacion, lead_id: creado.id };
  }

  if (conversacion.estado !== "humana" || conversacion.paso_actual) {
    await deps.actualizarConversacion(conversacion.id, { estado: "humana", pasoActual: null });
  }

  const { nuevo } = await deps.guardarEco({
    conversacionId: conversacion.id,
    wamid: eco.wamid,
    texto: eco.texto,
    enviadoEn: eco.enviadoEn,
    payload: eco.crudo,
  });
  return nuevo;
}

/**
 * Avisos de la cuenta de WhatsApp Business. Solo `PARTNER_REMOVED` (la empresa
 * desvinculó el número, o Meta lo hizo por inactividad) cambia algo: cada
 * marca de esa WABA queda desconectada con el motivo, para que el panel pida
 * reconectarla. El resto solo se registra.
 */
async function procesarAvisos(avisos: AvisoCuenta[], deps: Deps): Promise<void> {
  for (const aviso of avisos) {
    if (aviso.evento !== "PARTNER_REMOVED") {
      console.info("[whatsapp] aviso de cuenta", aviso.evento, aviso.wabaId);
      continue;
    }
    const marcas = aviso.wabaId ? await deps.marcasPorWaba(aviso.wabaId) : [];
    if (marcas.length === 0) {
      console.info("[whatsapp] PARTNER_REMOVED de una WABA sin marca, se ignora", aviso.wabaId);
      continue;
    }
    for (const marca of marcas) await deps.marcarDesconectada(marca.id, aviso.motivo);
  }
}

type MarcaPropiaDe = (numeroId: string | null) => Promise<Marca | null>;

/** Vacío o solo espacios cuenta como «sin nombre» (el lead se crea con `""`). */
function sinNombre(valor: string | null | undefined): boolean {
  return !valor?.trim();
}

/**
 * Contactos de la agenda de la app de WhatsApp Business. `add` guarda el
 * nombre y lo pone en la conversación y en el lead si todavía no tenían uno
 * (el que ya hay, quizá corregido a mano, no se pisa). `remove` no hace nada:
 * quitar a alguien de la agenda no borra su conversación ni su lead.
 */
async function procesarContactos(contactos: ContactoSync[], marcaPropiaDe: MarcaPropiaDe, deps: Deps): Promise<void> {
  for (const c of contactos) {
    if (c.accion !== "add" || !c.nombre?.trim()) continue;
    const marca = await marcaPropiaDe(c.numeroId);
    if (!marca) {
      console.info("[whatsapp] contacto de un número sin marca propia, se ignora", c.numeroId);
      continue;
    }
    const nombre = c.nombre.trim();
    await deps.guardarContactos(marca.id, [{ waId: c.waId, nombre }]);

    const conversacion = await deps.getConversacion(marca.id, c.waId);
    if (conversacion && sinNombre(conversacion.nombre_contacto)) {
      await deps.actualizarConversacion(conversacion.id, { nombreContacto: nombre });
    }
    const telefono = telefonoDeWaId(c.waId);
    const lead = telefono ? await deps.buscarLeadPorTelefono(marca.id, telefono) : null;
    if (lead && sinNombre(lead.contacto)) await deps.rellenarContactoLead(lead.id, nombre);
  }
}

/**
 * Historial que la empresa compartió al conectar el número. Importarlo es SOLO
 * guardar: la conversación nueva nace en `humana` (la lleva una persona, nunca
 * el bot). La ventana de 24 h se abre con el último mensaje ENTRANTE del
 * cliente (nunca con los del negocio) y solo se extiende, jamás se encoge; no
 * se mira ninguna secuencia, no se envía nada y no se apunta actividad en la
 * ficha. Una conversación que ya existía conserva su estado.
 *
 * El lead se crea como en un mensaje directo a un número propio (origen
 * `"whatsapp"`), con el nombre de la agenda si se sincronizó. Solo hay
 * historial en un número propio: lo que llegue por el de entorno (Dinkbit) o
 * por uno desconocido se registra y se salta.
 */
async function procesarHistorial(lotes: LoteHistorial[], marcaPropiaDe: MarcaPropiaDe, deps: Deps): Promise<void> {
  for (const lote of lotes) {
    const marca = await marcaPropiaDe(lote.numeroId);
    if (!marca) {
      console.info("[whatsapp] historial de un número sin marca propia, se ignora", lote.numeroId);
      continue;
    }
    if (lote.error) {
      if (lote.error.codigo === CODIGO_HISTORIAL_RECHAZADO) await deps.setHistorialMarca(marca.id, "rechazado");
      else console.error("[whatsapp] fallo en la sincronización del historial", marca.id, lote.error.codigo, lote.error.mensaje);
    }
    // Los hilos son independientes (un waId cada uno) y un lote puede traer
    // cientos: en serie, con ~10 idas a la base por hilo, no cabrían en el
    // tiempo de la función, y Meta reenviaría el mismo lote para siempre.
    await enParalelo(
      lote.hilos.filter((h) => h.mensajes.length > 0),
      HILOS_A_LA_VEZ,
      (hilo) => importarHilo(marca, hilo, deps),
    );
    // Después de importar: si el lote falla a medias, el reintento lo repite
    // y el historial no queda como completo antes de tiempo.
    if (lote.progreso === 100) await deps.setHistorialMarca(marca.id, "completo");
  }
}

/** Cuántos hilos del historial se importan a la vez. */
const HILOS_A_LA_VEZ = 8;

/**
 * Ejecuta `tarea` sobre cada elemento con como mucho `limite` en marcha a la
 * vez. Si alguna falla, espera a que terminen las demás (ninguna queda a
 * medias escribiendo tras el 500) y lanza el primer error.
 */
async function enParalelo<T>(elementos: T[], limite: number, tarea: (elemento: T) => Promise<void>): Promise<void> {
  let siguiente = 0;
  const errores: unknown[] = [];
  const trabajador = async () => {
    while (siguiente < elementos.length) {
      const elemento = elementos[siguiente++];
      try {
        await tarea(elemento);
      } catch (e) {
        errores.push(e);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, trabajador));
  if (errores.length > 0) throw errores[0];
}

/** La empresa desactivó en la app compartir el historial. */
const CODIGO_HISTORIAL_RECHAZADO = 2593109;

async function importarHilo(marca: Marca, hilo: LoteHistorial["hilos"][number], deps: Deps): Promise<void> {
  const marcaId = marca.id;
  const telefono = telefonoDeWaId(hilo.waId);
  const nombre = await deps.nombreDeContacto(marcaId, hilo.waId);
  const masAntiguo = hilo.mensajes.reduce((a, m) => (m.enviadoEn < a ? m.enviadoEn : a), hilo.mensajes[0].enviadoEn);

  // La ventana de 24 h se abre con el último mensaje REAL del cliente; los del
  // negocio (eco/historial saliente) nunca la abren. Sin entrantes, no hay ventana.
  const ultimoEntrante = hilo.mensajes.reduce<Date | null>(
    (a, m) => (m.deNegocio || (a && m.enviadoEn <= a) ? a : m.enviadoEn),
    null,
  );
  const ventanaDelHilo = ultimoEntrante ? calcularVentana(ultimoEntrante, false) : null;

  const existente = await deps.getConversacion(marcaId, hilo.waId);
  let conversacion =
    existente ??
    (await crearConversacionOReleer(deps, {
      marcaId,
      waId: hilo.waId,
      estado: "humana",
      ventanaHasta: ventanaDelHilo,
      nombreContacto: nombre ?? undefined,
      ultimoMensajeAt: masAntiguo,
    }));

  // Conversación que ya existía: la ventana solo se extiende, nunca se encoge.
  if (existente && ventanaDelHilo) {
    const ventana = ventanaExtendida(existente, ventanaDelHilo);
    if (ventana.getTime() !== new Date(existente.ventana_hasta ?? 0).getTime()) {
      await deps.actualizarConversacion(existente.id, { ventanaHasta: ventana });
      conversacion = { ...conversacion, ventana_hasta: ventana.toISOString() };
    }
  }

  if (!conversacion.lead_id) {
    const lead =
      (telefono ? await deps.buscarLeadPorTelefono(marcaId, telefono) : null) ??
      (await deps.crearLeadDeWhatsApp({ marcaId, waId: hilo.waId, telefono, nombre, origen: "whatsapp", anuncio: null }));
    await deps.actualizarConversacion(conversacion.id, { leadId: lead.id });
    conversacion = { ...conversacion, lead_id: lead.id };
  }

  await deps.guardarHistorial({
    conversacionId: conversacion.id,
    mensajes: hilo.mensajes.map((m) => ({
      wamid: m.wamid,
      deNegocio: m.deNegocio,
      texto: m.texto,
      enviadoEn: m.enviadoEn,
      crudo: m.crudo,
    })),
  });
}

/**
 * Resuelve la marca de cada mensaje por el número que lo recibió
 * (`elegirMarca`), con una caché por webhook: un lote trae casi siempre varios
 * mensajes del mismo número, y no hace falta preguntar a la base por cada uno.
 * Dinkbit solo se busca si algún mensaje es suyo.
 *
 * Es fase A entera: no se ha guardado nada, así que cualquier fallo de lectura
 * se propaga y la ruta responde 500 (reintentable). Lo mismo si Dinkbit hace
 * falta y no existe (ver la cabecera del fichero, Hallazgo I2).
 */
function resolutorDeMarcas(deps: Deps) {
  const porNumero = new Map<string, Promise<Marca | null>>();
  const asignadaA = (numeroId: string): Promise<Marca | null> => {
    let pendiente = porNumero.get(numeroId);
    if (!pendiente) {
      pendiente = deps.marcaDeNumero(numeroId);
      porNumero.set(numeroId, pendiente);
    }
    return pendiente;
  };
  let dinkbit: Promise<Marca> | null = null;

  const marcaDinkbit = (): Promise<Marca> => {
    dinkbit ??= deps.marcaDinkbit().then((marca) => {
      // Se LANZA a propósito (Hallazgo I2, ronda de arreglos 2): todavía no se
      // ha persistido nada, así que la ruta responde 500 sin riesgo de
      // duplicado y Meta reintenta durante horas. Las migraciones son
      // MANUALES, así que "la marca todavía no está insertada" es el estado
      // más probable el día del despliegue — tragárselo aquí respondería 200,
      // Meta daría el mensaje por entregado, y el lead (y el anuncio pagado
      // que lo trajo) se perderían para siempre.
      if (!marca) throw new Error(`[whatsapp] no existe la marca "${MARCA_DINKBIT_SLUG}"`);
      return marca;
    });
    return dinkbit;
  };

  const marcaDe = async (numeroId: string | null): Promise<Marca | null> => {
    const asignada = numeroId ? await asignadaA(numeroId) : null;
    switch (elegirMarca({ numeroId, numeroEntorno: deps.numeroEntorno, asignada })) {
      case "asignada":
        return asignada;
      case "dinkbit":
        return marcaDinkbit();
      case "desconocida":
        return null;
    }
  };

  /** Solo la marca con número propio conectado a `numeroId`; nunca Dinkbit por
   *  el número de entorno. Para el historial y los contactos de coexistencia,
   *  que solo existen en un número propio. */
  const marcaPropiaDe = async (numeroId: string | null): Promise<Marca | null> => {
    const asignada = numeroId ? await asignadaA(numeroId) : null;
    return asignada && tieneNumeroPropio(asignada) ? asignada : null;
  };

  return { marcaDe, marcaPropiaDe };
}

export async function procesarWebhook(input: {
  cuerpo: unknown;
  deps?: Deps;
  ahora?: Date;
}): Promise<{ procesados: number }> {
  const depsBase = input.deps ?? depsReales();
  // Las exclusiones de cada marca se leen una vez por webhook: un lote de
  // historial puede crear cientos de leads de la misma marca.
  const exclusionesPorMarca = new Map<string, Promise<Exclusion[]>>();
  const exclusionesDe = (marcaId: string): Promise<Exclusion[]> => {
    let pendiente = exclusionesPorMarca.get(marcaId);
    if (!pendiente) {
      pendiente = depsBase.listExclusiones(marcaId);
      // Un fallo no se queda en la caché: lanza para este lead (fase A) y
      // el siguiente lo vuelve a intentar.
      pendiente.catch(() => exclusionesPorMarca.delete(marcaId));
      exclusionesPorMarca.set(marcaId, pendiente);
    }
    return pendiente;
  };
  const deps: Deps = {
    ...depsBase,
    crearLeadDeWhatsApp: async (lead) =>
      depsBase.crearLeadDeWhatsApp({ ...lead, exclusiones: lead.exclusiones ?? (await exclusionesDe(lead.marcaId)) }),
  };

  // La marca de cada mensaje se resuelve ANTES de tocar nada (ni estados ni
  // mensajes), igual que antes se buscaba Dinkbit lo primero: si algo de esto
  // falla, el 500 llega sin haber escrito nada.
  const { marcaDe, marcaPropiaDe } = resolutorDeMarcas(deps);

  // Avisos de cuenta, contactos e historial ANTES que los mensajes: un número
  // recién desvinculado no debería seguir contando como conectado, y el
  // historial necesita los nombres de la agenda para crear sus leads. Todo es
  // idempotente (por marca, por `(marca, wa_id)` o por `wamid`), así que un
  // fallo se deja propagar: la ruta responde 500 y el reintento lo repite sin
  // duplicar nada. Nada de esto envía, arranca secuencias ni apunta actividad.
  await procesarAvisos(extraerAvisosCuenta(input.cuerpo), deps);
  await procesarContactos(extraerContactos(input.cuerpo), marcaPropiaDe, deps);
  await procesarHistorial(extraerHistorial(input.cuerpo), marcaPropiaDe, deps);

  const mensajes: Array<{ mensaje: MensajeEntrante; marca: Marca }> = [];
  for (const mensaje of extraerMensajes(input.cuerpo)) {
    const marca = await marcaDe(mensaje.numeroId);
    if (!marca) {
      // Un número que no es de ninguna marca ni el de entorno: no se atribuye
      // a nadie. Se registra y se salta, sin 500 — reintentar no lo arreglaría.
      console.error("[whatsapp] mensaje de un número desconocido, se ignora", mensaje.numeroId, mensaje.wamid);
      continue;
    }
    mensajes.push({ mensaje, marca });
  }
  // Los ecos del móvil, con el mismo resolutor (y la misma caché).
  const ecos: Array<{ eco: EcoSaliente; marca: Marca }> = [];
  for (const eco of extraerEcos(input.cuerpo)) {
    const marca = await marcaDe(eco.numeroId);
    if (!marca) {
      console.error("[whatsapp] eco de un número desconocido, se ignora", eco.numeroId, eco.wamid);
      continue;
    }
    ecos.push({ eco, marca });
  }

  // Un mensajero por marca y webhook: cada mensaje sale por el número de SU
  // marca, nunca por el de otra del mismo lote. También fase A: leer el token
  // cifrado puede fallar, y entonces se reintenta el lote.
  const mensajeros = new Map<string, MensajeroWhatsApp>();
  for (const { marca } of mensajes) {
    if (!mensajeros.has(marca.id)) mensajeros.set(marca.id, await deps.mensajeroDeMarca(marca));
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
  for (const { mensaje, marca } of mensajes) {
    // NO se atrapa aquí a propósito: por construcción, `procesarMensaje` solo
    // deja escapar fallos de FASE A (antes de `guardarEntrante`), que son
    // reintentables — todo lo de fase B ya se atrapa dentro. Se propaga hasta
    // la ruta para que responda 500 y Meta reintente el lote entero; el resto
    // de mensajes de este lote que ya se hubieran guardado son idempotentes
    // por wamid, así que el reintento no los duplica.
    const mensajero = mensajeros.get(marca.id) as MensajeroWhatsApp;
    if (await procesarMensaje(marca, mensajero, mensaje, deps, ahora)) procesados += 1;
  }

  // Los ecos DESPUÉS de los mensajes: si el lote trae a la vez lo que escribió
  // el lead y lo que se le contestó desde el móvil, la respuesta de la persona
  // es lo último y tiene que ser la que deja la conversación parada. Tampoco se
  // atrapan aquí: lo que escapa es fase A, reintentable igual que arriba.
  // `procesados` sigue contando solo los mensajes del lead.
  for (const { eco, marca } of ecos) {
    await procesarEco(marca, eco, deps);
  }

  return { procesados };
}
