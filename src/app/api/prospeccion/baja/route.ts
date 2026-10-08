import { NextResponse, type NextRequest } from "next/server";
import { verificarTokenBaja } from "@/lib/prospeccion/baja-token";
import { getProspecto, marcarEstado, suprimir } from "@/lib/prospeccion/db";

// Enlace de baja de los correos de prospección. Además de marcar el prospecto,
// el email entra en la lista de supresión: si la misma empresa vuelve a salir
// en otra búsqueda, sigue sin recibir nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(msg: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;background:#f1f5f9;color:#0f172a;text-align:center;padding:64px 20px;"><h1 style="font-size:22px;">${msg}</h1><p><a href="https://www.dinkbit.es" style="color:#187bef;">dinkbit.es</a></p></body>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!id || !verificarTokenBaja(id, token)) {
    return page("Enlace de baja no válido o caducado.");
  }
  const prospecto = await getProspecto(id);
  if (prospecto) {
    await marcarEstado([id], "baja");
    if (prospecto.email) await suprimir(prospecto.email, "email", "baja");
  }
  return page("Hecho. No recibirás más correos nuestros.");
}
