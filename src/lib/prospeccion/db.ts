import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import type {
  EstadoProspecto,
  FuenteProspecto,
  ProspectRow,
  ProspectSearchRow,
  ProspectTemplateRow,
  ProspectoNuevo,
  TipoEmail,
} from "./tipos";

const BUSQUEDAS = "prospect_searches";
const PROSPECTOS = "prospects";
const PLANTILLAS = "prospect_templates";
const SUPRESIONES = "prospect_suppressions";
const LEADS = "imagina_leads";

function aviso(donde: string, mensaje: string) {
  console.error(`[prospeccion] ${donde}: ${mensaje}`);
}

// Búsquedas ---------------------------------------------------------------

export async function crearBusqueda(
  source: FuenteProspecto,
  params: Record<string, string>,
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from(BUSQUEDAS).insert({ source, params }).select("id");
  if (error) {
    aviso("crearBusqueda", error.message);
    return null;
  }
  return (data as Array<{ id: string }> | null)?.[0]?.id ?? null;
}

export async function cerrarBusqueda(
  id: string,
  cierre: { status: "lista" | "error"; total?: number; error?: string },
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(BUSQUEDAS)
    .update({ status: cierre.status, total: cierre.total ?? 0, error: cierre.error ?? null })
    .eq("id", id);
  if (error) aviso("cerrarBusqueda", error.message);
}

export async function listarBusquedas(limit = 50): Promise<ProspectSearchRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(BUSQUEDAS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    aviso("listarBusquedas", error.message);
    return [];
  }
  return (data ?? []) as ProspectSearchRow[];
}

// Prospectos --------------------------------------------------------------

/** Guarda las empresas de una búsqueda. Las que ya existían (misma fuente e
 *  identificador) no se tocan: conservan su estado y su historial de envío, así
 *  que una empresa ya contactada no vuelve a aparecer como nueva. Devuelve
 *  cuántas eran realmente nuevas, o null si no se pudieron guardar. */
export async function guardarProspectos(
  searchId: string,
  nuevos: ProspectoNuevo[],
): Promise<number | null> {
  if (nuevos.length === 0) return 0;
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const filas = nuevos.map((p) => ({ ...p, search_id: searchId, status: "nuevo" }));
  const { data, error } = await sb
    .from(PROSPECTOS)
    .upsert(filas, { onConflict: "source,external_id", ignoreDuplicates: true })
    .select("id");
  if (error) {
    aviso("guardarProspectos", error.message);
    return null;
  }
  return data?.length ?? 0;
}

const PAGINA = 1000;
const MAX_LISTA = 5000;
/** Ids por consulta: un `.in()` viaja en la URL y con cientos de uuid no cabe. */
const TROZO_IDS = 100;

function trocear<T>(lista: T[], n: number): T[][] {
  const trozos: T[][] = [];
  for (let i = 0; i < lista.length; i += n) trozos.push(lista.slice(i, i + n));
  return trozos;
}

/** Las empresas más recientes, hasta 5000. Se leen por páginas porque PostgREST
 *  no devuelve más de 1000 filas por consulta por mucho que se le pidan; el
 *  segundo orden (`id`) evita que una fila salte de página entre dos lecturas.
 *  Si una página falla se devuelve lo leído hasta ahí. */
export async function listarProspectos(max = MAX_LISTA): Promise<ProspectRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const filas: ProspectRow[] = [];
  while (filas.length < max) {
    const { data, error } = await sb
      .from(PROSPECTOS)
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(filas.length, filas.length + PAGINA - 1);
    if (error) {
      aviso("listarProspectos", error.message);
      break;
    }
    const pagina = (data ?? []) as ProspectRow[];
    if (pagina.length === 0) break;
    filas.push(...pagina);
  }
  return filas.slice(0, max);
}

export async function prospectosPorIds(ids: string[]): Promise<ProspectRow[]> {
  if (ids.length === 0) return [];
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const filas: ProspectRow[] = [];
  for (const trozo of trocear(ids, TROZO_IDS)) {
    const { data, error } = await sb.from(PROSPECTOS).select("*").in("id", trozo);
    if (error) {
      aviso("prospectosPorIds", error.message);
      return [];
    }
    filas.push(...((data ?? []) as ProspectRow[]));
  }
  return filas;
}

export async function getProspecto(id: string): Promise<ProspectRow | null> {
  return (await prospectosPorIds([id]))[0] ?? null;
}

export async function pendientesDeEnriquecer(searchId: string, limit: number): Promise<ProspectRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(PROSPECTOS)
    .select("*")
    .eq("search_id", searchId)
    .eq("status", "nuevo")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    aviso("pendientesDeEnriquecer", error.message);
    return [];
  }
  return (data ?? []) as ProspectRow[];
}

export async function contarPendientes(searchId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const { count, error } = await sb
    .from(PROSPECTOS)
    .select("id", { count: "exact", head: true })
    .eq("search_id", searchId)
    .eq("status", "nuevo");
  if (error) {
    aviso("contarPendientes", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function guardarEnriquecimiento(
  id: string,
  r: { email: string | null; tipo: TipoEmail | null; nota: string | null },
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({
      email: r.email,
      email_kind: r.tipo,
      contact_note: r.nota,
      status: r.email ? "listo" : "sin_contacto",
      enriched_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "nuevo");
  if (error) aviso("guardarEnriquecimiento", error.message);
}

/** Reclama la fila para enviarle un correo. El `where status = 'listo'` es lo
 *  que impide el doble envío: de dos peticiones simultáneas solo una actualiza
 *  la fila; la otra recibe cero filas y se retira. */
export async function reclamarParaEnvio(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { data, error } = await sb
    .from(PROSPECTOS)
    .update({ status: "enviado", sent_at: new Date().toISOString(), send_error: null })
    .eq("id", id)
    .eq("status", "listo")
    .select("id");
  if (error) {
    aviso("reclamarParaEnvio", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function registrarEnvio(
  id: string,
  envio: { resendId: string | null; templateId: string },
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ resend_id: envio.resendId, template_id: envio.templateId })
    .eq("id", id);
  if (error) aviso("registrarEnvio", error.message);
}

/** Deshace un reclamo cuyo envío falló: vuelve a «listo», sin fecha de envío
 *  (para que no cuente en el tope diario) y con el error a la vista, si lo hay.
 *  Con `motivo` null, la fila se libera sin rastro de error. */
export async function revertirEnvio(id: string, motivo: string | null): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ status: "listo", sent_at: null, send_error: motivo })
    .eq("id", id)
    .eq("status", "enviado");
  if (error) aviso("revertirEnvio", error.message);
}

/** Anota que no se sabe si el correo salió (la llamada a Resend lanzó, se quedó
 *  sin respuesta o devolvió un 5xx). No toca
 *  el estado ni `sent_at`: la fila sigue «enviado» para no escribir dos veces. */
export async function anotarEnvioIncierto(id: string, detalle: string, templateId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ send_error: `Resultado incierto: ${detalle}`, template_id: templateId })
    .eq("id", id);
  if (error) aviso("anotarEnvioIncierto", error.message);
}

/** Envíos desde `desde`; null si no se pudo contar (quien decide no debe
 *  tomarlo por cero). */
export async function enviadosDesde(desde: Date): Promise<number | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { count, error } = await sb
    .from(PROSPECTOS)
    .select("id", { count: "exact", head: true })
    .gte("sent_at", desde.toISOString());
  if (error) {
    aviso("enviadosDesde", error.message);
    return null;
  }
  return count ?? 0;
}

/** ¿Se escribió ya a esa dirección desde cualquier ficha? null si no se pudo
 *  comprobar. */
export async function yaContactado(email: string): Promise<boolean | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const patron = email.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await sb
    .from(PROSPECTOS)
    .select("id")
    .ilike("email", patron)
    .not("sent_at", "is", null)
    .limit(1);
  if (error) {
    aviso("yaContactado", error.message);
    return null;
  }
  return (data?.length ?? 0) > 0;
}

/** Cambia el estado de los prospectos. Con `desde`, solo los que están ahora en
 *  uno de esos estados; sin él, aplica desde cualquiera (la baja lo necesita).
 *  Devuelve cuántas filas cambió de verdad, o null si algún trozo falló (los
 *  demás trozos se intentan igualmente). */
export async function marcarEstado(
  ids: string[],
  status: EstadoProspecto,
  desde?: EstadoProspecto[],
): Promise<number | null> {
  if (ids.length === 0) return 0;
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  let cambiadas = 0;
  let fallo = false;
  for (const trozo of trocear(ids, TROZO_IDS)) {
    let consulta = sb.from(PROSPECTOS).update({ status }).in("id", trozo);
    if (desde) consulta = consulta.in("status", desde);
    const { data, error } = await consulta.select("id");
    if (error) {
      aviso("marcarEstado", error.message);
      fallo = true;
      continue;
    }
    cambiadas += data?.length ?? 0;
  }
  return fallo ? null : cambiadas;
}

/** Marca el prospecto al que se le mandó ese mensaje de Resend. Devuelve su
 *  email (para añadirlo a la lista de supresión) o null si el mensaje no era de
 *  prospección. El estado solo cambia si la fila sigue en «enviado»: un rebote
 *  tardío no debe pisar a quien ya respondió. El email se devuelve igualmente. */
export async function marcarPorResendId(
  resendId: string,
  status: "rebotado" | "baja",
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from(PROSPECTOS)
    .select("email")
    .eq("resend_id", resendId)
    .limit(1);
  if (error) {
    aviso("marcarPorResendId", error.message);
    return null;
  }
  const fila = (data as Array<{ email: string | null }> | null)?.[0];
  if (!fila) return null;
  const { error: errorUpdate } = await sb
    .from(PROSPECTOS)
    .update({ status })
    .eq("resend_id", resendId)
    .eq("status", "enviado");
  if (errorUpdate) aviso("marcarPorResendId", errorUpdate.message);
  return fila.email ?? null;
}

/** Enlaza el prospecto con su lead del CRM. Solo desde «enviado» o
 *  «respondido»: una pestaña desactualizada no debe convertir una baja o un
 *  rebote en «respondió». */
export async function enlazarLead(id: string, leadId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ lead_id: leadId, status: "respondido" })
    .eq("id", id)
    .in("status", ["enviado", "respondido"]);
  if (error) aviso("enlazarLead", error.message);
}

// Supresión ---------------------------------------------------------------

export async function suprimir(
  valor: string,
  kind: "email" | "dominio",
  reason: "baja" | "rebote" | "queja" | "manual",
): Promise<void> {
  const value = valor.trim().toLowerCase();
  if (!value) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(SUPRESIONES)
    .upsert([{ value, kind, reason }], { onConflict: "value", ignoreDuplicates: true });
  if (error) aviso("suprimir", error.message);
}

/** Lee todas las filas de una columna, de 1000 en 1000: el máximo por defecto
 *  de PostgREST recortaría en silencio una lista más larga. Solo una página
 *  vacía marca el final: si el servidor devuelve menos filas de las pedidas,
 *  una página corta no es la última, y dar la lista de bajas por completa ahí
 *  sería fallar en abierto. null si falla. */
async function leerColumna(tabla: string, columna: string, donde: string): Promise<string[] | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const valores: string[] = [];
  for (let desde = 0; ; ) {
    const { data, error } = await sb
      .from(tabla)
      .select(columna)
      .order(columna)
      .range(desde, desde + PAGINA - 1);
    if (error) {
      aviso(donde, error.message);
      return null;
    }
    const filas = (data ?? []) as unknown as Array<Record<string, string | null>>;
    if (filas.length === 0) return valores;
    for (const f of filas) if (f[columna]) valores.push(f[columna] as string);
    desde += filas.length;
  }
}

/** Emails y dominios vetados, en minúsculas; null si no se pudo leer la lista. */
export async function listarSuprimidos(): Promise<Set<string> | null> {
  const v = await leerColumna(SUPRESIONES, "value", "listarSuprimidos");
  return v && new Set(v.map((x) => x.trim().toLowerCase()));
}

/** Emails de todos los leads del CRM, en minúsculas; null si no se pudo leer. */
export async function emailsDeLeads(): Promise<Set<string> | null> {
  const v = await leerColumna(LEADS, "email", "emailsDeLeads");
  return v && new Set(v.map((x) => x.trim().toLowerCase()).filter(Boolean));
}

// Plantillas --------------------------------------------------------------

export async function listarPlantillas(): Promise<ProspectTemplateRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(PLANTILLAS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    aviso("listarPlantillas", error.message);
    return [];
  }
  return (data ?? []) as ProspectTemplateRow[];
}

export async function getPlantilla(id: string): Promise<ProspectTemplateRow | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from(PLANTILLAS).select("*").eq("id", id).limit(1);
  if (error) {
    aviso("getPlantilla", error.message);
    return null;
  }
  return ((data ?? []) as ProspectTemplateRow[])[0] ?? null;
}

export async function guardarPlantilla(p: {
  id?: string;
  name: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const campos = { name: p.name, subject: p.subject, body: p.body, updated_at: new Date().toISOString() };
  const { error } = p.id
    ? await sb.from(PLANTILLAS).update(campos).eq("id", p.id)
    : await sb.from(PLANTILLAS).insert(campos);
  if (error) {
    aviso("guardarPlantilla", error.message);
    return false;
  }
  return true;
}

export async function borrarPlantilla(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from(PLANTILLAS).delete().eq("id", id);
  if (error) {
    aviso("borrarPlantilla", error.message);
    return false;
  }
  return true;
}

// Leads del CRM -----------------------------------------------------------

/** Id del lead del CRM con ese email, si existe (sin distinguir mayúsculas). */
export async function buscarLeadPorEmail(email: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb.from(LEADS).select("id").ilike("email", email.trim()).limit(1);
  if (error) {
    aviso("buscarLeadPorEmail", error.message);
    return null;
  }
  return (data as Array<{ id: string }> | null)?.[0]?.id ?? null;
}
