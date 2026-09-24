/**
 * Traducción entre el canal (WhatsApp, con sus ids de botón y su necesidad de
 * persistir estado entre webhooks) y el motor de secuencias
 * (`src/lib/ventas/simulador.ts`), que es una máquina de estados pura y no
 * sabe nada de WhatsApp ni de cómo se guarda el progreso de un lead.
 *
 * Módulo puro (sin `server-only`): es donde vive la lógica de esta entrega
 * que se puede testear sin base ni red.
 */

import type { Fase } from "../ventas/dominio";
import type { EntradaConversacion, EstadoSimulacion } from "../ventas/simulador";

/** Formato de los ids que pone `mensajero.enviarBotones`: `opcion_1`, `opcion_2`… */
const ID_BOTON = /^opcion_([1-9]\d*)$/;

/**
 * Traduce el id del botón pulsado (tal como llega en el webhook) al índice
 * que espera `responderBoton`. Devuelve null si no hay id o no encaja el
 * formato: el llamador debe entonces tratarlo como texto libre.
 */
export function indiceDeBoton(botonId: string | null): number | null {
  const m = botonId?.match(ID_BOTON);
  return m ? Number(m[1]) - 1 : null;
}

/**
 * Lo que hay que mandar por WhatsApp tras una transición del motor: los
 * mensajes que la marca añadió al hilo desde el estado anterior. Los del
 * lado `negocio` ya los escribió el lead, no hay que reenviarlos; y lo que ya
 * estaba en `anterior` ya se mandó en una vuelta previa.
 *
 * Precondición que ningún tipo obliga, así que queda aquí escrita: `anterior`
 * tiene que ser exactamente el estado que sirvió de base a la transición que
 * produjo `nuevo` (el que se le pasó a `responderBoton`/`responderTexto`), no
 * uno más viejo ni uno de otra conversación. Si no lo es, la comparación de
 * longitudes de `conversacion` queda descuadrada: con un `anterior` más corto
 * de la cuenta se reenvía un mensaje que ya se mandó; con uno más largo (o de
 * otro lead) se omite uno nuevo.
 */
export function mensajesAEnviar(
  anterior: EstadoSimulacion | null,
  nuevo: EstadoSimulacion,
): EntradaConversacion[] {
  const desde = anterior?.conversacion.length ?? 0;
  return nuevo.conversacion.slice(desde).filter((e) => e.de === "marca");
}

/** Lo único del estado del motor que se persiste entre webhooks. */
export interface EstadoGuardado {
  pasoActual: string | null;
  datos: Record<string, string>;
}

export function aEstadoGuardado(estado: EstadoSimulacion): EstadoGuardado {
  return { pasoActual: estado.pasoActual, datos: estado.datos };
}

/**
 * Reconstruye el estado del motor desde lo guardado. El hilo (`conversacion`)
 * va vacío a propósito: no se persiste aquí, vive en `ventas_mensajes`, y así
 * `mensajesAEnviar` compara contra un hilo vacío y devuelve exactamente lo
 * que el motor añada en esta vuelta.
 *
 * `terminada` se deriva de `pasoActual`, no se guarda fija a false: el motor
 * tiene dos guardas distintas para no seguir avanzando solo, y no son
 * simétricas. `responderBoton` mira `estado.terminada || !estado.pasoActual`,
 * pero `responderTexto` mira SOLO `estado.terminada`. Si aquí `terminada`
 * fuera siempre false, un lead sin paso actual (cerrado, o parado esperando
 * el cron) que escribiera texto libre caería en la rama final de
 * `responderTexto` y repetiría el aviso de «respuesta libre» en cada mensaje.
 * `pasoActual === null` es la condición que ya usa la otra guarda, así que
 * reconstruir `terminada` con ella iguala el comportamiento de las dos.
 */
export function desdeEstadoGuardado(guardado: EstadoGuardado, fase: Fase): EstadoSimulacion {
  return {
    conversacion: [],
    pasoActual: guardado.pasoActual,
    fase,
    datos: guardado.datos,
    avisos: [],
    esperaDias: null,
    terminada: guardado.pasoActual === null,
    faltanVariables: [],
  };
}
