import { NextResponse, type NextRequest } from "next/server";
import {
  verifyResendSignature,
  resendEventStatus,
  resendCampaignEventStatus,
} from "@/lib/resend-webhook";
import { marcarPorResendId, suprimir } from "@/lib/prospeccion/db";
import { setLeadEmailStatusByMessageId, setCampaignRecipientStatusByMessageId } from "@/lib/imagina-leads";

// Recibe los eventos de entrega de Resend (Svix) y actualiza el estado del email
// del lead en el CRM. La firma se verifica SIEMPRE; sin firma válida no se muta nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 500 });
  }

  // Cuerpo crudo (necesario para verificar la firma).
  const raw = await req.text();
  const valid = verifyResendSignature(
    secret,
    {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    },
    raw,
  );
  if (!valid) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string; id?: string } } = {};
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const messageId = event.data?.email_id ?? event.data?.id ?? null;
  const leadStatus = resendEventStatus(event.type ?? "");
  const recipientStatus = resendCampaignEventStatus(event.type ?? "");
  if (messageId && leadStatus) await setLeadEmailStatusByMessageId(messageId, leadStatus);
  if (messageId && recipientStatus) {
    await setCampaignRecipientStatusByMessageId(messageId, recipientStatus);
  }
  // Correos de prospección: se reconocen porque su id de Resend está guardado
  // en el prospecto. Un rebote o una queja lo sacan de circulación y vetan la
  // dirección para siempre.
  if (messageId && (leadStatus === "bounced" || leadStatus === "complained")) {
    const queja = leadStatus === "complained";
    const email = await marcarPorResendId(messageId, queja ? "baja" : "rebotado");
    if (email) await suprimir(email, "email", queja ? "queja" : "rebote");
  }
  // 200 con firma válida aunque no case ninguna fila → evita reintentos de Resend.
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: true, service: "resend-webhook", method: "POST" });
}
