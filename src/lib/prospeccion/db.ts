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
 *  cuántas eran realmente nuevas. */
export async function guardarProspectos(
  searchId: string,
  nuevos: ProspectoNuevo[],
): Promise<number> {
  if (nuevos.length === 0) return 0;
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const filas = nuevos.map((p) => ({ ...p, search_id: searchId, status: "nuevo" }));
  const { data, error } = await sb
    .from(PROSPECTOS)
    .upsert(filas, { onConflict: "source,external_id", ignoreDuplicates: true })
    .select("id");
  if (error) {
    aviso("guardarProspectos", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function listarProspectos(limit = 2000): Promise<ProspectRow[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from(PROSPECTOS)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    aviso("listarProspectos", error.message);
    return [];
  }
  return (data ?? []) as ProspectRow[];
}

export async function prospectosPorIds(ids: string[]): Promise<ProspectRow[]> {
  if (ids.length === 0) return [];
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb.from(PROSPECTOS).select("*").in("id", ids);
  if (error) {
    aviso("prospectosPorIds", error.message);
    return [];
  }
  return (data ?? []) as ProspectRow[];
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
 *  (para que no cuente en el tope diario) y con el error a la vista. */
export async function revertirEnvio(id: string, motivo: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ status: "listo", sent_at: null, send_error: motivo })
    .eq("id", id)
    .eq("status", "enviado");
  if (error) aviso("revertirEnvio", error.message);
}

export async function enviadosDesde(desde: Date): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  const { count, error } = await sb
    .from(PROSPECTOS)
    .select("id", { count: "exact", head: true })
    .gte("sent_at", desde.toISOString());
  if (error) {
    aviso("enviadosDesde", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function marcarEstado(ids: string[], status: EstadoProspecto): Promise<void> {
  if (ids.length === 0) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(PROSPECTOS).update({ status }).in("id", ids);
  if (error) aviso("marcarEstado", error.message);
}

/** Marca el prospecto al que se le mandó ese mensaje de Resend. Devuelve su
 *  email (para añadirlo a la lista de supresión) o null si el mensaje no era de
 *  prospección. */
export async function marcarPorResendId(
  resendId: string,
  status: "rebotado" | "baja",
): Promise<string | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from(PROSPECTOS)
    .update({ status })
    .eq("resend_id", resendId)
    .select("email");
  if (error) {
    aviso("marcarPorResendId", error.message);
    return null;
  }
  return (data as Array<{ email: string | null }> | null)?.[0]?.email ?? null;
}

export async function enlazarLead(id: string, leadId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from(PROSPECTOS)
    .update({ lead_id: leadId, status: "respondido" })
    .eq("id", id);
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

/** Emails y dominios vetados, en minúsculas. */
export async function listarSuprimidos(): Promise<Set<string>> {
  const sb = getSupabaseAdmin();
  if (!sb) return new Set();
  const { data, error } = await sb.from(SUPRESIONES).select("value").limit(10000);
  if (error) {
    aviso("listarSuprimidos", error.message);
    return new Set();
  }
  return new Set(((data ?? []) as Array<{ value: string }>).map((f) => f.value));
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

export async function borrarPlantilla(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from(PLANTILLAS).delete().eq("id", id);
  if (error) aviso("borrarPlantilla", error.message);
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
