import "server-only";
import { setClientesAnclados, type Usuaria } from "./db";
import { alternarAnclado } from "./espacios";

/**
 * Quien crea un cliente lo tiene anclado en su menú desde el principio. Sin la
 * migración (`clientes_anclados` no viene), no hace nada. Fuera de los
 * ficheros "use server" a propósito: no es una acción que el navegador pueda llamar.
 */
export async function anclarAlCrear(usuaria: Usuaria, marcaId: string): Promise<void> {
  if (!Array.isArray(usuaria.clientes_anclados) || usuaria.clientes_anclados.includes(marcaId)) return;
  await setClientesAnclados(usuaria.id, alternarAnclado(usuaria.clientes_anclados, marcaId));
}
