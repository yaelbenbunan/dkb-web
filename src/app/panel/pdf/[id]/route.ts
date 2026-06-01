import { getLeadPdfPath, getSignedPdfUrl } from "@/lib/imagina-leads";

// Auth is enforced by middleware (matcher /panel/:path*). Looks up the lead's
// stored PDF and 302-redirects to a short-lived signed URL.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const path = await getLeadPdfPath(id);
  if (!path) return new Response("PDF no encontrado", { status: 404 });
  const url = await getSignedPdfUrl(path);
  if (!url) return new Response("No se pudo generar el enlace", { status: 500 });
  return Response.redirect(url, 302);
}
