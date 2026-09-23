import { NextResponse, type NextRequest } from "next/server";
import { verificarFirmaMeta } from "@/lib/whatsapp/firma";
import { procesarWebhook } from "@/lib/whatsapp/procesar";

// Webhook de WhatsApp Cloud API. La firma se verifica SIEMPRE; sin firma
// válida no se parsea el cuerpo ni se toca la base.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    esperado &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === esperado
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
    // Un 500 solo provoca reintentos de Meta y más ruido. Se registra y se
    // devuelve 200: el mensaje entrante, si llegó a guardarse, ya está.
    console.error("[whatsapp] fallo procesando el webhook", e);
  }
  return NextResponse.json({ ok: true });
}
