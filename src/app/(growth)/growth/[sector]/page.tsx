import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GROWTH } from "@/lib/growth-config";
import { SECTORES_GROWTH, sectorPorSlug } from "@/lib/growth-sectores";
import { PaginaGrowth } from "../_components/PaginaGrowth";

/**
 * La misma landing, escrita para un sector.
 *
 * **Cuelga de `/growth` y no de un dominio ni un subdominio propio**: es lo que
 * se pidió, y además es lo que hace que la autoridad que gane cada una se sume a
 * la de la landing madre en vez de repartirse.
 *
 * Lo que cambia respecto a la general son tres cosas —la cabecera, los números de
 * la comparativa y las preguntas frecuentes—, y están en `growth-sectores.ts`
 * con el porqué de cada una. El cuerpo es el mismo componente.
 */

/**
 * Solo los cuatro que existen.
 *
 * Con `dynamicParams` en falso, `/growth/veterinaria` devuelve 404 en vez de
 * intentar renderizarse: sin esto, cualquier palabra detrás de `/growth/` sería
 * una URL viva que Google podría indexar vacía.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SECTORES_GROWTH.map((s) => ({ sector: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector } = await params;
  const datos = sectorPorSlug(sector);
  if (!datos) return {};

  const url = `${GROWTH.path}/${datos.slug}`;
  return {
    title: datos.metaTitulo,
    description: datos.metaDescripcion,
    // Cada una es canónica de sí misma. Apuntarlas todas a /growth las borraría
    // de los resultados, que es justo lo contrario de para lo que existen.
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${datos.metaTitulo} — dinkbit`,
      description: datos.metaDescripcion,
      siteName: "dinkbit",
    },
  };
}

export default async function PaginaSectorGrowth({
  params,
}: {
  params: Promise<{ sector: string }>;
}) {
  const { sector } = await params;
  const datos = sectorPorSlug(sector);
  if (!datos) notFound();

  return <PaginaGrowth sector={datos} />;
}
