import { NextResponse, type NextRequest } from "next/server";
import { sendDueScheduledCampaigns } from "@/lib/campaign-send";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Supabase (pg_cron + pg_net) llama aquí cada 5 minutos y se envían las
// campañas programadas cuya hora ya llegó. No es Vercel Cron porque el plan
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
  return NextResponse.json({ ok: true, results });
}
