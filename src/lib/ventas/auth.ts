import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ventasAuthConfig } from "./auth-config";
import { getUsuaria, type Usuaria } from "./db";
import { evaluarAcceso } from "./rutas";

export async function crearClienteSesion() {
  const config = ventasAuthConfig();
  if (!config) return null;
  const almacen = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Un Server Component no puede escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Usuaria con sesión válida Y perfil activo en ventas_usuarias, o null. */
export async function getUsuariaActual(): Promise<Usuaria | null> {
  const supabase = await crearClienteSesion();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const usuaria = await getUsuaria(data.user.id);
  return usuaria?.activa ? usuaria : null;
}

/** Para páginas y server actions: devuelve la usuaria o redirige. */
export async function requireUsuaria(rol?: "admin"): Promise<Usuaria> {
  const usuaria = await getUsuariaActual();
  const acceso = evaluarAcceso(usuaria, rol);
  if (acceso === "login") redirect("/panel/ventas/login");
  if (acceso === "permiso") redirect("/panel/ventas?aviso=permiso");
  return usuaria as Usuaria;
}
