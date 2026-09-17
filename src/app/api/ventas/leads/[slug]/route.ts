import { NextResponse, type NextRequest } from "next/server";
import { providedSecret } from "@/lib/webhook-auth";
import { recibirLeadAnuncio } from "@/lib/ventas/servicios";

// Entrada de leads de anuncios para una marca del servicio de ventas B2B.
// Zapier (Meta Lead Ads) o una landing hacen POST con el secreto de la marca en
// `x-webhook-secret` (o `Authorization: Bearer`). El secreto está en
// /panel/ventas/[slug]/condiciones.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let datos: unknown;
  try {
    const tipo = req.headers.get("content-type") ?? "";
    datos = tipo.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const res = await recibirLeadAnuncio({ slug, secreto: providedSecret(req), datos });
  return NextResponse.json(res.body, { status: res.status });
}
