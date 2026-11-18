import { NextResponse, type NextRequest } from "next/server";
import { crearClienteSesion } from "@/lib/ventas/auth";
import { RUTA_NUEVA } from "@/lib/ventas/recuperar";

/**
 * Adonde vuelve el enlace del correo de recuperación. Supabase trae un `code`
 * que se canjea por una sesión (PKCE: solo funciona en el navegador que pidió
 * el enlace) y se pasa a poner la contraseña nueva.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const destino = (ruta: string) => NextResponse.redirect(new URL(ruta, req.nextUrl.origin));
  if (!code) return destino("/panel/ventas/login/recuperar?error=enlace");

  const supabase = await crearClienteSesion();
  if (!supabase) return destino("/panel/ventas/login?error=config");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[recuperar] exchangeCodeForSession:", error.message);
    return destino("/panel/ventas/login/recuperar?error=enlace");
  }
  return destino(RUTA_NUEVA);
}
