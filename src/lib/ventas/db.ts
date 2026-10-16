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
import type { TareaManual } from "./tareas";
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
  marca_id: string | null;
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
  /** Servicios opcionales encendidos (hoy solo `campanas`). Sin la migración
   *  (docs/sql/2026-10-16-ventas-campanas.sql), la fila no lo trae. */
  modulos?: string[] | null;
  /** Remitentes permitidos para sus campañas; vacío = la lista global. */
  campanas_remitentes?: string[] | null;
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
  /** HH:MM:SS de Postgres; hasta que se ejecute la migración la fila no trae la columna. */
  proximo_seguimiento_hora: string | null;
  /** Socios o usuarios activos del centro y puesto del contacto, como texto
   *  libre: vienen del formulario del anuncio. Sin la migración, `undefined`. */
  socios: string | null;
  cargo: string | null;
  codigo_cliente: string;
  excluido: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Del botón «Pasar al embudo», retirado con la unificación del CRM
   *  (2026-10-15). La columna se queda; ya no la escribe nadie. */
  promocionado_at?: string | null;
  /* Campos de los leads de la web (docs/sql/2026-10-15-crm-unificacion-estructura.sql).
   * Opcionales: hasta que se ejecute la migración, las filas no los traen. */
  /** Id con el que llegó de fuera: el de `imagina_leads` o el del preview de Imagina. */
  id_externo?: string | null;
  /** Otros ids externos del mismo lead (llegó por varios flujos). */
  ids_externos?: string[];
  canal?: string | null;
  campana?: string | null;
  etiquetas?: string[];
  /** Comunicaciones comerciales. null = sin definir. */
  consentimiento?: boolean | null;
  email_estado?: string | null;
  email_mensaje_id?: string | null;
  email_actualizado_at?: string | null;
  archivado?: boolean;
  /** Lo que es solo de los flujos de la web: datos del preview, sector… */
  extra?: Record<string, unknown>;
}

/** Alta de un lead con todos los campos (RPC `ventas_crear_lead`). */
export interface LeadWebNuevo {
  negocio: string;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
  tipo_negocio?: string | null;
  origen: "web" | "manual" | "lista";
  origen_detalle?: string | null;
  fase?: Fase;
  asignada_a?: string | null;
  proximo_seguimiento?: string | null;
  id_externo?: string | null;
  canal?: string | null;
  campana?: string | null;
  etiquetas?: string[];
  consentimiento?: boolean | null;
  extra?: Record<string, unknown>;
  created_at?: string | null;
}

export type CambiosLeadWeb = Partial<
  Pick<
    Lead,
    | "negocio" | "contacto" | "telefono" | "email" | "web" | "canal" | "campana" | "etiquetas" | "consentimiento"
    | "email_estado" | "email_mensaje_id" | "email_actualizado_at" | "archivado" | "extra" | "id_externo" | "ids_externos"
  >
>;

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

/** Error de lectura que conserva el código de Postgres/PostgREST. */
class ErrorLectura extends Error {
  constructor(mensaje: string, readonly codigo?: string) {
    super(mensaje);
  }
}

function comprobar<T>(r: Respuesta<T>, contexto: string): T | null {
  if (r.error) throw new ErrorLectura(`[ventas/db] ${contexto}: ${r.error.message}`, r.error.code);
  return r.data;
}

/**
 * Códigos con los que la base contesta cuando le falta algo de una migración:
 * función, tabla o columna que no existe (los de PostgREST y los de Postgres).
 */
const FALTA_EN_LA_BASE = new Set(["PGRST202", "PGRST204", "PGRST205", "42883", "42P01", "42703"]);

/**
 * Para lecturas que dependen de una migración reciente y no son imprescindibles
 * para pintar la pantalla. Si la base aún no tiene esa función, tabla o columna,
 * devuelve `alternativa` y lo deja en el log, en vez de tumbar el panel entero.
 * Cualquier otro fallo (red, permisos) se sigue lanzando: ese sí hay que verlo.
 */
async function tolerarMigracionPendiente<T>(lectura: () => Promise<T>, alternativa: () => T | Promise<T>, contexto: string): Promise<T> {
  try {
    return await lectura();
  } catch (error) {
    if (!(error instanceof ErrorLectura) || !error.codigo || !FALTA_EN_LA_BASE.has(error.codigo)) throw error;
    console.error(`[ventas/db] ${contexto}: falta ejecutar una migración (${error.codigo}); se sigue sin ello.`, error.message);
    return alternativa();
  }
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

/** Id de la cuenta de login con ese email, si existe (sin distinguir mayúsculas). */
async function buscarCuentaAuth(email: string): Promise<string | null> {
  const buscado = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hallado = data.users.find((x) => (x.email ?? "").toLowerCase() === buscado);
    if (hallado) return hallado.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function crearUsuariaCompleta(u: NuevaUsuaria): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const sb = db();
  const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
  const authId = data?.user?.id ?? null;
  if (error || !authId) {
    console.error("[ventas/db] crearUsuariaCompleta auth:", error?.message);
    const repetido = /already|registered|exists/i.test(error?.message ?? "");
    if (!repetido) return { ok: false, error: "No se pudo crear la cuenta." };
    // El mismo proyecto de Supabase lo usan otras herramientas: un email puede
    // tener cuenta de login sin ser usuario de ventas (pasó con paula.lopez@ el
    // 15/10/2026). Esa cuenta NO se toca desde aquí: ponerle contraseña dejaría
    // a cualquier admin de ventas quedarse con una cuenta ajena. Se vincula a
    // mano, comprobando antes que es de quien dice ser.
    const previa = await buscarCuentaAuth(u.email);
    if (previa) {
      const perfilPrevio = await sb.from("ventas_usuarias").select("id").eq("id", previa).maybeSingle();
      if (perfilPrevio.data) return { ok: false, error: "Ya existe un usuario con ese email." };
      return {
        ok: false,
        error: "Ese email ya tiene cuenta de acceso en otra herramienta de dinkbit. Hay que vincularla a mano: pídeselo a quien mantiene el panel.",
      };
    }
    return { ok: false, error: "Ya existe una cuenta con ese email." };
  }
  const perfil = await sb.from("ventas_usuarias").insert({
    id: authId,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    // Solo las clientas llevan marca; no mandarla en los demás roles deja el
    // alta de comerciales funcionando aunque la columna aún no exista.
    ...(u.marca_id ? { marca_id: u.marca_id } : {}),
  });
  if (perfil.error) {
    // Sin perfil la cuenta no sirve para nada: se deshace para poder reintentar.
    await sb.auth.admin.deleteUser(authId);
    console.error("[ventas/db] crearUsuariaCompleta perfil:", perfil.error.message);
    // Una clienta que la base rechaza por el rol (23514) o por no conocer la
    // columna de marca: es la migración del rol cliente, que no se ha ejecutado.
    const codigo = (perfil.error as { code?: string }).code;
    if (u.rol === "cliente" && codigo && (codigo === "23514" || FALTA_EN_LA_BASE.has(codigo))) {
      return { ok: false, error: "Para crear clientes falta ejecutar en Supabase la migración del rol cliente (docs/sql/2026-10-09-ventas-tareas-rol-cliente.sql)." };
    }
    return { ok: false, error: "No se pudo crear el perfil del usuario." };
  }
  return { ok: true, id: authId };
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

export async function getMarcaPorId(id: string): Promise<Marca | null> {
  const r = await db().from("ventas_marcas").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<Marca>, "getMarcaPorId");
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

/** Módulos opcionales y remitentes de campañas de la marca. Sin la migración,
 *  lo dice en vez de un «no se pudo guardar» que no explica nada. */
export async function actualizarModulosMarca(id: string, cambios: { modulos: string[]; campanas_remitentes: string[] }): Promise<Escritura> {
  const r = await db().from("ventas_marcas").update(cambios).eq("id", id);
  if (r.error?.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    console.error("[ventas/db] actualizarModulosMarca:", r.error.message);
    return { ok: false, error: "Falta ejecutar en Supabase la migración de campañas (docs/sql/2026-10-16-ventas-campanas.sql)." };
  }
  return escritura(r, "actualizarModulosMarca");
}

export async function regenerarSecretoWebhook(id: string): Promise<Escritura> {
  const secreto = randomBytes(32).toString("hex");
  return escritura(await db().from("ventas_marcas").update({ webhook_secret: secreto }).eq("id", id), "regenerarSecretoWebhook");
}

/** La nota con texto más reciente de cada lead de la marca (de cualquier tipo de actividad). */
export async function listUltimasNotas(marcaId: string): Promise<Map<string, { texto: string; fecha: string }>> {
  type Fila = { lead_id: string; nota: string; created_at: string };
  // La nota es un adorno de la tarjeta: sin la función, el tablero se pinta igual.
  const filas = await tolerarMigracionPendiente(
    () =>
      todas<Fila>(
        (d, h) => db().rpc("ventas_ultimas_notas", { p_marca_id: marcaId }).order("lead_id").range(d, h) as PromiseLike<Respuesta<Fila[]>>,
        "listUltimasNotas",
      ),
    () => [],
    "listUltimasNotas",
  );
  return new Map(filas.map((f) => [f.lead_id, { texto: f.nota, fecha: f.created_at }]));
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

export interface FiltroLeads {
  fase?: Fase;
  asignadaA?: string;
  /** true: solo los archivados. Por defecto se ocultan. (Canal, campaña y
   *  etiqueta se filtran en memoria: ver `filtros-origen.ts`.) */
  archivados?: boolean;
}

export async function listLeads(marcaId: string, filtro: FiltroLeads = {}): Promise<Lead[]> {
  const leer = (conColumnasNuevas: boolean) =>
    todas((desde, hasta) => {
      let q = db().from("ventas_leads").select("*").eq("marca_id", marcaId);
      if (filtro.fase) q = q.eq("fase", filtro.fase);
      if (filtro.asignadaA) q = q.eq("asignada_a", filtro.asignadaA);
      if (conColumnasNuevas) q = q.eq("archivado", filtro.archivados === true);
      return q.order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Lead[]>>;
    }, "listLeads");
  // Sin la migración de los leads de la web, la lista sale entera y sin esos filtros.
  return tolerarMigracionPendiente(() => leer(true), () => leer(false), "listLeads");
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

/**
 * Guarda socios y cargo. Van aparte de `actualizarDatosLead` a propósito: si la
 * base aún no tiene esas columnas, falla esto y no el guardado del resto de la
 * ficha ni el alta del lead que llega por el webhook.
 */
export async function actualizarExtrasLead(id: string, extras: { socios?: string; cargo?: string }): Promise<Escritura> {
  const fila: Record<string, string | null> = {};
  if (extras.socios !== undefined) fila.socios = vacioANull(extras.socios);
  if (extras.cargo !== undefined) fila.cargo = vacioANull(extras.cargo);
  if (Object.keys(fila).length === 0) return { ok: true };
  const r = await db().from("ventas_leads").update(fila).eq("id", id);
  if (r.error?.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    console.error("[ventas/db] actualizarExtrasLead: falta la migración de socios y cargo:", r.error.message);
    return { ok: false, error: "El resto se ha guardado, pero socios y cargo no: falta ejecutar en Supabase docs/sql/2026-10-13-ventas-socios-cargo.sql." };
  }
  return escritura(r, "actualizarExtrasLead");
}

/**
 * Canal, campaña, conjunto de anuncios y anuncio con los que llegó el lead.
 * Aparte de socios y cargo: si faltara su migración, esto se guarda igual.
 */
export async function actualizarAtribucionLead(
  id: string,
  a: { canal?: string; campana?: string; extra?: Record<string, unknown> },
): Promise<Escritura> {
  const fila: Record<string, unknown> = {};
  if (a.canal !== undefined) fila.canal = vacioANull(a.canal);
  if (a.campana !== undefined) fila.campana = vacioANull(a.campana);
  if (a.extra !== undefined) fila.extra = a.extra;
  if (Object.keys(fila).length === 0) return { ok: true };
  return escritura(await db().from("ventas_leads").update(fila).eq("id", id), "actualizarAtribucionLead");
}

export async function asignarLead(id: string, usuariaId: string | null): Promise<Escritura> {
  return escritura(
    await db().from("ventas_leads").update({ asignada_a: usuariaId, updated_at: new Date().toISOString() }).eq("id", id),
    "asignarLead",
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
  proximoSeguimientoHora?: string | null;
}): Promise<Escritura> {
  const cambiarSeguimiento = input.proximoSeguimiento !== undefined;
  const hora = cambiarSeguimiento && input.proximoSeguimiento ? (input.proximoSeguimientoHora ?? null) : null;
  const { error } = await db().rpc("ventas_registrar_actividad", {
    p_lead_id: input.leadId,
    p_usuaria_id: input.usuariaId,
    p_tipo: input.tipo,
    p_resultado: input.resultado ?? null,
    p_nota: input.nota ?? null,
    p_fase_nueva: input.faseNueva ?? null,
    p_cambiar_seguimiento: cambiarSeguimiento,
    p_proximo_seguimiento: cambiarSeguimiento ? input.proximoSeguimiento : null,
    // Solo se manda cuando hay hora. En la función es un parámetro con
    // `default null`, así que omitirlo borra la hora igual; y así registrar
    // una llamada sin hora funciona también con la versión anterior de la
    // función (ocho parámetros), si la migración de la hora no se ha ejecutado.
    ...(hora ? { p_proximo_seguimiento_hora: hora } : {}),
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
  const leer = (conHora: boolean) =>
    todas((d, h) => {
      let q = db()
        .from("ventas_leads")
        .select("*, marca:ventas_marcas(nombre,slug)")
        .eq("asignada_a", usuariaId)
        .lte("proximo_seguimiento", hasta)
        .in("fase", [...FASES_ACTIVAS])
        .order("proximo_seguimiento");
      // Dentro del mismo día, por hora; los que no la tienen, al final.
      if (conHora) q = q.order("proximo_seguimiento_hora", { ascending: true, nullsFirst: false });
      return q.range(d, h) as PromiseLike<Respuesta<LeadConMarca[]>>;
    }, "listSeguimientosUsuaria");
  // Sin la columna de la hora, «Mi día» sigue saliendo, ordenado solo por fecha.
  return tolerarMigracionPendiente(() => leer(true), () => leer(false), "listSeguimientosUsuaria");
}

/* Tareas -------------------------------------------------------------------- */

export async function listTareasMarca(marcaId: string, opciones: { hechasDesde?: string } = {}): Promise<TareaManual[]> {
  return todas((d, h) => {
    let q = db().from("ventas_tareas").select("*").eq("marca_id", marcaId);
    q = opciones.hechasDesde ? q.or(`hecha_at.is.null,hecha_at.gte.${opciones.hechasDesde}`) : q.is("hecha_at", null);
    return q.order("created_at").range(d, h) as PromiseLike<Respuesta<TareaManual[]>>;
  }, "listTareasMarca");
}

export async function listTareasUsuaria(usuariaId: string): Promise<(TareaManual & { marca: { nombre: string; slug: string } | null })[]> {
  type Fila = TareaManual & { marca: { nombre: string; slug: string } | null };
  // Sin la tabla de tareas, «Mi día» enseña los seguimientos y ninguna tarea.
  return tolerarMigracionPendiente<Fila[]>(
    () =>
      todas(
        (d, h) =>
          db()
            .from("ventas_tareas")
            .select("*, marca:ventas_marcas(nombre,slug)")
            .eq("asignada_a", usuariaId)
            .is("hecha_at", null)
            .not("vence", "is", null)
            .order("vence")
            .order("vence_hora", { ascending: true, nullsFirst: false })
            .range(d, h) as PromiseLike<Respuesta<Fila[]>>,
        "listTareasUsuaria",
      ),
    () => [],
    "listTareasUsuaria",
  );
}

export async function getTarea(id: string): Promise<TareaManual | null> {
  const r = await db().from("ventas_tareas").select("*").eq("id", id).maybeSingle();
  return comprobar(r as Respuesta<TareaManual>, "getTarea");
}

export async function crearTarea(t: {
  marcaId: string;
  leadId: string | null;
  titulo: string;
  vence: string | null;
  venceHora: string | null;
  asignadaA: string | null;
  creadaPor: string;
  notas: string | null;
}): Promise<Escritura> {
  const r = await db().from("ventas_tareas").insert({
    marca_id: t.marcaId,
    lead_id: t.leadId,
    titulo: t.titulo,
    vence: t.vence,
    vence_hora: t.venceHora,
    asignada_a: t.asignadaA,
    creada_por: t.creadaPor,
    // Solo se manda si hay algo que guardar: así las tareas sin notas se
    // siguen creando aunque la columna aún no exista.
    ...(t.notas ? { notas: t.notas } : {}),
  });
  if (t.notas && r.error?.code && FALTA_EN_LA_BASE.has(r.error.code)) {
    console.error("[ventas/db] crearTarea: falta la migración de notas de tareas:", r.error.message);
    return { ok: false, error: "Para guardar notas en las tareas falta ejecutar en Supabase docs/sql/2026-10-13-ventas-tareas-notas.sql." };
  }
  return escritura(r, "crearTarea");
}

export async function actualizarTarea(id: string, cambios: { hecha?: { por: string } | null; asignadaA?: string | null }): Promise<Escritura> {
  const fila: Record<string, unknown> = {};
  if (cambios.hecha !== undefined) {
    fila.hecha_at = cambios.hecha ? new Date().toISOString() : null;
    fila.hecha_por = cambios.hecha ? cambios.hecha.por : null;
  }
  if (cambios.asignadaA !== undefined) fila.asignada_a = cambios.asignadaA;
  return escritura(await db().from("ventas_tareas").update(fila).eq("id", id), "actualizarTarea");
}

/** Llamadas de la marca, de la más antigua a la más reciente (lo que espera `leadsQuePidenMuestras`). */
export async function listLlamadasMarca(marcaId: string): Promise<{ lead_id: string; resultado: string | null }[]> {
  return todas(
    (d, h) =>
      db()
        .from("ventas_actividad")
        .select("lead_id,resultado")
        .eq("marca_id", marcaId)
        .eq("tipo", "llamada")
        .order("created_at")
        .range(d, h) as PromiseLike<Respuesta<{ lead_id: string; resultado: string | null }[]>>,
    "listLlamadasMarca",
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
  /** A qué anuncios de Meta sirve esta secuencia. Es lo que permite dos
   *  campañas vivas a la vez bajo la misma marca: `activarSecuencia` solo
   *  archiva las activas que compiten por los mismos anuncios, y
   *  `whatsapp/eleccion.ts` manda a cada lead a la suya. El `select("*")` de
   *  abajo ya la trae; no hace falta tocar la consulta.
   *
   *  El tipo dice `string[]`, pero una base donde la migración manual todavía
   *  no está aplicada devuelve la fila SIN el campo: quien lo lea tiene que
   *  defenderse (`?? []`), como hacen `elegirSecuencia` y
   *  `compitenPorAnuncios`. */
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

/** Borrado definitivo: lead, historial, tareas y conversaciones. Solo de la marca dada. */
export async function eliminarLeads(marcaId: string, leadIds: string[]): Promise<{ ok: true; borrados: number } | { ok: false; error: string }> {
  const { data, error } = await db().rpc("ventas_eliminar_leads", { p_marca_id: marcaId, p_lead_ids: leadIds });
  if (error) {
    console.error("[ventas/db] eliminarLeads:", error.message);
    return { ok: false, error: "No se pudo eliminar. Vuelve a intentarlo." };
  }
  return { ok: true, borrados: Number(data ?? 0) };
}

/* Recordatorio diario ------------------------------------------------------- */

/**
 * Reserva el recordatorio de hoy de una usuaria. `ya_enviado` si otra pasada
 * del cron se adelantó; `falta_migracion` si no existe la tabla (entonces no
 * hay forma de saber qué se envió y no hay que mandar nada).
 */
export async function reclamarRecordatorioDiario(usuariaId: string, fecha: string): Promise<"reclamado" | "ya_enviado" | "falta_migracion"> {
  const { error } = await db().from("ventas_recordatorios_enviados").insert({ usuaria_id: usuariaId, fecha });
  if (!error) return "reclamado";
  if (error.code === "23505") return "ya_enviado";
  if (error.code && FALTA_EN_LA_BASE.has(error.code)) return "falta_migracion";
  throw new ErrorLectura(`[ventas/db] reclamarRecordatorioDiario: ${error.message}`, error.code);
}

/** Deshace la reserva cuando el envío falla, para que la siguiente pasada lo reintente. */
export async function liberarRecordatorioDiario(usuariaId: string, fecha: string): Promise<void> {
  const { error } = await db().from("ventas_recordatorios_enviados").delete().eq("usuaria_id", usuariaId).eq("fecha", fecha);
  if (error) console.error("[ventas/db] liberarRecordatorioDiario:", error.message);
}

/* Leads de la web (unificación con /panel) ----------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function crearLeadWeb(
  marcaId: string,
  lead: LeadWebNuevo,
): Promise<{ ok: true; id: string } | { ok: false; error: string; faltaMigracion?: boolean }> {
  const { data, error } = await db().rpc("ventas_crear_lead", { p_marca_id: marcaId, p_lead: lead });
  if (error) {
    console.error("[ventas/db] crearLeadWeb:", error.message);
    const falta = Boolean(error.code && FALTA_EN_LA_BASE.has(error.code));
    return { ok: false, error: error.message, ...(falta ? { faltaMigracion: true } : {}) };
  }
  // null = chocó con otro lead (mismo email, teléfono o id externo): quien llama lo busca.
  return data ? { ok: true, id: String(data) } : { ok: false, error: "duplicado" };
}

/**
 * Un lead de la marca por cualquiera de sus identificadores: el id de ventas,
 * el id externo con el que llegó (los correos ya enviados llevan el de
 * `imagina_leads` o el del preview), otro id externo suyo, el email o el
 * teléfono. Para en el primero que encuentra.
 */
export async function buscarLeadWeb(
  marcaId: string,
  c: { id?: string | null; email?: string | null; telefono?: string | null },
): Promise<Lead | null> {
  const base = () => db().from("ventas_leads").select("*").eq("marca_id", marcaId).limit(1);
  // Los criterios que tocan columnas de la migración toleran que aún no existan.
  const criterios: { campo: string; leer: () => Promise<Lead | null> }[] = [];
  const id = c.id?.trim();
  if (id && UUID.test(id)) {
    criterios.push({ campo: "id", leer: async () => comprobar(await base().eq("id", id).maybeSingle() as Respuesta<Lead>, "buscarLeadWeb:id") });
  }
  if (id) {
    criterios.push({
      campo: "id_externo",
      leer: () =>
        tolerarMigracionPendiente(
          async () => comprobar(await base().eq("id_externo", id).maybeSingle() as Respuesta<Lead>, "buscarLeadWeb:id_externo"),
          () => null,
          "buscarLeadWeb:id_externo",
        ),
    });
    criterios.push({
      campo: "ids_externos",
      leer: () =>
        tolerarMigracionPendiente(
          async () => comprobar(await base().contains("ids_externos", [id]).maybeSingle() as Respuesta<Lead>, "buscarLeadWeb:ids_externos"),
          () => null,
          "buscarLeadWeb:ids_externos",
        ),
    });
  }
  const email = normalizarEmail(c.email);
  if (email) criterios.push({ campo: "email", leer: async () => comprobar(await base().eq("email_norm", email).maybeSingle() as Respuesta<Lead>, "buscarLeadWeb:email") });
  const tel = normalizarTelefono(c.telefono);
  if (tel) criterios.push({ campo: "telefono", leer: async () => comprobar(await base().eq("telefono_norm", tel).maybeSingle() as Respuesta<Lead>, "buscarLeadWeb:telefono") });
  for (const criterio of criterios) {
    const lead = await criterio.leer();
    if (lead) return lead;
  }
  return null;
}

/**
 * Prospección guarda en `prospects.lead_id` el lead con el que se enlazó: un id
 * de ventas o, en los convertidos antes de la unificación, el de
 * `imagina_leads`, que la migración de datos dejó en `id_externo`. Devuelve
 * id guardado → id del lead de ventas de la marca, solo para los que existen.
 * Sin la columna `id_externo` se queda con lo que encuentre por id.
 */
export async function resolverLeadsEnlazados(marcaId: string, ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  const uuids = unicos.filter((id) => UUID.test(id));
  if (uuids.length > 0) {
    const filas = comprobar(
      (await db().from("ventas_leads").select("id").eq("marca_id", marcaId).in("id", uuids)) as Respuesta<{ id: string }[]>,
      "resolverLeadsEnlazados:id",
    );
    for (const f of filas ?? []) mapa.set(f.id, f.id);
  }
  const resto = unicos.filter((id) => !mapa.has(id));
  if (resto.length === 0) return mapa;
  const externos = await tolerarMigracionPendiente(
    async () =>
      comprobar(
        (await db().from("ventas_leads").select("id,id_externo").eq("marca_id", marcaId).in("id_externo", resto)) as Respuesta<
          { id: string; id_externo: string }[]
        >,
        "resolverLeadsEnlazados:id_externo",
      ) ?? [],
    () => [],
    "resolverLeadsEnlazados:id_externo",
  );
  for (const f of externos) mapa.set(f.id_externo, f.id);
  return mapa;
}

export async function actualizarLeadWeb(id: string, cambios: CambiosLeadWeb): Promise<Escritura> {
  return escritura(await db().from("ventas_leads").update(cambios).eq("id", id), "actualizarLeadWeb");
}

/** Leads a los que se les puede mandar una campaña: consentimiento sí, con
 *  email, sin rebote ni queja y sin archivar. Misma regla que `isLeadEmailable`. */
export async function listarLeadsEmailables(
  marcaId: string,
  filtro: { fase?: string; campana?: string; canal?: string } = {},
): Promise<Lead[]> {
  return todas((desde, hasta) => {
    let q = db()
      .from("ventas_leads")
      .select("*")
      .eq("marca_id", marcaId)
      .eq("consentimiento", true)
      .eq("archivado", false)
      .not("email", "is", null)
      .or("email_estado.is.null,email_estado.not.in.(bounced,complained)");
    if (filtro.fase) q = q.eq("fase", filtro.fase);
    if (filtro.campana) q = q.eq("campana", filtro.campana);
    if (filtro.canal) q = q.eq("canal", filtro.canal);
    return q.order("created_at", { ascending: false }).range(desde, hasta) as PromiseLike<Respuesta<Lead[]>>;
  }, "listarLeadsEmailables");
}

/** Estado del último correo automático del lead cuyo id de Resend casa. Devuelve cuántos cambió. */
export async function actualizarEmailPorMensaje(mensajeId: string, cambios: CambiosLeadWeb): Promise<number> {
  const { data, error } = await db().from("ventas_leads").update(cambios).eq("email_mensaje_id", mensajeId).select("id");
  if (error) {
    console.error("[ventas/db] actualizarEmailPorMensaje:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
