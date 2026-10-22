"use server";

import { avisarAltaEnviada } from "@/lib/altas/aviso";
import {
  CAMPOS_ARCHIVO,
  ERROR_CUPO,
  MAX_ARCHIVOS_ALTA,
  MAX_BYTES_ALTA,
  MAX_BYTES_ARCHIVO,
  cabeEnElCupo,
  construirRuta,
  esCampoArchivo,
  rutaEsDelAlta,
  rutaEsDelCampo,
  validarArchivo,
  type ArchivoAlta,
  type NombreCampoArchivo,
} from "@/lib/altas/archivos";
import {
  borrarArchivos,
  firmarSubida,
  getAltaPorToken,
  guardarEnvioAlta,
  infoArchivo,
  modificarPendientes,
  usoAlta,
  type AltaCliente,
} from "@/lib/altas/db";
import { marcarSubidas, reservarFirma } from "@/lib/altas/pendientes";
import { CAMPOS_ALTA, leerRespuestasAlta } from "@/lib/altas/preguntas";
import { esFormatoTokenAlta } from "@/lib/altas/token";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

/**
 * Acciones de la página pública /alta/<token>. Sin cuenta: el token es la
 * única credencial, así que cada acción resuelve el alta SOLO por él y solo
 * toca esa alta. Un token que no existe y uno desactivado reciben la misma
 * respuesta, para no dar pistas.
 */

const NO_VALIDO = { ok: false, error: "Este enlace no es válido." } as const;
const ERROR_PREPARAR = "No se pudo preparar la subida. Vuelve a intentarlo en un momento.";

async function altaActiva(token: unknown): Promise<AltaCliente | null> {
  if (!esFormatoTokenAlta(token)) return null;
  const alta = await getAltaPorToken(token);
  return alta?.activa ? alta : null;
}

/** El nombre original solo se enseña (panel y descarga): sin control, recortado. */
function nombreVisible(nombre: unknown): string {
  const limpio = (typeof nombre === "string" ? nombre : "").replace(/[\u0000-\u001F\u007F]+/g, "").split(/[\\/]/).pop()?.trim() ?? "";
  return limpio.slice(0, 200) || "archivo";
}

/** Deja de contar esas rutas como firmas pendientes. Sin que pueda fallar nada. */
async function soltarPendientes(altaId: string, rutas: string[]): Promise<void> {
  if (!rutas.length) return;
  try {
    await modificarPendientes(altaId, (lista) => ({ ok: true, pendientes: marcarSubidas(lista, rutas) }));
  } catch (error) {
    console.error("[altas] no se pudieron soltar las firmas pendientes", error);
  }
}

export type SubidaFirmada = { ok: true; ruta: string; url: string } | { ok: false; error: string };

/**
 * Firma la subida directa de UN archivo al bucket privado, si el token vale,
 * el archivo es de un tipo y tamaño permitidos para ese campo, y caben en el
 * cupo del alta (40 archivos, 1 GB) lo que ya hay en el bucket más las firmas
 * pendientes, contadas a 50 MB cada una. Como mucho 15 firmas cada 10 minutos.
 */
export async function pedirSubidaAction(token: string, archivo: { campo: string; nombre: string; tamano: number; tipo: string }): Promise<SubidaFirmada> {
  if (!archivo || typeof archivo !== "object") return { ok: false, error: "Archivo no válido." };
  const alta = await altaActiva(token);
  if (!alta) return NO_VALIDO;
  const v = validarArchivo(archivo.campo, archivo.nombre, archivo.tamano, archivo.tipo);
  if (!v.ok) return v;

  const uso = await usoAlta(alta);
  const ruta = construirRuta(alta.id, archivo.campo as NombreCampoArchivo, archivo.nombre, crypto.randomUUID());
  const reserva = await modificarPendientes(alta.id, (lista) => reservarFirma(lista, uso, ruta));
  if (reserva.estado === "rechazo") return { ok: false, error: reserva.error };
  if (reserva.estado === "error") return { ok: false, error: ERROR_PREPARAR };
  // Sin la columna (falta la migración): solo el bucket y el tamaño declarado.
  if (reserva.estado === "sin_columna" && !cabeEnElCupo(uso, archivo.tamano)) return { ok: false, error: ERROR_CUPO };

  const firmada = await firmarSubida(ruta);
  return firmada.ok ? { ok: true, ruta, url: firmada.url } : firmada;
}

/** El navegador avisa de que la subida terminó: deja de ser una firma pendiente. */
export async function confirmarSubidaAction(token: string, ruta: string): Promise<ResultadoAccion> {
  const alta = await altaActiva(token);
  if (!alta) return NO_VALIDO;
  if (!rutaEsDelAlta(ruta, alta.id)) return { ok: false, error: "Archivo no válido." };
  await soltarPendientes(alta.id, [ruta]);
  return { ok: true };
}

type ArchivoEnviado = { campo: string; ruta: string; nombre: string };
type Leidos = { ok: true; archivos: ArchivoAlta[]; nuevas: string[]; quitados: string[] } | { ok: false; error: string };

/**
 * Comprueba la lista de archivos que manda el navegador frente a lo guardado.
 * `conocidas`: las rutas guardadas que esa pestaña tenía al abrirse. Un archivo
 * guardado que no conocía (lo envió otra pestaña después) se conserva; solo se
 * quitan los que conocía y ya no manda. Los nuevos tienen que estar de verdad
 * en el bucket y ser de esta alta.
 */
async function leerArchivos(alta: AltaCliente, lista: unknown, conocidas: unknown): Promise<Leidos> {
  if (!Array.isArray(lista) || lista.length > MAX_ARCHIVOS_ALTA) return { ok: false, error: "La lista de archivos no es válida." };
  const guardados = new Map(alta.archivos.map((a) => [a.ruta, a]));
  const conoce = Array.isArray(conocidas) ? new Set(conocidas.filter((r): r is string => typeof r === "string")) : new Set(guardados.keys());
  const vistas = new Set<string>();
  const archivos: ArchivoAlta[] = [];
  const nuevas: string[] = [];
  for (const item of lista as ArchivoEnviado[]) {
    if (!item || typeof item !== "object" || !esCampoArchivo(item.campo) || typeof item.ruta !== "string") {
      return { ok: false, error: "La lista de archivos no es válida." };
    }
    if (vistas.has(item.ruta)) continue;
    vistas.add(item.ruta);
    const previo = guardados.get(item.ruta);
    if (previo && previo.campo === item.campo) {
      archivos.push(previo);
      continue;
    }
    if (!rutaEsDelCampo(item.ruta, alta.id, item.campo)) return { ok: false, error: "Uno de los archivos no es válido. Quítalo y vuelve a añadirlo." };
    const nombre = nombreVisible(item.nombre);
    const info = await infoArchivo(item.ruta);
    if (info.estado === "no_existe") return { ok: false, error: `«${nombre}» no se llegó a subir. Quítalo y vuelve a añadirlo.` };
    if (info.estado === "error") return { ok: false, error: "No hemos podido comprobar el archivo, vuelve a intentarlo." };
    if (info.tamano > MAX_BYTES_ARCHIVO) {
      await borrarArchivos([item.ruta]);
      return { ok: false, error: `«${nombre}» pesa más de 50 MB. Para archivos grandes, pega un enlace de Drive o WeTransfer.` };
    }
    archivos.push({ campo: item.campo, ruta: item.ruta, nombre, tamano: info.tamano, tipo: info.tipo });
    nuevas.push(item.ruta);
  }
  // Lo guardado que esta pestaña no conocía se queda.
  for (const a of alta.archivos) if (!vistas.has(a.ruta) && !conoce.has(a.ruta)) archivos.push(a);
  for (const [campo, config] of Object.entries(CAMPOS_ARCHIVO)) {
    if (archivos.filter((a) => a.campo === campo).length > config.maxArchivos) {
      return { ok: false, error: `${config.etiqueta}: como mucho ${config.maxArchivos} archivos.` };
    }
  }
  if (archivos.length > MAX_ARCHIVOS_ALTA || archivos.reduce((n, a) => n + a.tamano, 0) > MAX_BYTES_ALTA) return { ok: false, error: ERROR_CUPO };
  for (const campo of CAMPOS_ALTA) {
    if (campo.tipo === "archivos" && campo.obligatorio && campo.archivo && !archivos.some((a) => a.campo === campo.archivo)) {
      return { ok: false, error: `Falta «${campo.etiqueta}»: sube al menos un archivo.` };
    }
  }
  const siguen = new Set(archivos.map((a) => a.ruta));
  return { ok: true, archivos, nuevas, quitados: alta.archivos.map((a) => a.ruta).filter((r) => !siguen.has(r)) };
}

/** Guarda el formulario (sustituye un envío anterior) y avisa a Dinkbit. */
export async function enviarAltaAction(token: string, respuestas: unknown, archivosEnviados: unknown, conocidas?: unknown): Promise<ResultadoAccion> {
  let alta = await altaActiva(token);
  if (!alta) return NO_VALIDO;
  const leidas = leerRespuestasAlta(respuestas);
  if (!leidas.ok) return leidas;

  // Dos intentos: si otra pestaña ha enviado a la vez, se vuelve a leer lo
  // guardado y se decide de nuevo qué se queda y qué se borra.
  for (let intento = 0; ; intento++) {
    const leidos = await leerArchivos(alta, archivosEnviados, conocidas);
    if (!leidos.ok) return leidos;
    const guardado = await guardarEnvioAlta(alta.id, { respuestas: leidas.datos, archivos: leidos.archivos }, alta.enviada_en);
    if (!guardado.ok) {
      if (!("conflicto" in guardado) || intento >= 1) return { ok: false, error: guardado.error };
      alta = await altaActiva(token);
      if (!alta) return NO_VALIDO;
      continue;
    }
    // Lo que el cliente ha quitado se borra del bucket (sin que pueda fallar el envío).
    try {
      if (leidos.quitados.length) await borrarArchivos(leidos.quitados);
    } catch (error) {
      console.error("[altas] no se pudieron borrar los archivos quitados", error);
    }
    await soltarPendientes(alta.id, leidos.nuevas);
    try {
      await avisarAltaEnviada({ id: alta.id, cliente: alta.cliente, primeraVez: !alta.enviada_en, archivos: leidos.archivos.length });
    } catch (error) {
      console.error("[altas] aviso por correo", error);
    }
    return { ok: true };
  }
}

/**
 * El cliente quita un archivo que acaba de subir: se borra ya del bucket. Solo
 * rutas de SU alta. Los que ya estaban guardados en un envío anterior no se
 * tocan aquí: se borran al reenviar sin ellos, para que el panel no se quede
 * con un enlace roto si el cliente no llega a reenviar.
 */
export async function quitarArchivoAction(token: string, ruta: string): Promise<ResultadoAccion> {
  const alta = await altaActiva(token);
  if (!alta) return NO_VALIDO;
  if (!rutaEsDelAlta(ruta, alta.id)) return { ok: false, error: "Archivo no válido." };
  if (alta.archivos.some((a) => a.ruta === ruta)) return { ok: true };
  await borrarArchivos([ruta]);
  await soltarPendientes(alta.id, [ruta]);
  return { ok: true };
}
