import { NextResponse, type NextRequest } from "next/server";
import { verificarTokenBaja } from "@/lib/prospeccion/baja-token";
import { darDeBaja } from "@/lib/prospeccion/db";

// Enlace de baja de los correos de prospección. Abrirlo (GET) solo pregunta:
// los filtros de correo visitan los enlaces por su cuenta, y una baja hecha en
// el GET se la llevaría quien nunca la pidió. La baja se hace en el POST, que
// es lo que envía el botón de la página y también el «darse de baja» de un
// clic de los clientes de correo (RFC 8058). Además de marcar el prospecto, el
// email entra en la lista de supresión: si la misma empresa vuelve a salir en
// otra búsqueda, sigue sin recibir nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUTA = "/api/prospeccion/baja";

const escaparHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** `cuerpo` es HTML ya compuesto aquí: nada de la petición entra sin escapar. */
function page(titulo: string, cuerpo = "", status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><body style="font-family:system-ui;background:#f1f5f9;color:#0f172a;text-align:center;padding:64px 20px;"><h1 style="font-size:22px;">${titulo}</h1>${cuerpo}<p><a href="https://www.dinkbit.es" style="color:#187bef;">dinkbit.es</a></p></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

const noValido = () =>
  page(
    "Enlace de baja no válido o caducado.",
    "<p>Escríbenos a hola@dinkbit.es y te damos de baja a mano.</p>",
  );

/** Solo de la URL: el cuerpo del POST se ignora (el de un clic es fijo). */
function credenciales(req: NextRequest): { id: string; token: string } | null {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  return id && verificarTokenBaja(id, token) ? { id, token } : null;
}

export async function GET(req: NextRequest) {
  const c = credenciales(req);
  if (!c) return noValido();
  const destino = `${RUTA}?id=${encodeURIComponent(c.id)}&token=${encodeURIComponent(c.token)}`;
  return page(
    "¿Quieres dejar de recibir correos de dinkbit?",
    `<form method="post" action="${escaparHtml(destino)}">` +
      `<button type="submit" style="font:inherit;font-weight:600;background:#187bef;color:#fff;border:0;border-radius:8px;padding:12px 22px;cursor:pointer;">Sí, darme de baja</button>` +
      `</form>`,
  );
}

export async function POST(req: NextRequest) {
  const c = credenciales(req);
  if (!c) return noValido();
  // Si no se pudo guardar, se dice: confirmar una baja que no existe es peor
  // que un error, y el 500 hace que el cliente de correo lo reintente.
  if (!(await darDeBaja(c.id))) {
    return page(
      "No hemos podido registrar tu baja.",
      "<p>Vuelve a intentarlo en unos minutos o escríbenos a hola@dinkbit.es y te damos de baja a mano.</p>",
      500,
    );
  }
  return page("Hecho. No recibirás más correos nuestros.");
}
