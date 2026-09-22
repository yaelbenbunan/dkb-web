import { NextResponse, type NextRequest } from "next/server";
import { crearLimitador, esEnvioBot, origenPermitido } from "@/lib/ventas/formulario-web";
import { recibirLeadFormulario } from "@/lib/ventas/servicios";

// Entrada pública de leads desde formularios web de las marcas (p. ej. la landing
// B2B de Hydrup en Shopify). Sin secreto: se acota por origen, trampa y límite.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const permitir = crearLimitador({ max: 5, ventanaMs: 10 * 60 * 1000 });

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = req.headers.get("origin");
  if (!origenPermitido(slug, origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: cors(origin!) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = req.headers.get("origin");
  if (!origenPermitido(slug, origin)) {
    return NextResponse.json({ ok: false, error: "forbidden_origin" }, { status: 403 });
  }
  const headers = cors(origin!);

  // x-real-ip lo pone Vercel y el cliente no puede tocarlo; x-forwarded-for sí
  // (un cliente puede mandar cualquier valor), así que solo se usa de respaldo.
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "desconocida";
  if (!permitir(`${slug}:${ip}`)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers });
  }

  let datos: unknown;
  try {
    datos = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400, headers });
  }

  // Al bot se le responde como si todo fuera bien, para no enseñarle la trampa.
  if (datos && typeof datos === "object" && esEnvioBot(datos as Record<string, unknown>)) {
    return NextResponse.json({ ok: true }, { status: 200, headers });
  }

  const res = await recibirLeadFormulario({ slug, datos });
  return NextResponse.json({ ok: res.body.ok, ...(res.body.ok ? {} : { error: res.body.error }) }, { status: res.status, headers });
}
