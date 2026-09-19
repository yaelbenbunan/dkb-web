/**
 * Motor de simulación de una conversación de WhatsApp (fase 1, sin envío
 * real). Módulo puro (sin `server-only`): lo usa el simulador del editor, en
 * el cliente. No escribe nada ni conoce Supabase: recibe una `Secuencia` ya
 * parseada (Task 2) y un contexto con los valores de ejemplo, y devuelve el
 * estado de la conversación paso a paso.
 *
 * Spec: docs/superpowers/specs/2026-09-18-secuencias-whatsapp-design.md
 */

import type { Fase } from "./dominio";
import { renderizarTexto, type Ruta, type Secuencia } from "./secuencias";

const AVISO_AVISAR = "Avisar a la comercial";
const AVISO_RESPUESTA_LIBRE = "Respuesta libre: la secuencia se para y se avisa a la comercial";

/** Valores de ejemplo para renderizar las variables, y fase inicial del lead simulado. */
export interface ContextoSimulacion {
  valores: Record<string, string | null>;
  faseInicial: Fase;
}

/** Un mensaje de la conversación simulada: de la marca (el guion) o del negocio (la respuesta). */
export interface EntradaConversacion {
  de: "marca" | "negocio";
  texto: string;
  botones?: string[];
}

export interface EstadoSimulacion {
  conversacion: EntradaConversacion[];
  pasoActual: string | null;
  fase: Fase;
  datos: Record<string, string>;
  avisos: string[];
  esperaDias: number | null;
  terminada: boolean;
  faltanVariables: string[];
}

/** Añade un mensaje de la marca con el paso `id`, o termina con un aviso si no existe. */
function entrarEnPaso(s: Secuencia, id: string, estado: EstadoSimulacion, ctx: ContextoSimulacion): EstadoSimulacion {
  const paso = s.pasos[id];
  if (!paso) {
    return {
      ...estado,
      pasoActual: null,
      terminada: true,
      avisos: [...estado.avisos, `Esta secuencia tiene un error: el paso «${id}» no existe.`],
    };
  }

  const { texto, faltan } = renderizarTexto(paso.texto, ctx.valores);
  const entrada: EntradaConversacion = {
    de: "marca",
    texto,
    ...(paso.botones.length > 0 ? { botones: paso.botones.map((b) => b.texto) } : {}),
  };
  const faltanVariables = [...estado.faltanVariables];
  for (const variable of faltan) {
    if (!faltanVariables.includes(variable)) faltanVariables.push(variable);
  }

  return {
    ...estado,
    conversacion: [...estado.conversacion, entrada],
    pasoActual: id,
    faltanVariables,
  };
}

/** Aplica lo que dice una ruta (de un botón o de un paso): fase, aviso, espera, destino o fin. */
function aplicarRuta(s: Secuencia, estado: EstadoSimulacion, ruta: Ruta, ctx: ContextoSimulacion): EstadoSimulacion {
  const conFase = ruta.fase ? { ...estado, fase: ruta.fase } : estado;
  const conAviso = ruta.avisar ? { ...conFase, avisos: [...conFase.avisos, AVISO_AVISAR] } : conFase;

  if (ruta.terminar) {
    return { ...conAviso, terminada: true, pasoActual: null };
  }
  if (ruta.esperar_dias !== undefined) {
    // Fase 1 no tiene cron real: se deja constancia de la espera y no se
    // avanza al destino todavía (lo dispararía el cron cuando exista).
    return { ...conAviso, esperaDias: ruta.esperar_dias, pasoActual: null };
  }
  if (ruta.ir_a) {
    return entrarEnPaso(s, ruta.ir_a, conAviso, ctx);
  }
  return { ...conAviso, pasoActual: null };
}

/** Arranca la simulación: el primer mensaje es el del paso de inicio. */
export function iniciarSimulacion(s: Secuencia, ctx: ContextoSimulacion): EstadoSimulacion {
  const inicial: EstadoSimulacion = {
    conversacion: [],
    pasoActual: null,
    fase: ctx.faseInicial,
    datos: {},
    avisos: [],
    esperaDias: null,
    terminada: false,
    faltanVariables: [],
  };
  return entrarEnPaso(s, s.inicio, inicial, ctx);
}

/** Simula pulsar uno de los botones del paso actual. Un índice que no existe no cambia nada. */
export function responderBoton(s: Secuencia, estado: EstadoSimulacion, indiceBoton: number, ctx: ContextoSimulacion): EstadoSimulacion {
  if (estado.terminada || !estado.pasoActual) return estado;
  const paso = s.pasos[estado.pasoActual];
  if (!paso) return estado;
  const boton = paso.botones[indiceBoton];
  if (!boton) return estado;

  const conRespuesta: EstadoSimulacion = {
    ...estado,
    conversacion: [...estado.conversacion, { de: "negocio", texto: boton.texto }],
    datos: paso.guardar_respuesta_en ? { ...estado.datos, [paso.guardar_respuesta_en]: boton.texto } : estado.datos,
  };
  return aplicarRuta(s, conRespuesta, boton.ruta, ctx);
}

/**
 * Simula que el negocio contesta con texto libre (no un botón). Hay dos
 * casos: si el paso actual no tiene botones es una pregunta abierta (p.ej.
 * «¿A qué dirección te mandamos las muestras?»): el texto es la respuesta
 * esperada, se guarda en `datos` si el paso tiene `guardar_respuesta_en` y se
 * sigue su `ruta` igual que con un botón. Si el paso tiene botones, el texto
 * libre es salirse del guion: la secuencia se para, se avisa a la comercial
 * y no se sigue ninguna ruta.
 */
export function responderTexto(s: Secuencia, estado: EstadoSimulacion, texto: string, ctx: ContextoSimulacion): EstadoSimulacion {
  if (estado.terminada) return estado;
  const paso = estado.pasoActual ? s.pasos[estado.pasoActual] : undefined;

  const conRespuesta: EstadoSimulacion = {
    ...estado,
    conversacion: [...estado.conversacion, { de: "negocio", texto }],
  };

  if (paso && paso.botones.length === 0) {
    const conDatos: EstadoSimulacion = paso.guardar_respuesta_en
      ? { ...conRespuesta, datos: { ...conRespuesta.datos, [paso.guardar_respuesta_en]: texto } }
      : conRespuesta;
    return paso.ruta ? aplicarRuta(s, conDatos, paso.ruta, ctx) : conDatos;
  }

  return {
    ...conRespuesta,
    pasoActual: null,
    terminada: true,
    avisos: [...conRespuesta.avisos, AVISO_RESPUESTA_LIBRE],
  };
}
