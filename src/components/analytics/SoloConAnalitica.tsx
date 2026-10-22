"use client";

import { usePathname } from "next/navigation";
import { esRutaSinAnalitica } from "@/lib/rutas-sin-analitica";

/** Pinta su contenido salvo en las rutas sin analítica (ver rutas-sin-analitica.ts).
 *  usePathname ya tiene la ruta en el render del servidor, así que en esas
 *  rutas ni el HTML inicial lleva los scripts. */
export function SoloConAnalitica({ children }: { children: React.ReactNode }) {
  return esRutaSinAnalitica(usePathname()) ? null : <>{children}</>;
}
