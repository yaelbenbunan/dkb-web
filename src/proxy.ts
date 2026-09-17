import { NextResponse, type NextRequest } from "next/server";
import { PANEL_COOKIE, verifySessionToken } from "@/lib/panel-auth";
import { clasificarRutaPanel } from "@/lib/ventas/rutas";
import { proxyVentas } from "@/lib/ventas/sesion-proxy";

// Protege todo /panel. Dos accesos distintos (Next 16, convención "proxy"):
// - /panel/ventas: login por persona con Supabase Auth (módulo de ventas B2B).
// - resto de /panel: contraseña compartida con cookie firmada.
export async function proxy(req: NextRequest) {
  const ruta = clasificarRutaPanel(req.nextUrl.pathname);
  if (ruta === "ventas" || ruta === "ventas-login") return proxyVentas(req, ruta === "ventas-login");
  if (ruta === "panel-login") return NextResponse.next();

  const token = req.cookies.get(PANEL_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/panel/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/panel/:path*"],
};
