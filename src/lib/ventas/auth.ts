import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ventasAuthConfig } from "./auth-config";
import { getMarcaPorSlug, getUsuaria, type Marca, type Usuaria } from "./db";
import { evaluarAcceso, evaluarAccesoMarca, type SeccionMarca } from "./rutas";

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
export async function requireUsuaria(rol?: "admin" | "equipo"): Promise<Usuaria> {
  const usuaria = await getUsuariaActual();
  const acceso = evaluarAcceso(usuaria, rol);
  if (acceso === "login") redirect("/panel/ventas/login");
  if (acceso === "permiso") redirect("/panel/ventas?aviso=permiso");
  return usuaria as Usuaria;
}

/** Admin y comercial ven todas las marcas, así que para ellas un slug que no existe
 *  es un error legítimo. Para cualquier otro rol (la clienta) se responde igual que
 *  ante una marca ajena: si no, el 404 delataría qué marcas existen. */
function veTodasLasMarcas(usuaria: Usuaria): boolean {
  return usuaria.rol === "admin" || usuaria.rol === "comercial";
}

/** Para páginas bajo /panel/ventas/[slug]: usuaria + marca, o redirige. */
export async function requireAccesoMarca(slug: string, seccion: SeccionMarca): Promise<{ usuaria: Usuaria; marca: Marca }> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) {
    if (!veTodasLasMarcas(usuaria)) redirect("/panel/ventas?aviso=permiso");
    notFound();
  }
  if (evaluarAccesoMarca(usuaria, marca.id, seccion) !== "ok") redirect("/panel/ventas?aviso=permiso");
  return { usuaria, marca };
}

/** Para server actions: sin sesión redirige; sin permiso o sin marca devuelve el error. */
export async function accesoMarcaAccion(
  slug: string,
  seccion: SeccionMarca,
): Promise<{ ok: true; usuaria: Usuaria; marca: Marca } | { ok: false; error: string }> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: veTodasLasMarcas(usuaria) ? "Marca no encontrada." : "No tienes permiso para esto." };
  if (evaluarAccesoMarca(usuaria, marca.id, seccion) !== "ok") return { ok: false, error: "No tienes permiso para esto." };
  return { ok: true, usuaria, marca };
}
