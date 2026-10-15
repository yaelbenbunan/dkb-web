/**
 * Recordatorio de la mañana: un correo a cada admin y clienta con lo que tiene
 * asignado y está atrasado o vence hoy (seguimientos de leads y tareas
 * manuales), agrupado por proyecto. Es lo mismo que enseña «Mi día», y
 * `pendientesDelDia` lo usan los dos para que nunca cuenten distinto.
 *
 * Puro: recibe filas ya leídas. El envío está en `recordatorio-diario-envio.ts`.
 */

import { BRAND } from "../email-layout";
import type { Fase, Rol } from "./dominio";
import { formatoSeguimiento, type Ahora } from "./metricas";
import { estadoSeguimiento, vencimiento, type EstadoSeguimiento } from "./tablero";

const ZONA = "Europe/Madrid";
/** De 8:00 a 12:00, hora de Madrid. Después de las 12 ya no es «de la mañana»:
 *  si el reloj falló toda la mañana, ese día no sale. */
const HORA_DESDE = 8;
const HORA_HASTA = 12;

type MarcaRef = { nombre: string; slug: string } | null;

export interface SeguimientoPendiente {
  id: string;
  negocio: string;
  telefono: string | null;
  fase: Fase;
  proximo_seguimiento: string | null;
  proximo_seguimiento_hora?: string | null;
  marca: MarcaRef;
}

export interface TareaPendiente {
  id: string;
  titulo: string;
  vence: string | null;
  vence_hora: string | null;
  notas?: string | null;
  marca: MarcaRef;
}

export interface Pendientes<S extends SeguimientoPendiente, T extends TareaPendiente> {
  seguimientosAtrasados: S[];
  seguimientosHoy: S[];
  tareas: { t: T; estado: EstadoSeguimiento }[];
}

/** De lunes a viernes, dentro de la franja de la mañana, en hora de Madrid. */
export function tocaRecordatorio(now: Date): boolean {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  return dia !== "Sat" && dia !== "Sun" && hora >= HORA_DESDE && hora < HORA_HASTA;
}

/** Las comerciales no lo reciben: lo pidió así quien lleva el módulo. */
export function esDestinatariaRecordatorio(u: { rol: Rol; activa: boolean }): boolean {
  return u.activa && (u.rol === "admin" || u.rol === "cliente");
}

/** Lo atrasado y lo de hoy. La hora cuenta: una cita de hoy a las 10:00 está atrasada a las 10:01. */
export function pendientesDelDia<S extends SeguimientoPendiente, T extends TareaPendiente>(
  seguimientos: S[],
  tareas: T[],
  ahora: Ahora,
): Pendientes<S, T> {
  const estado = (l: S) => estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora ?? null, l.fase, ahora);
  return {
    seguimientosAtrasados: seguimientos.filter((l) => estado(l) === "atrasado"),
    seguimientosHoy: seguimientos.filter((l) => estado(l) === "hoy"),
    tareas: tareas
      .map((t) => ({ t, estado: vencimiento(t.vence, t.vence_hora, ahora) }))
      .filter((x): x is { t: T; estado: EstadoSeguimiento } => x.estado === "atrasado" || x.estado === "hoy"),
  };
}

interface Linea {
  texto: string;
  detalle: string | null;
  cuando: string;
  atrasado: boolean;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cuando(fecha: string, hora: string | null, atrasado: boolean): string {
  return atrasado ? `Atrasado · ${formatoSeguimiento(fecha, hora)}` : hora ? `Hoy · ${hora.slice(0, 5)}` : "Hoy";
}

/** Asunto, HTML y texto del correo, o `null` si no hay nada pendiente. */
export function construirRecordatorio(
  usuaria: { nombre: string; rol: Rol },
  p: Pendientes<SeguimientoPendiente, TareaPendiente>,
  ahora: Ahora,
  slugMarcaCliente: string | null,
): { subject: string; html: string; text: string } | null {
  const porProyecto = new Map<string, Linea[]>();
  const anadir = (marca: MarcaRef, l: Linea) => {
    const nombre = marca?.nombre ?? "Sin proyecto";
    porProyecto.set(nombre, [...(porProyecto.get(nombre) ?? []), l]);
  };

  for (const [lista, atrasado] of [[p.seguimientosAtrasados, true], [p.seguimientosHoy, false]] as const) {
    for (const l of lista) {
      anadir(l.marca, {
        texto: `Llamar a ${l.negocio}`,
        detalle: l.telefono,
        cuando: cuando(l.proximo_seguimiento ?? ahora.fecha, l.proximo_seguimiento_hora ?? null, atrasado),
        atrasado,
      });
    }
  }
  for (const { t, estado } of p.tareas) {
    const atrasado = estado === "atrasado";
    anadir(t.marca, { texto: t.titulo, detalle: t.notas?.trim() || null, cuando: cuando(t.vence ?? ahora.fecha, t.vence_hora, atrasado), atrasado });
  }

  const total = [...porProyecto.values()].reduce((n, ls) => n + ls.length, 0);
  if (total === 0) return null;

  // Lo atrasado arriba dentro de cada proyecto; los proyectos, por nombre.
  const grupos = [...porProyecto.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([nombre, ls]) => [nombre, [...ls].sort((a, b) => Number(b.atrasado) - Number(a.atrasado))] as const);

  const subject = `Tienes ${total} ${total === 1 ? "pendiente" : "pendientes"} hoy`;
  const url =
    usuaria.rol === "cliente" && slugMarcaCliente
      ? `${BRAND.siteUrl}/panel/ventas/${slugMarcaCliente}/tareas?de=yo`
      : `${BRAND.siteUrl}/panel/ventas/hoy`;
  const nombrePila = usuaria.nombre.trim().split(/\s+/)[0] || "";
  const saludo = nombrePila ? `Hola ${nombrePila}` : "Hola";
  const intro = `Esto es lo que tienes asignado para hoy (${formatoSeguimiento(ahora.fecha, null)}) o que se ha quedado atrasado.`;

  const text = [
    `${saludo},`,
    "",
    intro,
    ...grupos.flatMap(([nombre, ls]) => [
      "",
      `== ${nombre} ==`,
      ...ls.map((l) => `- ${l.texto} (${l.cuando})${l.detalle ? ` — ${l.detalle}` : ""}`),
    ]),
    "",
    `Ver en el panel: ${url}`,
  ].join("\n");

  const gruposHtml = grupos
    .map(
      ([nombre, ls]) => `
<h2 style="margin:24px 0 8px;font-size:16px;color:#0f172a;">${esc(nombre)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
${ls
  .map(
    (l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">
<strong>${esc(l.texto)}</strong>${l.detalle ? `<br><span style="color:#475569;white-space:pre-wrap;">${esc(l.detalle)}</span>` : ""}
</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;white-space:nowrap;text-align:right;vertical-align:top;color:${l.atrasado ? "#b91c1c" : "#334155"};${l.atrasado ? "font-weight:700;" : ""}">${esc(l.cuando)}</td></tr>`,
  )
  .join("\n")}
</table>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;"><tr><td style="padding:28px 24px;">
<p style="margin:0 0 8px;font-size:16px;color:#0f172a;">${esc(saludo)},</p>
<p style="margin:0;font-size:14px;color:#475569;">${esc(intro)}</p>
${gruposHtml}
<p style="margin:28px 0 0;"><a href="${esc(url)}" style="display:inline-block;background:${BRAND.accentHex};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;">Ver en el panel</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}
