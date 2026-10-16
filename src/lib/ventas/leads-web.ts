import "server-only";
import { Resend } from "resend";
import { destinatariosAviso } from "../avisos-internos";
import { statusesBelow, type RecipientEventStatus } from "../campaign-stats";
import type { BulkLeadInput, LeadRow, ManualLeadInput, SaveLeadInput, WebhookLeadInput } from "../imagina-leads";
import * as legacy from "../imagina-leads-legacy";
import { formatQuestionnaireNotes, promoQuestionnaireFields, type PromoQuestionnaireInput } from "../promo-questionnaire";
import { getSupabaseAdmin } from "../supabase-admin";
import {
  actualizarEmailPorMensaje,
  actualizarLeadWeb,
  buscarLeadWeb,
  crearLeadWeb,
  getLead,
  getMarcaPorSlug,
  listarLeadsEmailables,
  registrarActividad,
  type CambiosLeadWeb,
  type Lead,
} from "./db";
import { ETIQUETA_KIT_DIGITAL, faseDesdeEstadoPanel, MARCA_DINKBIT_SLUG } from "./dominio";

/**
 * Los leads de la web de dinkbit (formularios, landings, webhooks, preview de
 * Imagina) se guardan en /panel/ventas, marca `dinkbit`. Antes iban a la tabla
 * `imagina_leads` del /panel viejo; ver la unificación del CRM
 * (docs/superpowers/specs/2026-10-15-crm-unificacion-leads-fases-design.md).
 *
 * Las funciones tienen la MISMA firma que tenían en `imagina-leads.ts`, que las
 * reexporta: los formularios no cambian. El id que devuelven es el del lead de
 * ventas, y todas las que reciben un id aceptan también el antiguo (el de
 * `imagina_leads` o el del preview), porque hay correos ya enviados con él.
 *
 * Respaldo: si falta la migración (o Supabase falla al dar de alta), el lead se
 * guarda como antes en `imagina_leads` y se deja en el log. Perder un lead es
 * peor que tenerlo unas horas en la tabla vieja; la migración de datos lo recoge.
 */

interface Entrada {
  idExterno?: string | null;
  nombre?: string | null;
  negocio?: string | null;
  email?: string | null;
  telefono?: string | null;
  web?: string | null;
  canal?: string | null;
  campana?: string | null;
  estado?: string | null;
  consentimiento?: boolean | null;
  notas?: string | null;
  extra?: Record<string, unknown>;
  origen: "web" | "manual" | "lista";
}

/** `campanaPrevia`: la campaña con la que ya estaba el lead, si existía. */
type Guardado = { ok: true; id: string; existia: boolean; campanaPrevia?: string | null } | { ok: false; error: string; respaldo: true };

const limpio = (v?: string | null): string | null => {
  const t = (v ?? "").trim();
  return t || null;
};

/** Quita las claves vacías, para no guardar `extra` lleno de nulos. */
function sinVacios(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));
}

async function marcaDinkbit(): Promise<{ id: string } | null> {
  const marca = await getMarcaPorSlug(MARCA_DINKBIT_SLUG);
  return marca ? { id: marca.id } : null;
}

function etiquetasDe(estado?: string | null): string[] {
  return estado === "kit-digital" || estado === "cliente-kit-digital" ? [ETIQUETA_KIT_DIGITAL] : [];
}

/** Los cambios que completa un alta repetida sobre el lead que ya existía. */
function completar(lead: Lead, e: Entrada): CambiosLeadWeb {
  const cambios: CambiosLeadWeb = {};
  const vacio = (v: unknown) => v === null || v === undefined || v === "";
  if (vacio(lead.contacto) && limpio(e.nombre)) cambios.contacto = limpio(e.nombre);
  if (vacio(lead.telefono) && limpio(e.telefono)) cambios.telefono = limpio(e.telefono);
  if (vacio(lead.email) && limpio(e.email)) cambios.email = limpio(e.email);
  if (vacio(lead.web) && limpio(e.web)) cambios.web = limpio(e.web);
  // Canal y campaña dicen por dónde llegó la PRIMERA vez: no se pisan.
  if (vacio(lead.canal) && limpio(e.canal)) cambios.canal = limpio(e.canal);
  if (vacio(lead.campana) && limpio(e.campana)) cambios.campana = limpio(e.campana);
  const actuales = lead.etiquetas ?? [];
  const nuevas = etiquetasDe(e.estado).filter((t) => !actuales.includes(t));
  if (nuevas.length) cambios.etiquetas = [...actuales, ...nuevas];
  // Un «sí» explícito cuenta; un formulario sin casilla no retira un sí anterior.
  if (e.consentimiento === true && lead.consentimiento !== true) cambios.consentimiento = true;
  const id = limpio(e.idExterno);
  const conocidos = [lead.id, lead.id_externo, ...(lead.ids_externos ?? [])];
  if (id && !conocidos.includes(id)) {
    if (!lead.id_externo) cambios.id_externo = id;
    else cambios.ids_externos = [...(lead.ids_externos ?? []), id];
  }
  const extra = sinVacios(e.extra ?? {});
  const extraNuevo = Object.fromEntries(Object.entries(extra).filter(([k, v]) => (lead.extra ?? {})[k] !== v));
  if (Object.keys(extraNuevo).length) cambios.extra = { ...(lead.extra ?? {}), ...extraNuevo };
  return cambios;
}

async function nota(leadId: string, texto: string | null) {
  if (!texto) return;
  // Sin que pueda tumbar el alta: el lead ya está guardado.
  try {
    await registrarActividad({ leadId, usuariaId: null, tipo: "nota", nota: texto });
  } catch (error) {
    console.error("[leads-web] no se pudo apuntar la nota", error);
  }
}

/** Alta o actualización en ventas. `respaldo: true` = hay que usar imagina_leads. */
async function guardar(e: Entrada): Promise<Guardado> {
  try {
    const marca = await marcaDinkbit();
    if (!marca) return { ok: false, error: "no existe la marca dinkbit", respaldo: true };
    const id = limpio(e.idExterno);
    const email = limpio(e.email);
    const telefono = limpio(e.telefono);
    for (let intento = 0; intento < 2; intento++) {
      const existente = await buscarLeadWeb(marca.id, { id, email: email ?? undefined, telefono: telefono ?? undefined });
      if (existente) {
        const cambios = completar(existente, e);
        if (Object.keys(cambios).length) {
          const r = await actualizarLeadWeb(existente.id, cambios);
          // El teléfono o el email nuevos pueden ser ya de OTRO lead de la marca
          // (índices únicos): entonces se guarda todo lo demás sin ellos, para
          // no perder el consentimiento, las etiquetas o el id del preview.
          if (!r.ok) {
            const { telefono: _t, email: _e, ...resto } = cambios;
            void _t;
            void _e;
            if (Object.keys(resto).length) await actualizarLeadWeb(existente.id, resto);
          }
        }
        const via = [limpio(e.canal), limpio(e.campana)].filter(Boolean).join(" · ");
        await nota(existente.id, [`Ha vuelto a llegar desde la web${via ? ` (${via})` : ""}.`, limpio(e.notas)].filter(Boolean).join("\n"));
        return { ok: true, id: existente.id, existia: true, campanaPrevia: existente.campana ?? null };
      }
      // El negocio es obligatorio en ventas: el de la persona o el email si no lo hay.
      const negocio = limpio(e.negocio) ?? limpio(e.nombre) ?? email ?? `(sin nombre) ${id ?? "web"}`;
      const creado = await crearLeadWeb(marca.id, {
        negocio,
        contacto: limpio(e.nombre),
        telefono,
        email,
        web: limpio(e.web),
        origen: e.origen,
        origen_detalle: limpio(e.campana),
        fase: faseDesdeEstadoPanel(e.estado),
        id_externo: id,
        canal: limpio(e.canal),
        campana: limpio(e.campana),
        etiquetas: etiquetasDe(e.estado),
        consentimiento: e.consentimiento ?? null,
        extra: sinVacios(e.extra ?? {}),
      });
      if (creado.ok) {
        await nota(creado.id, limpio(e.notas));
        return { ok: true, id: creado.id, existia: false };
      }
      // Otro alta con el mismo email o teléfono se adelantó: se busca otra vez.
      if (creado.error === "duplicado") continue;
      console.error("[leads-web] respaldo en imagina_leads:", creado.error);
      return { ok: false, error: creado.error, respaldo: true };
    }
    return { ok: false, error: "no se pudo resolver el duplicado", respaldo: true };
  } catch (error) {
    console.error("[leads-web] respaldo en imagina_leads:", error);
    return { ok: false, error: String(error), respaldo: true };
  }
}

/**
 * Un lead que acaba en la tabla vieja no lo ve nadie: el /panel viejo es solo
 * de consulta. Así que cada respaldo avisa al equipo por correo, con el dato
 * para encontrarlo y qué hacer. Sin que pueda fallar el alta.
 */
async function avisarRespaldo(e: Entrada, motivo: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = destinatariosAviso(process.env.CONTACT_EMAIL_TO);
    const from = process.env.CONTACT_EMAIL_FROM;
    if (!apiKey || !from || to.length === 0) return;
    const quien = [limpio(e.nombre), limpio(e.email), limpio(e.telefono)].filter(Boolean).join(" · ") || "(sin datos de contacto)";
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: "Lead guardado en la tabla vieja: revisar",
      text: [
        "Un lead de la web no se pudo guardar en /panel/ventas y se guardó en la tabla vieja (imagina_leads), donde nadie lo trabaja.",
        "",
        `Lead: ${quien}`,
        `Canal / campaña: ${[limpio(e.canal), limpio(e.campana)].filter(Boolean).join(" · ") || "—"}`,
        `Motivo: ${motivo}`,
        "",
        "Para pasarlo a ventas, vuelve a ejecutar docs/sql/2026-10-15-crm-unificacion-datos.sql en Supabase (es re-ejecutable: solo copia lo que falte).",
      ].join("\n"),
    });
  } catch (error) {
    console.error("[leads-web] no se pudo avisar del respaldo", error);
  }
}

/** El lead de ventas de un id nuevo o viejo; null si no está (o si falla la lectura). */
async function resolver(id: string): Promise<Lead | null> {
  try {
    const marca = await marcaDinkbit();
    return marca ? await buscarLeadWeb(marca.id, { id }) : null;
  } catch (error) {
    console.error("[leads-web] no se pudo buscar el lead", error);
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El lead al que apunta el enlace de baja o el destinatario de una campaña.
 * Primero dinkbit, por id nuevo o viejo (correos enviados antes de unificar el
 * CRM); si no, el lead de ventas de cualquier marca con ese uuid, porque desde
 * el módulo de campañas (2026-10-16) otras marcas también mandan correos.
 */
async function resolverDestinatario(id: string): Promise<Lead | null> {
  const lead = await resolver(id);
  if (lead || !UUID.test(id)) return lead;
  try {
    return await getLead(id);
  } catch (error) {
    console.error("[leads-web] no se pudo buscar el lead de la campaña", error);
    return null;
  }
}

/* Altas -------------------------------------------------------------------- */

function entradaWebhook(input: WebhookLeadInput): Entrada {
  return {
    idExterno: input.id,
    nombre: input.name,
    email: input.email,
    telefono: input.phone,
    canal: limpio(input.channel) ?? "Meta",
    campana: input.campaign,
    estado: input.status,
    consentimiento: input.consent,
    notas: input.notes,
    extra: { sector: limpio(input.sector), business_type: limpio(input.businessType) },
    origen: "web",
  };
}

export async function createWebhookLead(input: WebhookLeadInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const r = await guardar(entradaWebhook(input));
  if (r.ok) return { ok: true, id: r.id };
  await avisarRespaldo(entradaWebhook(input), r.error);
  return legacy.createWebhookLead(input);
}

export async function saveLead(input: SaveLeadInput): Promise<void> {
  const r = await guardar({
    idExterno: input.id,
    nombre: input.name,
    negocio: input.businessName,
    email: input.email,
    telefono: input.phone,
    web: input.currentWebsite,
    canal: "Web",
    extra: {
      sector: input.sector,
      business_type: input.businessType,
      style: input.style,
      palette: input.palette,
      value_prop: input.valueProp,
      pdf_path: input.pdfPath,
    },
    origen: "web",
  });
  if (!r.ok) {
    await avisarRespaldo({ idExterno: input.id, nombre: input.name, email: input.email, telefono: input.phone, canal: "Web", origen: "web" }, r.error);
    await legacy.saveLead(input);
  }
}

export async function upsertKitDigital2026Lead(
  lead: WebhookLeadInput,
): Promise<{ ok: boolean; id?: string; matched: boolean; error?: string }> {
  const r = await guardar(entradaWebhook(lead));
  // «matched» = ya venía de la campaña de Kit Digital 2026 (Meta) y recibió el
  // correo de «casi está»; alguien que era lead por otro formulario sí recibe su acuse.
  const deKd2026 = r.ok && r.existia && (r.campanaPrevia ?? "").trim().toLowerCase() === "kit digital 2026";
  if (r.ok) return { ok: true, id: r.id, matched: deKd2026 };
  await avisarRespaldo(entradaWebhook(lead), r.error);
  return legacy.upsertKitDigital2026Lead(lead);
}

function entradaManual(input: ManualLeadInput, origen: "manual" | "lista", extra: Partial<Entrada> = {}): Entrada {
  return {
    nombre: input.name,
    email: input.email,
    telefono: input.phone,
    web: input.website,
    canal: limpio(input.channel) ?? "Web",
    campana: input.campaign,
    notas: input.notes,
    origen,
    ...extra,
  };
}

export async function createManualLead(input: ManualLeadInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const r = await guardar(entradaManual(input, "manual"));
  if (r.ok) return { ok: true, id: r.id };
  await avisarRespaldo(entradaManual(input, "manual"), r.error);
  return legacy.createManualLead(input);
}

/** Alta masiva (CSV, prospección). Una a una para que cada lead se compare con
 *  los que ya hay; cuenta las nuevas, no las que completan a un lead existente. */
export async function createLeadsBulk(inputs: BulkLeadInput[]): Promise<{ ok: boolean; inserted: number; error?: string }> {
  let inserted = 0;
  for (const [i, input] of inputs.entries()) {
    const r = await guardar(entradaManual(input, "lista", { estado: input.status, consentimiento: input.consent }));
    if (!r.ok) {
      await avisarRespaldo(entradaManual(input, "lista"), `${r.error} (y los ${inputs.length - i - 1} siguientes de la importación)`);
      const resto = await legacy.createLeadsBulk(inputs.slice(i));
      return { ...resto, inserted: inserted + resto.inserted };
    }
    if (!r.existia) inserted++;
  }
  return { ok: true, inserted };
}

export async function savePromoQuestionnaire(input: PromoQuestionnaireInput): Promise<void> {
  await saveLead(promoQuestionnaireFields(input));
  const lead = await resolver(input.leadId);
  if (!lead) {
    await legacy.savePromoQuestionnaire(input);
    return;
  }
  await nota(lead.id, `— Cuestionario —\n${formatQuestionnaireNotes(input)}`);
}

/* Actualizaciones por id (nuevo o viejo) ------------------------------------- */

export async function updateLeadReview(leadId: string, rating: string, comment: string): Promise<void> {
  const lead = await resolver(leadId);
  if (!lead) return legacy.updateLeadReview(leadId, rating, comment);
  await actualizarLeadWeb(lead.id, { extra: { ...(lead.extra ?? {}), ...sinVacios({ review_rating: rating, review_comment: comment }) } });
}

/** En ventas las notas son entradas del historial, no un campo: no hay «notas previas» que leer. */
export async function getLeadNotes(leadId: string): Promise<string> {
  const lead = await resolver(leadId);
  return lead ? "" : legacy.getLeadNotes(leadId);
}

/** Solo `notes` tiene sentido en ventas (va al historial). El resto de campos
 *  era del /panel viejo, que ya no escribe. */
export async function updateLeadField(
  leadId: string,
  field: "account_manager" | "notes" | "followup" | "channel" | "campaign" | "name" | "email" | "phone",
  value: string,
): Promise<boolean> {
  const lead = await resolver(leadId);
  if (!lead) return legacy.updateLeadField(leadId, field, value);
  if (field !== "notes") {
    console.error(`[leads-web] updateLeadField(${field}) ya no se usa: el /panel viejo no escribe.`);
    return false;
  }
  await nota(lead.id, limpio(value));
  return true;
}

export async function setLeadEmailSent(leadId: string, messageId: string): Promise<void> {
  const lead = await resolver(leadId);
  if (!lead) return legacy.setLeadEmailSent(leadId, messageId);
  await actualizarLeadWeb(lead.id, { email_estado: "sent", email_mensaje_id: messageId, email_actualizado_at: new Date().toISOString() });
}

export async function setLeadEmailStatusByMessageId(messageId: string, status: string): Promise<number> {
  const n = await actualizarEmailPorMensaje(messageId, { email_estado: status, email_actualizado_at: new Date().toISOString() });
  // 0: el correo se envió antes de migrar y su message_id está en imagina_leads.
  return n > 0 ? n : legacy.setLeadEmailStatusByMessageId(messageId, status);
}

export async function setLeadConsent(leadId: string, consent: boolean): Promise<void> {
  const lead = await resolverDestinatario(leadId);
  if (!lead) return legacy.setLeadConsent(leadId, consent);
  await actualizarLeadWeb(lead.id, { consentimiento: consent });
}

export async function getLeadPdfPath(leadId: string): Promise<string | null> {
  const lead = await resolver(leadId);
  const ruta = lead?.extra?.pdf_path;
  if (typeof ruta === "string" && ruta) return ruta;
  return lead ? null : legacy.getLeadPdfPath(leadId);
}

/* Campañas -------------------------------------------------------------------- */

/**
 * Estado del destinatario de campaña cuyo message_id casa con el evento de
 * Resend. Un rebote o una queja se apunta también en el lead (por su id de
 * ventas, o por el viejo si la campaña se envió antes de migrar).
 */
export async function setCampaignRecipientStatusByMessageId(messageId: string, status: RecipientEventStatus): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;
  let query = sb.from("campaign_recipients").update({ status, updated_at: new Date().toISOString() }).eq("message_id", messageId);
  // Entregado/abierto/clic solo hacen subir el estado (ver campaign-stats.ts).
  const below = statusesBelow(status);
  if (below) query = query.in("status", below);
  const { data, error } = await query.select("id,lead_id");
  if (error) {
    console.error("[leads-web] setCampaignRecipientStatusByMessageId error:", error.message);
    return 0;
  }
  const rows = (data ?? []) as { id: string; lead_id: string }[];
  if (status === "bounced" || status === "complained") {
    for (const row of rows) {
      const lead = await resolverDestinatario(row.lead_id);
      if (!lead) {
        await legacy.marcarEmailLeadLegacy(row.lead_id, status);
        continue;
      }
      await actualizarLeadWeb(lead.id, {
        email_estado: status,
        email_actualizado_at: new Date().toISOString(),
        ...(status === "complained" ? { consentimiento: false } : {}),
      });
    }
  }
  return rows.length;
}

/** Un lead de ventas con la forma `LeadRow` que esperan Campañas (proyecto 2 las moverá a ventas). */
export function aLeadRow(l: Lead): LeadRow {
  const extra = (l.extra ?? {}) as Record<string, string | null | undefined>;
  return {
    id: l.id,
    created_at: l.created_at,
    name: l.contacto ?? l.negocio,
    email: l.email,
    phone: l.telefono,
    sector: extra.sector ?? null,
    business_name: l.negocio,
    business_type: extra.business_type ?? null,
    template: extra.template ?? null,
    style: extra.style ?? null,
    palette: extra.palette ?? null,
    value_prop: extra.value_prop ?? null,
    current_website: l.web,
    pdf_path: extra.pdf_path ?? null,
    review_rating: extra.review_rating ?? null,
    review_comment: extra.review_comment ?? null,
    status: l.fase,
    channel: l.canal ?? null,
    campaign: l.campana ?? null,
    notes: null,
    followup: null,
    followup_at: l.proximo_seguimiento,
    account_manager: null,
    archived: l.archivado ?? false,
    email_status: l.email_estado ?? null,
    email_message_id: l.email_mensaje_id ?? null,
    email_updated_at: l.email_actualizado_at ?? null,
    consent: l.consentimiento ?? null,
    ids_alternativos: [l.id_externo, ...(l.ids_externos ?? [])].filter((x): x is string => Boolean(x)),
  };
}

export async function listEmailableLeads(filter?: { status?: string; campaign?: string; channel?: string }): Promise<LeadRow[]> {
  try {
    const marca = await marcaDinkbit();
    if (!marca) return legacy.listEmailableLeads(filter);
    const leads = await listarLeadsEmailables(marca.id, { fase: filter?.status, campana: filter?.campaign, canal: filter?.channel });
    return leads.map(aLeadRow);
  } catch (error) {
    console.error("[leads-web] listEmailableLeads: se usan los de imagina_leads", error);
    return legacy.listEmailableLeads(filter);
  }
}

/**
 * Destinatarios posibles de una campaña de cualquier marca de ventas (el
 * módulo de campañas, proyecto 2 de la unificación). Sin respaldo en
 * imagina_leads: eso solo tiene sentido para dinkbit, y es `listEmailableLeads`.
 */
export async function listEmailableLeadsDeMarca(marcaId: string): Promise<LeadRow[]> {
  const leads = await listarLeadsEmailables(marcaId);
  return leads.map(aLeadRow);
}
