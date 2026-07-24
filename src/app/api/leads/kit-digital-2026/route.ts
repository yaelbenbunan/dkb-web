import { NextResponse, type NextRequest } from "next/server";
import { providedSecret, secretMatches } from "@/lib/webhook-auth";
import { handleKitDigital2026MetaLead } from "@/lib/kit-digital-2026-meta";

// Endpoint dedicado para leads de la campaña de Meta Lead Ads del Kit Digital.
// Zapier reenvía aquí el lead crudo → se guarda en el CRM (canal Meta, campaña
// "Kit Digital 2026") y se le manda el email "casi has terminado" con el botón
// a la landing.
//
// Secreto propio: usa KIT_DIGITAL_2026_WEBHOOK_SECRET si está definido (así esta
// campaña tiene su propio secreto, independiente del de otras campañas que usan
// /api/leads). Si no está, cae al compartido LEADS_WEBHOOK_SECRET para no romper
// nada durante la transición.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected =
    process.env.KIT_DIGITAL_2026_WEBHOOK_SECRET ?? process.env.LEADS_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: "missing_name_email_or_phone" }, { status: 400 });
  }

  const res = await handleKitDigital2026MetaLead({
    id: pick("id", "leadgen_id", "lead_id", "external_id"),
    name,
    email,
    phone,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: res.id });
}

// Health check para confirmar la URL desde el navegador.
export function GET() {
  return NextResponse.json({ ok: true, service: "kit-digital-2026-meta-webhook", method: "POST" });
}
