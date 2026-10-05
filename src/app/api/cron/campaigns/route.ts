import { NextResponse, type NextRequest } from "next/server";
import { sendDueScheduledCampaigns } from "@/lib/campaign-send";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { enviarRecordatoriosPendientes } from "@/lib/whatsapp/recordatorio";

// Supabase (pg_cron + pg_net) llama aquí cada 5 minutos y se envían las
// campañas programadas cuya hora ya llegó, y los recordatorios de WhatsApp a
// quien no contestó al saludo. No es Vercel Cron porque el plan
// Hobby solo permite crons diarios: ver docs/sql/2026-09-16-campaign-schedule-cron.sql.
// La llamada trae `Authorization: Bearer $CRON_SECRET` (el mismo valor en
// Vercel y en el Vault de Supabase); sin ese secreto configurado no se envía
// nada, ni siquiera a quien conozca la URL.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_not_configured" }, { status: 500 });
  }
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const results = await sendDueScheduledCampaigns();

  // El mismo reloj sirve a los recordatorios de WhatsApp (ver
  // `whatsapp/recordatorio.ts`): son el otro envío que depende de la hora y no
  // de que alguien haga algo. Aparte y con su propio `catch`, para que un
  // fallo aquí no haga parecer que las campañas no salieron.
  let recordatorios: { enviados: number; fallidos: number } | { error: string };
  try {
    recordatorios = await enviarRecordatoriosPendientes();
  } catch (e) {
    console.error("[cron] fallo enviando los recordatorios de WhatsApp", e);
    recordatorios = { error: "recordatorios_failed" };
  }

  return NextResponse.json({ ok: true, results, recordatorios });
}
