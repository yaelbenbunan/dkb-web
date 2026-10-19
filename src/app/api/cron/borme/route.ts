import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { importarBorme } from "@/lib/prospeccion/importar-borme";

// Supabase (pg_cron + pg_net) llama aquí una vez por semana: se importan las
// sociedades constituidas del BORME de los últimos 10 días (la semana y un
// margen por si una ejecución falló). Re-ejecutable: upsert por id. Mismo
// secreto que /api/cron/campaigns: ver docs/sql/2026-10-19-prospeccion-borme-cron.sql.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DIAS = 10;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "cron_not_configured" }, { status: 500 });
  if (!isAuthorizedCronRequest(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const r = await importarBorme({ dias: DIAS });
  if (!r.ok) console.error("[cron/borme]", r.error);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
