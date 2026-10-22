import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import { ErrorLectura, FALTA_EN_LA_BASE, tolerarMigracionPendiente } from "../ventas/db";
import { BUCKET_ALTAS, CAMPOS_ARCHIVO, type ArchivoAlta } from "./archivos";
import type { RespuestasAlta } from "./preguntas";
import { esFormatoTokenAlta } from "./token";

/**
 * Altas de clientes: tabla `alta_clientes` y bucket privado `altas-clientes`,
 * los dos solo con la clave de servicio (RLS sin políticas). Se crean con
 * docs/sql/2026-10-22-alta-clientes.sql, que ejecuta Yael a mano: hasta
 * entonces las lecturas devuelven «falta la migración» en vez de tumbar el
 * panel, y el enlace público responde como un enlace no válido.
 */

export const SQL_ALTAS = "docs/sql/2026-10-22-alta-clientes.sql";
const TABLA = "alta_clientes";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AltaCliente {
  id: string;
  token: string;
  cliente: string;
  activa: boolean;
  respuestas: RespuestasAlta;
  archivos: ArchivoAlta[];
  enviada_en: string | null;
  created_at: string;
  creada_por: string | null;
}

export type Escritura = { ok: true } | { ok: false; error: string };

function sb() {
  const cliente = getSupabaseAdmin();
  if (!cliente) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return cliente;
}

function leer<T>(r: { data: T | null; error: { message: string; code?: string } | null }, contexto: string): T | null {
  if (r.error) throw new ErrorLectura(`[altas/db] ${contexto}: ${r.error.message}`, r.error.code);
  return r.data;
}

function normalizar(fila: AltaCliente): AltaCliente {
  return {
    ...fila,
    respuestas: fila.respuestas && typeof fila.respuestas === "object" ? fila.respuestas : {},
    archivos: Array.isArray(fila.archivos) ? fila.archivos : [],
  };
}

function falloEscritura(error: { message: string; code?: string }, contexto: string): Escritura {
  console.error(`[altas/db] ${contexto}:`, error.message);
  if (error.code && FALTA_EN_LA_BASE.has(error.code)) return { ok: false, error: `Falta ejecutar ${SQL_ALTAS} en Supabase.` };
  return { ok: false, error: "No se pudo guardar. Vuelve a intentarlo." };
}

/** Solo por token: es lo único que sabe quien abre el enlace. Sin la tabla, null. */
export async function getAltaPorToken(token: string): Promise<AltaCliente | null> {
  if (!esFormatoTokenAlta(token)) return null;
  const fila = await tolerarMigracionPendiente(
    async () => leer(await sb().from(TABLA).select("*").eq("token", token).maybeSingle(), "getAltaPorToken") as AltaCliente | null,
    () => null,
    "getAltaPorToken",
  );
  return fila ? normalizar(fila) : null;
}

export async function getAltaPorId(id: string): Promise<AltaCliente | null> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return null;
  const fila = await tolerarMigracionPendiente(
    async () => leer(await sb().from(TABLA).select("*").eq("id", id).maybeSingle(), "getAltaPorId") as AltaCliente | null,
    () => null,
    "getAltaPorId",
  );
  return fila ? normalizar(fila) : null;
}

export type ListaAltas = { estado: "ok"; altas: AltaCliente[] } | { estado: "falta_migracion" };

export async function listAltas(): Promise<ListaAltas> {
  return tolerarMigracionPendiente<ListaAltas>(
    async () => {
      const filas = (leer(await sb().from(TABLA).select("*").order("created_at", { ascending: false }), "listAltas") as AltaCliente[] | null) ?? [];
      return { estado: "ok", altas: filas.map(normalizar) };
    },
    () => ({ estado: "falta_migracion" }),
    "listAltas",
  );
}

export async function crearAlta(a: { cliente: string; token: string; creadaPor: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const r = await sb().from(TABLA).insert({ cliente: a.cliente, token: a.token, creada_por: a.creadaPor }).select("id").single();
  if (r.error) return falloEscritura(r.error, "crearAlta") as { ok: false; error: string };
  return { ok: true, id: (r.data as { id: string }).id };
}

export async function setAltaActiva(id: string, activa: boolean): Promise<Escritura> {
  const r = await sb().from(TABLA).update({ activa }).eq("id", id);
  return r.error ? falloEscritura(r.error, "setAltaActiva") : { ok: true };
}

export async function guardarEnvioAlta(id: string, envio: { respuestas: RespuestasAlta; archivos: ArchivoAlta[] }): Promise<Escritura> {
  const r = await sb()
    .from(TABLA)
    .update({ respuestas: envio.respuestas, archivos: envio.archivos, enviada_en: new Date().toISOString() })
    .eq("id", id)
    // Si entretanto se desactivó el enlace, no se guarda.
    .eq("activa", true)
    .select("id");
  if (r.error) return falloEscritura(r.error, "guardarEnvioAlta");
  if (!r.data?.length) return { ok: false, error: "Este enlace ya no está activo." };
  return { ok: true };
}

/* Storage ------------------------------------------------------------------- */

/** URL para que el navegador suba UN archivo a esa ruta (caduca a las 2 h). */
export async function firmarSubida(ruta: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const r = await sb().storage.from(BUCKET_ALTAS).createSignedUploadUrl(ruta);
  if (r.error || !r.data) {
    console.error("[altas/db] firmarSubida:", r.error?.message);
    return { ok: false, error: "No se pudo preparar la subida. Vuelve a intentarlo en un momento." };
  }
  return { ok: true, url: r.data.signedUrl };
}

/**
 * Lo que ocupa de verdad el alta en el bucket: lo guardado más lo subido y aún
 * no enviado. Si el listado falla, cuenta solo lo guardado (y lo deja en el log).
 */
export async function usoAlta(alta: Pick<AltaCliente, "id" | "archivos">): Promise<{ archivos: number; bytes: number }> {
  const secciones = [...new Set(Object.values(CAMPOS_ARCHIVO).map((c) => c.seccion))];
  try {
    let archivos = 0;
    let bytes = 0;
    for (const seccion of secciones) {
      const r = await sb().storage.from(BUCKET_ALTAS).list(`${alta.id}/${seccion}`, { limit: 1000 });
      if (r.error) throw new Error(r.error.message);
      for (const o of r.data ?? []) {
        if (!o.id) continue; // carpetas
        archivos += 1;
        bytes += Number((o.metadata as { size?: number } | null)?.size ?? 0);
      }
    }
    return { archivos, bytes };
  } catch (error) {
    console.error("[altas/db] usoAlta: se cuenta solo lo guardado.", error);
    return { archivos: alta.archivos.length, bytes: alta.archivos.reduce((n, a) => n + (Number(a.tamano) || 0), 0) };
  }
}

/** Tamaño y tipo reales del archivo ya subido; null si no está. */
export async function infoArchivo(ruta: string): Promise<{ tamano: number; tipo: string } | null> {
  const r = await sb().storage.from(BUCKET_ALTAS).info(ruta);
  if (r.error || !r.data) return null;
  return { tamano: Number(r.data.size ?? 0), tipo: String(r.data.contentType ?? "") };
}

export async function borrarArchivos(rutas: string[]): Promise<void> {
  if (!rutas.length) return;
  const r = await sb().storage.from(BUCKET_ALTAS).remove(rutas);
  if (r.error) console.error("[altas/db] borrarArchivos:", r.error.message);
}

/** Enlaces de descarga para el panel: caducan en 1 h y bajan con el nombre original. */
export async function firmarDescargas(archivos: ArchivoAlta[]): Promise<Map<string, string>> {
  const enlaces = new Map<string, string>();
  await Promise.all(
    archivos.map(async (a) => {
      const r = await sb().storage.from(BUCKET_ALTAS).createSignedUrl(a.ruta, 3600, { download: a.nombre || true });
      if (r.data?.signedUrl) enlaces.set(a.ruta, r.data.signedUrl);
      else console.error("[altas/db] firmarDescargas:", r.error?.message);
    }),
  );
  return enlaces;
}
