import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { verificarFirmaMeta } from "@/lib/whatsapp/firma";
import { procesarWebhook } from "@/lib/whatsapp/procesar";

// Webhook de WhatsApp Cloud API. La firma se verifica SIEMPRE; sin firma
// válida no se parsea el cuerpo ni se toca la base.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Comparación en tiempo constante, igual criterio que `verificarFirmaMeta` en firma.ts. */
function coincideToken(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  const recibido = url.searchParams.get("hub.verify_token");
  if (
    esperado &&
    recibido !== null &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    coincideToken(recibido, esperado)
  ) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 500 });
  }

  const raw = await req.text();
  if (!verificarFirmaMeta(appSecret, req.headers.get("x-hub-signature-256"), raw)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  try {
    await procesarWebhook({ cuerpo });
  } catch (e) {
    // `procesarWebhook` solo deja escapar fallos de FASE A: ocurridos ANTES
    // de guardar el mensaje entrante (ver procesar.ts), o sea reintentables
    // — el wamid todavía no existe, así que un reintento de Meta no duplica
    // nada. Por eso aquí SÍ se responde 500 a propósito: es lo que hace que
    // Meta reintente. Todo lo de después de guardar (envío, saliente,
    // actividad) ya se traga dentro de procesarWebhook y nunca llega aquí.
    console.error("[whatsapp] fallo reintentable procesando el webhook", e);
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
