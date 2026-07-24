import { NextResponse, type NextRequest } from "next/server";
import { verifyResendSignature, resendEventStatus } from "@/lib/resend-webhook";
import { setLeadEmailStatusByMessageId } from "@/lib/imagina-leads";

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

  const status = resendEventStatus(event.type ?? "");
  const messageId = event.data?.email_id ?? event.data?.id ?? null;
  if (status && messageId) {
    await setLeadEmailStatusByMessageId(messageId, status);
  }
  // 200 con firma válida aunque no case ninguna fila → evita reintentos de Resend.
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: true, service: "resend-webhook", method: "POST" });
}
