import "server-only";
import { Resend } from "resend";
import { formatFromHeader } from "../email-from";
import { bajaDisponible, urlDeBaja } from "./baja-token";
import {
  anotarEnvioIncierto,
  emailsDeLeads,
  enviadosDesde,
  getPlantilla,
  listarSuprimidos,
  prospectosPorIds,
  reclamarParaEnvio,
  registrarEnvio,
  revertirEnvio,
  yaContactado,
} from "./db";
import { datosDeProspecto, renderPlantilla, textoAHtml } from "./plantilla";
import {
  inicioDelDiaMadrid,
  limiteDiario,
  motivoBloqueo,
  remitentesProspeccion,
  type MotivoBloqueo,
} from "./reglas-envio";

export type ErrorEnvio =
  | MotivoBloqueo
  | "sin_remitente"
  | "sin_baja"
  | "remitente_no_permitido"
  | "plantilla_no_encontrada"
  | "tope_diario"
  | "faltan_datos"
  | "ya_reclamado"
  | "fallo_resend"
  | "error_datos"
  | "resultado_incierto"
  | "email_repetido";

export interface ResultadoEnvio {
  ok: boolean;
  error?: ErrorEnvio;
  enviados: number;
  omitidos: Array<{ id: string; motivo: ErrorEnvio; detalle?: string }>;
}

const RESPONDER_A = process.env.PROSPECT_REPLY_TO ?? "hola@dinkbit.es";

const PIE =
  "Le escribe dinkbit (dinkbit.es · hola@dinkbit.es). Hemos encontrado esta dirección publicada en su web. " +
  "Si prefiere no recibir más correos nuestros, puede darse de baja aquí:";

/** Cuerpo ya renderizado + pie legal → versiones HTML y texto. Sobrio a
 *  propósito: tiene que leerse como un correo de persona a persona, no como una
 *  campaña. */
export function componerCorreo(cuerpoTexto: string, bajaUrl: string): { html: string; text: string } {
  const text = `${cuerpoTexto}\n\n--\n${PIE} ${bajaUrl}`;
  const enlace = bajaUrl.replace(/&/g, "&amp;");
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;">` +
    `${textoAHtml(cuerpoTexto)}` +
    `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">` +
    `${PIE} <a href="${enlace}" style="color:#64748b;">darme de baja</a>.</p></div>`;
  return { html, text };
}

const fallo = (error: ErrorEnvio): ResultadoEnvio => ({ ok: false, error, enviados: 0, omitidos: [] });

/** Envía la plantilla a cada prospecto, de uno en uno y cada cual en su propio
 *  correo. Lo que no se puede enviar se devuelve con su motivo, sin abortar el
 *  resto. Las direcciones personales solo salen si se pide un único prospecto
 *  con `confirmarPersonal`. */
export async function enviarProspectos(
  ids: string[],
  plantillaId: string,
  o: { from: string; confirmarPersonal?: boolean },
): Promise<ResultadoEnvio> {
  const remitentes = remitentesProspeccion();
  if (remitentes.length === 0) return fallo("sin_remitente");
  const from = o.from.trim().toLowerCase();
  if (!remitentes.includes(from)) return fallo("remitente_no_permitido");

  // Un correo comercial sin baja que funcione no sale: sin secreto el enlace saldría muerto.
  if (!bajaDisponible()) return fallo("sin_baja");

  const plantilla = await getPlantilla(plantillaId);
  if (!plantilla) return fallo("plantilla_no_encontrada");

  const inicioDia = inicioDelDiaMadrid(new Date());
  const [filas, suprimidos, emailsLeads, yaEnviados] = await Promise.all([
    prospectosPorIds(ids),
    listarSuprimidos(),
    emailsDeLeads(),
    enviadosDesde(inicioDia),
  ]);
  // Sin estos tres datos no se puede decidir: ante la duda, no se envía.
  if (!suprimidos || !emailsLeads || yaEnviados === null) return fallo("error_datos");
  const porId = new Map(filas.map((p) => [p.id, p]));
  const ctx = {
    suprimidos,
    emailsDeLeads: emailsLeads,
    confirmarPersonal: o.confirmarPersonal === true && ids.length === 1,
  };

  const resend = new Resend(process.env.RESEND_API_KEY ?? "");
  const resultado: ResultadoEnvio = { ok: true, enviados: 0, omitidos: [] };
  let cupo = limiteDiario() - yaEnviados;
  const escritos = new Set<string>();

  for (const id of ids) {
    const p = porId.get(id);
    if (!p) {
      resultado.omitidos.push({ id, motivo: "estado" });
      continue;
    }
    const bloqueo = motivoBloqueo(p, ctx);
    if (bloqueo) {
      resultado.omitidos.push({ id, motivo: bloqueo });
      continue;
    }
    if (cupo <= 0) {
      resultado.omitidos.push({ id, motivo: "tope_diario" });
      continue;
    }

    const datos = datosDeProspecto(p);
    const asunto = renderPlantilla(plantilla.subject, datos);
    const cuerpo = renderPlantilla(plantilla.body, datos);
    if (!asunto.ok || !cuerpo.ok) {
      const faltan = [...(asunto.ok ? [] : asunto.faltan), ...(cuerpo.ok ? [] : cuerpo.faltan)];
      resultado.omitidos.push({ id, motivo: "faltan_datos", detalle: [...new Set(faltan)].join(", ") });
      continue;
    }

    const direccion = (p.email as string).trim().toLowerCase();
    if (escritos.has(direccion)) {
      resultado.omitidos.push({ id, motivo: "email_repetido" });
      continue;
    }
    const contactado = await yaContactado(direccion);
    if (contactado === null) {
      resultado.omitidos.push({ id, motivo: "error_datos" });
      continue;
    }
    if (contactado) {
      resultado.omitidos.push({ id, motivo: "email_repetido" });
      continue;
    }

    if (!(await reclamarParaEnvio(id))) {
      resultado.omitidos.push({ id, motivo: "ya_reclamado" });
      continue;
    }
    // Otra petición pudo reclamar a la vez: la fila ya cuenta en el recuento,
    // así que si el total pasa del tope (o no se sabe), se suelta.
    const total = await enviadosDesde(inicioDia);
    if (total === null || total > limiteDiario()) {
      await revertirEnvio(id, null);
      resultado.omitidos.push({ id, motivo: "tope_diario" });
      continue;
    }

    const baja = urlDeBaja(id);
    const { html, text } = componerCorreo(cuerpo.texto, baja);
    let detalle: string | null = null;
    let incierto: string | null = null;
    let resendId: string | null = null;
    try {
      const { data, error } = await resend.emails.send({
        from: formatFromHeader(null, from),
        to: (p.email as string).trim(),
        replyTo: RESPONDER_A,
        subject: asunto.texto,
        html,
        text,
        headers: { "List-Unsubscribe": `<${baja}>` },
      });
      if (error) detalle = error.message;
      else resendId = data?.id ?? null;
    } catch (err) {
      // Si la llamada lanza, el correo pudo haber salido: no se deshace nada.
      incierto = err instanceof Error ? err.message : String(err);
    }

    if (incierto !== null) {
      escritos.add(direccion);
      cupo -= 1;
      await anotarEnvioIncierto(id, incierto, plantilla.id);
      resultado.omitidos.push({ id, motivo: "resultado_incierto", detalle: incierto });
      continue;
    }

    if (detalle !== null) {
      await revertirEnvio(id, detalle);
      resultado.omitidos.push({ id, motivo: "fallo_resend", detalle });
      continue;
    }
    await registrarEnvio(id, { resendId, templateId: plantilla.id });
    resultado.enviados += 1;
    escritos.add(direccion);
    cupo -= 1;
  }

  return resultado;
}
