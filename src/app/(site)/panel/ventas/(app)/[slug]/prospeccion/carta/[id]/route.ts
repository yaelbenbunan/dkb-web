import { getProspecto } from "@/lib/prospeccion/db";
import { cartaDeProspecto, pdfCarta } from "@/lib/prospeccion/carta";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import { tieneProspeccion } from "@/lib/ventas/rutas";

// La carta en PDF para una empresa recién constituida (prospecto del BORME).
// Mismo acceso que la pestaña de Prospección: admin y comercial de la marca.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const a = await accesoMarcaAccion(slug, "prospeccion");
  if (!a.ok) return new Response(a.error, { status: 403 });
  if (!tieneProspeccion(a.marca.slug)) return new Response("Esta marca no tiene prospección.", { status: 404 });
  if (!UUID.test(id)) return new Response("Empresa no encontrada.", { status: 404 });

  const p = await getProspecto(id);
  if (!p || p.source !== "borme") return new Response("Empresa no encontrada.", { status: 404 });

  const pdf = await pdfCarta(cartaDeProspecto(p));
  const archivo = `carta-${p.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "empresa"}.pdf`;
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${archivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
