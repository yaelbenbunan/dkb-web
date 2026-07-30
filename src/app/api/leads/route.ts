import { NextResponse, type NextRequest } from "next/server";
import { createWebhookLead } from "@/lib/imagina-leads";
import { providedSecret, secretMatches } from "@/lib/webhook-auth";
import { CONSENT_KEYS, parseConsentAnswer } from "@/lib/consent";

// Inbound lead webhook — e.g. Zapier (Meta Lead Ads) → POST here → CRM table.
// Protected by a shared secret. Accepts JSON or form-encoded bodies and is
// lenient about field names so the Zap mapping is easy.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.LEADS_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "webhook_not_configured" },
      { status: 500 },
    );
  }
  if (!secretMatches(providedSecret(req), expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let data: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      data = (await req.json()) as Record<string, unknown>;
    } else {
      const fd = await req.formData();
      data = Object.fromEntries(fd.entries());
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
    return null;
  };

  const name = pick("name", "full_name", "fullName", "nombre");
  const email = pick("email", "correo", "e-mail");
  const phone = pick("phone", "phone_number", "phoneNumber", "telefono", "teléfono");

  if (!name && !email && !phone) {
    return NextResponse.json(
      { ok: false, error: "missing_name_email_or_phone" },
      { status: 400 },
    );
  }

  const res = await createWebhookLead({
    id: pick("id", "leadgen_id", "lead_id", "external_id"),
    name,
    email,
    phone,
    channel: pick("channel", "canal") ?? "Meta",
    campaign: pick("campaign", "campaign_name", "campaña", "campana"),
    notes: pick("notes", "notas", "notas adicionales", "message", "mensaje", "extra"),
    // Respuesta de la casilla de consentimiento del formulario de Meta. Sin
    // esto el lead entra con consent null y queda fuera de las campañas aunque
    // el usuario la hubiera marcado.
    consent: parseConsentAnswer(pick(...CONSENT_KEYS)),
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: res.id });
}

// Simple health check so you can confirm the URL is live from a browser.
export function GET() {
  return NextResponse.json({ ok: true, service: "leads-webhook", method: "POST" });
}
