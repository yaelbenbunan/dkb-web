import type { Metadata } from "next";
import { GROWTH } from "@/lib/growth-config";
import { GENERAL } from "@/lib/escala-sectores";
import { PaginaEscala } from "./_components/PaginaEscala";

/**
 * La landing de captación del sistema para clínicas.
 *
 * **El cuerpo vive en `PaginaEscala`**, compartido con las landings por sector
 * (`/escala/dental`, `/escala/estetica`…). Aquí solo queda la metadata y los
 * datos de la versión general.
 *
 * Se extrajo cuando aparecieron las hermanas por sector: la alternativa era
 * copiar el fichero entero por cada una, y con cinco copias el día que cambie el
 * precio hay que acordarse de tocarlo en cinco sitios. Lo que se ve en esta
 * página no cambió ni un píxel — `GENERAL` lleva exactamente los mismos textos y
 * las mismas cifras que estaban escritos aquí.
 */
export const metadata: Metadata = {
  title: GENERAL.metaTitulo,
  description: GENERAL.metaDescripcion,
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: "Llenar tu agenda es fácil. Ganar más, no — dinkbit",
    description:
      "Nos ocupamos de todo el proceso con un único objetivo: que cada euro invertido genere más.",
    siteName: "dinkbit",
  },
};

export default function GrowthPage() {
  return <PaginaEscala sector={GENERAL} />;
}
