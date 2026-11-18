import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getMarcaPorId } from "@/lib/ventas/db";
import { inicioDeMarca, rolConMarca } from "@/lib/ventas/rutas";

/**
 * La entrada del panel. Admin y comercial empiezan en Mi día; la lista de
 * clientes está en /panel/clientes. La clienta y la agente, en su marca.
 * El aviso de permiso (de `requireUsuaria` y compañía) viaja con la redirección.
 */
export default async function PanelVentasPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const usuaria = await requireUsuaria();
  if (rolConMarca(usuaria.rol)) {
    const marca = usuaria.marca_id ? await getMarcaPorId(usuaria.marca_id) : null;
    redirect(marca ? inicioDeMarca(usuaria.rol, marca.slug) : "/panel/login?aviso=sin-marca");
  }
  const { aviso } = await searchParams;
  redirect(aviso === "permiso" ? "/panel/hoy?aviso=permiso" : "/panel/hoy");
}
