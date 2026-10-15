import "server-only";
import { Resend } from "resend";
import {
  getMarcaPorId,
  liberarRecordatorioDiario,
  listSeguimientosUsuaria,
  listTareasUsuaria,
  listUsuarias,
  reclamarRecordatorioDiario,
} from "./db";
import { ahoraMadrid } from "./metricas";
import { construirRecordatorio, esDestinatariaRecordatorio, pendientesDelDia, tocaRecordatorio } from "./recordatorio-diario";

export type ResultadoRecordatorios =
  | { omitido: "fuera_de_horario" | "sin_configurar" | "falta_migracion" }
  | { enviados: number; sinPendientes: number; fallidos: number };

/**
 * Lo llama `/api/cron/campaigns` cada 5 minutos. Fuera de la franja no hace
 * nada; dentro, cada usuaria activa recibe como mucho un correo al día (la
 * reserva en `ventas_recordatorios_enviados` lo garantiza aunque se solapen
 * pasadas). Si el envío falla se libera la reserva y se reintenta en la
 * siguiente pasada, mientras siga siendo por la mañana.
 */
export async function enviarRecordatoriosDiarios(now: Date = new Date()): Promise<ResultadoRecordatorios> {
  if (!tocaRecordatorio(now)) return { omitido: "fuera_de_horario" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("[ventas/recordatorio] falta RESEND_API_KEY o CONTACT_EMAIL_FROM");
    return { omitido: "sin_configurar" };
  }
  const resend = new Resend(apiKey);
  const ahora = ahoraMadrid(now);
  const r = { enviados: 0, sinPendientes: 0, fallidos: 0 };

  for (const u of (await listUsuarias()).filter(esDestinatariaRecordatorio)) {
    const reserva = await reclamarRecordatorioDiario(u.id, ahora.fecha);
    if (reserva === "falta_migracion") {
      console.error("[ventas/recordatorio] falta ejecutar docs/sql/2026-10-15-ventas-recordatorio-diario.sql; no se envía nada.");
      return { omitido: "falta_migracion" };
    }
    if (reserva === "ya_enviado") continue;

    try {
      const [seguimientos, tareas, marca] = await Promise.all([
        listSeguimientosUsuaria(u.id, ahora.fecha),
        listTareasUsuaria(u.id),
        u.rol === "cliente" && u.marca_id ? getMarcaPorId(u.marca_id) : Promise.resolve(null),
      ]);
      const correo = construirRecordatorio(u, pendientesDelDia(seguimientos, tareas, ahora), ahora, marca?.slug ?? null);
      // Sin nada pendiente no se manda, y la reserva se queda: hoy ya está decidido.
      if (!correo) {
        r.sinPendientes++;
        continue;
      }
      const { error } = await resend.emails.send({ from, to: u.email, subject: correo.subject, html: correo.html, text: correo.text });
      if (error) throw new Error(error.message);
      r.enviados++;
    } catch (e) {
      console.error(`[ventas/recordatorio] fallo con la usuaria ${u.id}`, e);
      await liberarRecordatorioDiario(u.id, ahora.fecha);
      r.fallidos++;
    }
  }
  return r;
}
