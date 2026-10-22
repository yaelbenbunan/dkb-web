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
import { borrarArchivos, firmarSubida, getAltaPorToken, guardarEnvioAlta, infoArchivo, usoAlta, type AltaCliente } from "@/lib/altas/db";
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

export type SubidaFirmada = { ok: true; ruta: string; url: string } | { ok: false; error: string };

/** Firma la subida directa de UN archivo al bucket privado, si el token vale
 *  y el archivo es de un tipo y tamaño permitidos para ese campo. */
export async function pedirSubidaAction(token: string, archivo: { campo: string; nombre: string; tamano: number; tipo: string }): Promise<SubidaFirmada> {
  if (!archivo || typeof archivo !== "object") return { ok: false, error: "Archivo no válido." };
  const alta = await altaActiva(token);
  if (!alta) return NO_VALIDO;
  const v = validarArchivo(archivo.campo, archivo.nombre, archivo.tamano, archivo.tipo);
  if (!v.ok) return v;
  // Cupo del alta (40 archivos, 1 GB), contando lo que ya hay en el bucket.
  if (!cabeEnElCupo(await usoAlta(alta), archivo.tamano)) return { ok: false, error: ERROR_CUPO };
  const ruta = construirRuta(alta.id, archivo.campo as NombreCampoArchivo, archivo.nombre, crypto.randomUUID());
  const firmada = await firmarSubida(ruta);
  return firmada.ok ? { ok: true, ruta, url: firmada.url } : firmada;
}

type ArchivoEnviado = { campo: string; ruta: string; nombre: string };

/** Comprueba la lista de archivos que manda el navegador. Los ya guardados se
 *  conservan tal cual; los nuevos tienen que estar de verdad en el bucket. */
async function leerArchivos(alta: AltaCliente, lista: unknown): Promise<{ ok: true; archivos: ArchivoAlta[] } | { ok: false; error: string }> {
  if (!Array.isArray(lista) || lista.length > MAX_ARCHIVOS_ALTA) return { ok: false, error: "La lista de archivos no es válida." };
  const guardados = new Map(alta.archivos.map((a) => [a.ruta, a]));
  const vistas = new Set<string>();
  const archivos: ArchivoAlta[] = [];
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
    if (!info) return { ok: false, error: `«${nombre}» no se llegó a subir. Quítalo y vuelve a añadirlo.` };
    if (info.tamano > MAX_BYTES_ARCHIVO) {
      await borrarArchivos([item.ruta]);
      return { ok: false, error: `«${nombre}» pesa más de 50 MB. Para archivos grandes, pega un enlace de Drive o WeTransfer.` };
    }
    archivos.push({ campo: item.campo, ruta: item.ruta, nombre, tamano: info.tamano, tipo: info.tipo });
  }
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
  return { ok: true, archivos };
}

/** Guarda el formulario (sustituye un envío anterior) y avisa a Dinkbit. */
export async function enviarAltaAction(token: string, respuestas: unknown, archivosEnviados: unknown): Promise<ResultadoAccion> {
  const alta = await altaActiva(token);
  if (!alta) return NO_VALIDO;
  const leidas = leerRespuestasAlta(respuestas);
  if (!leidas.ok) return leidas;
  const leidos = await leerArchivos(alta, archivosEnviados);
  if (!leidos.ok) return leidos;

  const guardado = await guardarEnvioAlta(alta.id, { respuestas: leidas.datos, archivos: leidos.archivos });
  if (!guardado.ok) return guardado;

  // Lo que el cliente ha quitado se borra del bucket (sin que pueda fallar el envío).
  const siguen = new Set(leidos.archivos.map((a) => a.ruta));
  const quitados = alta.archivos.map((a) => a.ruta).filter((r) => !siguen.has(r));
  try {
    if (quitados.length) await borrarArchivos(quitados);
  } catch (error) {
    console.error("[altas] no se pudieron borrar los archivos quitados", error);
  }
  try {
    await avisarAltaEnviada({ id: alta.id, cliente: alta.cliente, primeraVez: !alta.enviada_en, archivos: leidos.archivos.length });
  } catch (error) {
    console.error("[altas] aviso por correo", error);
  }
  return { ok: true };
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
  return { ok: true };
}
