import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "../supabase-admin";
import {
  FASES_ACTIVAS,
  normalizarEmail,
  normalizarTelefono,
  type EstadoMarca,
  type Fase,
  type Origen,
  type ResultadoLlamada,
  type Rol,
  type TipoActividad,
  type TipoNegocio,
} from "./dominio";
import type { Contacto, LeadNuevo } from "./leads-csv";
import type { Condiciones, NuevaExclusion, NuevaUsuaria } from "./validacion";

/**
 * Acceso a las tablas `ventas_*` con la clave de servicio. Las lecturas lanzan
 * si Supabase falla: un panel que enseña «0 leads» por un error de red
 * engañaría justo en lo que sirve para cobrar. Las escrituras devuelven
 * `{ ok, error }` para enseñar el problema en el formulario.
 */

export interface Usuaria {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activa: boolean;
  created_at: string;
}

export interface Marca {
  id: string;
  nombre: string;
  slug: string;
  estado: EstadoMarca;
  fecha_inicio: string | null;
  cuota_mensual_cts: number;
  comision_pct: number;
  plazo_meses: number | null;
  pago_por_cliente_cts: number;
  skus_b2b: string[];
  webhook_secret: string;
  created_at: string;
}

export interface Exclusion {
  id: string;
  marca_id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  cif: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  marca_id: string;
  negocio: string;
  tipo_negocio: TipoNegocio | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  cif: string | null;
  web: string | null;
  origen: Origen;
  origen_detalle: string | null;
  fase: Fase;
  asignada_a: string | null;
  proximo_seguimiento: string | null;
  codigo_cliente: string;
  excluido: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Cuándo se pasó este lead al embudo del CRM principal (botón "Pasar al
   *  embudo", solo marca dinkbit). null = todavía no. Es la marca real de
   *  idempotencia de ese botón — a propósito, no el texto de una nota, que
   *  una comercial podría escribir a mano y crear un falso positivo. */
  promocionado_at: string | null;
}

export interface Actividad {
  id: string;
  lead_id: string;
  marca_id: string;
  usuaria_id: string | null;
  tipo: TipoActividad;
  resultado: ResultadoLlamada | null;
  nota: string | null;
  datos: Record<string, unknown>;
  created_at: string;
}

export type LeadConMarca = Lead & { marca: { nombre: string; slug: string } | null };

export type Escritura = { ok: true } | { ok: false; error: string };

type Respuesta<T> = { data: T | null; error: { message: string; code?: string } | null };

const PAGINA = 1000;

function db() {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Supabase no está configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return sb;
}

function comprobar<T>(r: Respuesta<T>, contexto: string): T | null {
  if (r.error) throw new Error(`[ventas/db] ${contexto}: ${r.error.message}`);
  return r.data;
}

function escritura(r: { error: { message: string; code?: string } | null }, contexto: string, duplicado?: string): Escritura {
  if (!r.error) return { ok: true };
  console.error(`[ventas/db] ${contexto}:`, r.error.message);
  if (duplicado && r.error.code === "23505") return { ok: false, error: duplicado };
  return { ok: false, error: "No se pudo guardar. Vuelve a intentarlo." };
}

/** Lee todas las filas de una consulta, de PAGINA en PAGINA (PostgREST corta en 1000). */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<Respuesta<T[]>>, contexto: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = comprobar(await consulta(desde, desde + PAGINA - 1), contexto) ?? [];
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

function vacioANull(v: string): string | null {
  return v.trim() ? v.trim() : null;
}

/* Usuarias ------------------------------------------------------------------ */

export async function getUsuaria(id: string): Promise<Usuaria | null> {
  const r = await db().from("ventas_usuarias").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<Usuaria>, "getUsuaria");
}

export async function listUsuarias(): Promise<Usuaria[]> {
  const r = await db().from("ventas_usuarias").select("*").order("nombre");
  return comprobar(r as Respuesta<Usuaria[]>, "listUsuarias") ?? [];
}

export async function crearUsuariaCompleta(u: NuevaUsuaria): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const sb = db();
  const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
  if (error || !data.user) {
    console.error("[ventas/db] crearUsuariaCompleta auth:", error?.message);
    const repetido = /already|registered|exists/i.test(error?.message ?? "");
    return { ok: false, error: repetido ? "Ya existe una cuenta con ese email." : "No se pudo crear la cuenta." };
  }
  const perfil = await sb.from("ventas_usuarias").insert({ id: data.user.id, nombre: u.nombre, email: u.email, rol: u.rol });
  if (perfil.error) {
    // Sin perfil la cuenta no sirve para nada: se deshace para poder reintentar.
    await sb.auth.admin.deleteUser(data.user.id);
    console.error("[ventas/db] crearUsuariaCompleta perfil:", perfil.error.message);
    return { ok: false, error: "No se pudo crear el perfil de la usuaria." };
  }
  return { ok: true, id: data.user.id };
}

export async function setUsuariaActiva(id: string, activa: boolean): Promise<Escritura> {
  const sb = db();
  // Además de marcar el perfil, se bloquea la cuenta en Auth: así no puede ni
  // iniciar sesión, no solo quedarse fuera de las pantallas.
  const auth = await sb.auth.admin.updateUserById(id, { ban_duration: activa ? "none" : "876000h" });
  if (auth.error) return escritura(auth, "setUsuariaActiva auth");
  return escritura(await sb.from("ventas_usuarias").update({ activa }).eq("id", id), "setUsuariaActiva");
}

export async function setPasswordUsuaria(id: string, password: string): Promise<Escritura> {
  return escritura(await db().auth.admin.updateUserById(id, { password }), "setPasswordUsuaria");
}

/* Marcas -------------------------------------------------------------------- */

export async function listMarcas(): Promise<Marca[]> {
  const r = await db().from("ventas_marcas").select("*").order("nombre");
  return comprobar(r as Respuesta<Marca[]>, "listMarcas") ?? [];
}

export async function getMarcaPorSlug(slug: string): Promise<Marca | null> {
  const r = await db().from("ventas_marcas").select("*").eq("slug", slug).maybeSingle();
  return comprobar(r as Respuesta<Marca>, "getMarcaPorSlug");
}

export async function crearMarca(m: { nombre: string; slug: string }): Promise<{ ok: true; marca: Marca } | { ok: false; error: string }> {
  const r = await db().from("ventas_marcas").insert({ nombre: m.nombre, slug: m.slug }).select("*").single();
  if (r.error) {
    const e = escritura(r, "crearMarca", "Ya existe una marca con ese identificador.");
    return e.ok ? { ok: false, error: "No se pudo crear la marca." } : e;
  }
  return { ok: true, marca: r.data as Marca };
}

export async function actualizarCondiciones(id: string, c: Condiciones): Promise<Escritura> {
  return escritura(await db().from("ventas_marcas").update(c).eq("id", id), "actualizarCondiciones");
}

export async function regenerarSecretoWebhook(id: string): Promise<Escritura> {
  const secreto = randomBytes(32).toString("hex");
  return escritura(await db().from("ventas_marcas").update({ webhook_secret: secreto }).eq("id", id), "regenerarSecretoWebhook");
}

/* Exclusiones ------------------------------------------------------------- */

export async function listExclusiones(marcaId: string): Promise<Exclusion[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_exclusiones").select("*").eq("marca_id", marcaId).order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Exclusion[]>>,
    "listExclusiones",
  );
}

export async function crearExclusion(marcaId: string, e: NuevaExclusion, usuariaId: string): Promise<Escritura> {
  return escritura(
    await db().from("ventas_exclusiones").insert({
      marca_id: marcaId,
      nombre: vacioANull(e.nombre),
      email: vacioANull(e.email),
      telefono: vacioANull(e.telefono),
      cif: vacioANull(e.cif),
      created_by: usuariaId,
    }),
    "crearExclusion",
  );
}

export async function borrarExclusion(id: string, marcaId: string): Promise<Escritura> {
  return escritura(await db().from("ventas_exclusiones").delete().eq("id", id).eq("marca_id", marcaId), "borrarExclusion");
}

/* Leads --------------------------------------------------------------------- */

export async function listLeads(marcaId: string, filtro: { fase?: Fase; asignadaA?: string } = {}): Promise<Lead[]> {
  return todas((desde, hasta) => {
    let q = db().from("ventas_leads").select("*").eq("marca_id", marcaId);
    if (filtro.fase) q = q.eq("fase", filtro.fase);
    if (filtro.asignadaA) q = q.eq("asignada_a", filtro.asignadaA);
    return q.order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Lead[]>>;
  }, "listLeads");
}

export async function getLead(id: string): Promise<Lead | null> {
  const r = await db().from("ventas_leads").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<Lead>, "getLead");
}

export async function listContactosLeads(marcaId: string): Promise<Contacto[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_leads").select("email,telefono").eq("marca_id", marcaId).order("id").range(desde, hasta) as PromiseLike<Respuesta<Contacto[]>>,
    "listContactosLeads",
  );
}

export async function buscarLeadPorContacto(marcaId: string, c: Contacto): Promise<Lead | null> {
  const email = normalizarEmail(c.email);
  if (email) {
    const r = await db().from("ventas_leads").select("*").eq("marca_id", marcaId).eq("email_norm", email).maybeSingle();
    const lead = comprobar(r as Respuesta<Lead>, "buscarLeadPorContacto email");
    if (lead) return lead;
  }
  const telefono = normalizarTelefono(c.telefono);
  if (telefono) {
    const r = await db().from("ventas_leads").select("*").eq("marca_id", marcaId).eq("telefono_norm", telefono).maybeSingle();
    return comprobar(r as Respuesta<Lead>, "buscarLeadPorContacto teléfono");
  }
  return null;
}

export async function actualizarDatosLead(id: string, d: LeadNuevo): Promise<Escritura> {
  return escritura(
    await db()
      .from("ventas_leads")
      .update({
        negocio: d.negocio,
        tipo_negocio: d.tipo_negocio,
        contacto: vacioANull(d.contacto),
        telefono: vacioANull(d.telefono),
        email: vacioANull(d.email),
        ciudad: vacioANull(d.ciudad),
        cif: vacioANull(d.cif),
        web: vacioANull(d.web),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id),
    "actualizarDatosLead",
    "Ya hay otro lead de esta marca con ese email o teléfono.",
  );
}

export async function asignarLead(id: string, usuariaId: string | null): Promise<Escritura> {
  return escritura(
    await db().from("ventas_leads").update({ asignada_a: usuariaId, updated_at: new Date().toISOString() }).eq("id", id),
    "asignarLead",
  );
}

/** Marca el lead como ya pasado al embudo principal del CRM (botón "Pasar al
 *  embudo"). No pisa `updated_at`: no es una edición de los datos del lead,
 *  es un hito aparte que solo mira la comprobación de idempotencia. */
export async function marcarLeadPromocionado(id: string): Promise<Escritura> {
  return escritura(
    await db().from("ventas_leads").update({ promocionado_at: new Date().toISOString() }).eq("id", id),
    "marcarLeadPromocionado",
  );
}

/* RPC ----------------------------------------------------------------------- */

export async function crearLeads(input: {
  marcaId: string;
  usuariaId: string | null;
  origen: Origen;
  origenDetalle: string | null;
  leads: Array<LeadNuevo & { excluido: boolean }>;
}): Promise<{ ok: true; creados: number } | { ok: false; error: string }> {
  const { data, error } = await db().rpc("ventas_crear_leads", {
    p_marca_id: input.marcaId,
    p_usuaria_id: input.usuariaId,
    p_origen: input.origen,
    p_origen_detalle: input.origenDetalle,
    p_leads: input.leads.map((l) => ({
      negocio: l.negocio,
      tipo_negocio: l.tipo_negocio,
      contacto: l.contacto,
      telefono: l.telefono,
      email: l.email,
      ciudad: l.ciudad,
      cif: l.cif,
      web: l.web,
      excluido: l.excluido,
    })),
  });
  if (error) {
    console.error("[ventas/db] crearLeads:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, creados: Number(data ?? 0) };
}

export async function registrarActividad(input: {
  leadId: string;
  usuariaId: string | null;
  tipo: TipoActividad;
  resultado?: ResultadoLlamada | null;
  nota?: string | null;
  faseNueva?: Fase | null;
  proximoSeguimiento?: string | null;
}): Promise<Escritura> {
  const cambiarSeguimiento = input.proximoSeguimiento !== undefined;
  const { error } = await db().rpc("ventas_registrar_actividad", {
    p_lead_id: input.leadId,
    p_usuaria_id: input.usuariaId,
    p_tipo: input.tipo,
    p_resultado: input.resultado ?? null,
    p_nota: input.nota ?? null,
    p_fase_nueva: input.faseNueva ?? null,
    p_cambiar_seguimiento: cambiarSeguimiento,
    p_proximo_seguimiento: cambiarSeguimiento ? input.proximoSeguimiento : null,
  });
  return escritura({ error }, "registrarActividad");
}

/* Actividad ----------------------------------------------------------------- */

export async function listActividadLead(leadId: string): Promise<Actividad[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_actividad").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Actividad[]>>,
    "listActividadLead",
  );
}

export async function listActividadMarca(marcaId: string, desde: string, hasta: string): Promise<Actividad[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_actividad")
        .select("*")
        .eq("marca_id", marcaId)
        .gte("created_at", desde)
        .lt("created_at", hasta)
        .order("created_at")
        .range(d, h) as PromiseLike<Respuesta<Actividad[]>>,
    "listActividadMarca",
  );
}

export async function listCambiosFaseMarca(marcaId: string): Promise<{ lead_id: string; datos: Record<string, unknown> }[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_actividad")
        .select("lead_id,datos")
        .eq("marca_id", marcaId)
        .eq("tipo", "cambio_fase")
        .order("created_at")
        .range(d, h) as PromiseLike<Respuesta<{ lead_id: string; datos: Record<string, unknown> }[]>>,
    "listCambiosFaseMarca",
  );
}

export async function listSeguimientosUsuaria(usuariaId: string, hasta: string): Promise<LeadConMarca[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_leads")
        .select("*, marca:ventas_marcas(nombre,slug)")
        .eq("asignada_a", usuariaId)
        .lte("proximo_seguimiento", hasta)
        .in("fase", [...FASES_ACTIVAS])
        .order("proximo_seguimiento")
        .range(d, h) as PromiseLike<Respuesta<LeadConMarca[]>>,
    "listSeguimientosUsuaria",
  );
}

/* Secuencias de WhatsApp ------------------------------------------------ */

export interface SecuenciaRow {
  id: string;
  marca_id: string;
  nombre: string;
  estado: "borrador" | "activa" | "archivada";
  pasos: unknown;
  creada_por: string | null;
  created_at: string;
  updated_at: string;
  /** A qué anuncios de Meta sirve esta secuencia. Hace falta porque
   *  `activarSecuencia` archiva las demás activas de la marca: sin esto, dos
   *  campañas vivas de la misma marca no podrían tener cada una su guion. El
   *  `select("*")` de abajo ya la trae; no hace falta tocar la consulta. */
  anuncios: string[];
}

export async function listSecuencias(marcaId: string): Promise<SecuenciaRow[]> {
  return todas(
    (desde, hasta) =>
      db().from("ventas_secuencias").select("*").eq("marca_id", marcaId).order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<SecuenciaRow[]>>,
    "listSecuencias",
  );
}

export async function getSecuencia(id: string): Promise<SecuenciaRow | null> {
  const r = await db().from("ventas_secuencias").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<SecuenciaRow>, "getSecuencia");
}

export async function crearSecuencia(input: {
  marcaId: string;
  nombre: string;
  pasos: unknown;
  creadaPor: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const r = await db()
    .from("ventas_secuencias")
    .insert({ marca_id: input.marcaId, nombre: input.nombre, pasos: input.pasos, creada_por: input.creadaPor })
    .select("id")
    .single();
  if (r.error) {
    console.error("[ventas/db] crearSecuencia:", r.error.message);
    return { ok: false, error: "No se pudo crear la secuencia." };
  }
  return { ok: true, id: (r.data as { id: string }).id };
}

export async function actualizarSecuencia(
  id: string,
  patch: { nombre?: string; pasos?: unknown; estado?: string },
): Promise<Escritura> {
  return escritura(
    await db()
      .from("ventas_secuencias")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id),
    "actualizarSecuencia",
  );
}

export async function registrarImportacion(fila: {
  marca_id: string;
  tipo: "leads" | "pedidos";
  nombre_fichero: string;
  filas_totales: number;
  filas_guardadas: number;
  resumen: Record<string, unknown>;
  usuaria_id: string;
}): Promise<void> {
  const r = await db().from("ventas_importaciones").insert(fila);
  // El registro es informativo: si falla, los leads ya están guardados.
  if (r.error) console.error("[ventas/db] registrarImportacion:", r.error.message);
}
