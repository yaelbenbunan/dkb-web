import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import { ErrorLectura, FALTA_EN_LA_BASE, tolerarMigracionPendiente } from "../ventas/db";
import { BUCKET_ALTAS, CAMPOS_ARCHIVO, type ArchivoAlta } from "./archivos";
import { leerPendientes, type FirmaPendiente, type UsoBucket } from "./pendientes";
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
  /** Reservas de subida (ver pendientes.ts) y su contador de revisión. Sin la columna, no vienen. */
  subidas_pendientes?: unknown;
  pendientes_rev?: number;
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

export type GuardadoEnvio = { ok: true } | { ok: false; error: string; conflicto?: true };

/**
 * Guarda el envío SOLO si nadie ha enviado entretanto (`enviada_en` sigue
 * siendo el que se leyó). Así, dos pestañas que envían a la vez no se pisan:
 * la segunda recibe `conflicto` y vuelve a leer antes de decidir qué borrar.
 */
export async function guardarEnvioAlta(
  id: string,
  envio: { respuestas: RespuestasAlta; archivos: ArchivoAlta[] },
  enviadaPrevia: string | null,
): Promise<GuardadoEnvio> {
  let consulta = sb()
    .from(TABLA)
    .update({ respuestas: envio.respuestas, archivos: envio.archivos, enviada_en: new Date().toISOString() })
    .eq("id", id)
    // Si entretanto se desactivó el enlace, no se guarda.
    .eq("activa", true);
  consulta = enviadaPrevia === null ? consulta.is("enviada_en", null) : consulta.eq("enviada_en", enviadaPrevia);
  const r = await consulta.select("id");
  if (r.error) return falloEscritura(r.error, "guardarEnvioAlta") as { ok: false; error: string };
  if (!r.data?.length) return { ok: false, error: "Se ha enviado el formulario desde otra ventana a la vez. Vuelve a intentarlo.", conflicto: true };
  return { ok: true };
}

/* Firmas pendientes ---------------------------------------------------------- */

let avisadoSinColumna = false;
function sinColumna(contexto: string, mensaje: string) {
  if (avisadoSinColumna) return;
  avisadoSinColumna = true;
  console.error(`[altas/db] ${contexto}: faltan las columnas subidas_pendientes / pendientes_rev (${SQL_ALTAS}); el tope solo mira el bucket.`, mensaje);
}

export type CambioPendientes = { ok: true; pendientes: FirmaPendiente[] } | { ok: false; error: string };
export type ResultadoPendientes = { estado: "ok" } | { estado: "rechazo"; error: string } | { estado: "sin_columna" } | { estado: "error" };

/**
 * Lee las reservas del alta y su revisión, aplica `cambio` y escribe solo si
 * nadie ha escrito entretanto (`pendientes_rev` sigue igual; se incrementa).
 * Si otra petición se ha adelantado, vuelve a leer y lo intenta una vez más.
 */
export async function modificarPendientes(altaId: string, cambio: (lista: FirmaPendiente[]) => CambioPendientes): Promise<ResultadoPendientes> {
  for (let intento = 0; intento < 2; intento++) {
    const leida = await sb().from(TABLA).select("subidas_pendientes, pendientes_rev").eq("id", altaId).maybeSingle();
    if (leida.error) {
      if (leida.error.code && FALTA_EN_LA_BASE.has(leida.error.code)) {
        sinColumna("modificarPendientes", leida.error.message);
        return { estado: "sin_columna" };
      }
      console.error("[altas/db] modificarPendientes (lectura):", leida.error.message);
      return { estado: "error" };
    }
    if (!leida.data) return { estado: "error" };
    const fila = leida.data as { subidas_pendientes: unknown; pendientes_rev: unknown };
    const rev = Number(fila.pendientes_rev);
    if (!Number.isInteger(rev)) return { estado: "error" };
    const r = cambio(leerPendientes(fila.subidas_pendientes ?? []) ?? []);
    if (!r.ok) return { estado: "rechazo", error: r.error };
    const escrita = await sb()
      .from(TABLA)
      .update({ subidas_pendientes: r.pendientes, pendientes_rev: rev + 1 })
      .eq("id", altaId)
      .eq("pendientes_rev", rev)
      .select("id");
    if (escrita.error) {
      if (escrita.error.code && FALTA_EN_LA_BASE.has(escrita.error.code)) {
        sinColumna("modificarPendientes", escrita.error.message);
        return { estado: "sin_columna" };
      }
      console.error("[altas/db] modificarPendientes (escritura):", escrita.error.message);
      return { estado: "error" };
    }
    if (escrita.data?.length) return { estado: "ok" };
  }
  return { estado: "error" };
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
export async function usoAlta(alta: Pick<AltaCliente, "id" | "archivos">): Promise<UsoBucket> {
  const secciones = [...new Set(Object.values(CAMPOS_ARCHIVO).map((c) => c.seccion))];
  try {
    const rutas: string[] = [];
    let bytes = 0;
    for (const seccion of secciones) {
      const r = await sb().storage.from(BUCKET_ALTAS).list(`${alta.id}/${seccion}`, { limit: 1000 });
      if (r.error) throw new Error(r.error.message);
      for (const o of r.data ?? []) {
        if (!o.id) continue; // carpetas
        rutas.push(`${alta.id}/${seccion}/${o.name}`);
        bytes += Number((o.metadata as { size?: number } | null)?.size ?? 0);
      }
    }
    return { archivos: rutas.length, bytes, rutas };
  } catch (error) {
    console.error("[altas/db] usoAlta: se cuenta solo lo guardado.", error);
    return {
      archivos: alta.archivos.length,
      bytes: alta.archivos.reduce((n, a) => n + (Number(a.tamano) || 0), 0),
      rutas: alta.archivos.map((a) => a.ruta),
    };
  }
}

export type InfoArchivo = { estado: "ok"; tamano: number; tipo: string } | { estado: "no_existe" } | { estado: "error" };

/** Tamaño y tipo reales del archivo ya subido. Solo un «no existe» de verdad
 *  cuenta como que no se subió; cualquier otro fallo es «no se ha podido mirar». */
export async function infoArchivo(ruta: string): Promise<InfoArchivo> {
  const r = await sb().storage.from(BUCKET_ALTAS).info(ruta);
  if (r.data) return { estado: "ok", tamano: Number(r.data.size ?? 0), tipo: String(r.data.contentType ?? "") };
  const e = (r.error ?? {}) as { message?: string; status?: number; statusCode?: string | number };
  if (e.status === 404 || String(e.statusCode) === "404" || /not.?found/i.test(e.message ?? "")) return { estado: "no_existe" };
  console.error("[altas/db] infoArchivo:", e.message);
  return { estado: "error" };
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
