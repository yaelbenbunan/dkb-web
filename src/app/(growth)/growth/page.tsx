import type { Metadata } from "next";
import { GROWTH } from "@/lib/growth-config";
import { GENERAL } from "@/lib/growth-sectores";
import { PaginaGrowth } from "./_components/PaginaGrowth";

/**
 * La landing de Growth: captación de pacientes para clínicas con una landing
 * propia y campañas en Google y Meta.
 *
 * **El cuerpo vive en `PaginaGrowth`**, compartido con las landings por sector
 * (`/growth/dental`, `/growth/estetica`…). Aquí solo queda la metadata y los
 * datos de la versión general.
 *
 * Se extrajo cuando aparecieron las hermanas por sector: la alternativa era
 * copiar el fichero entero por cada una, y con cinco copias el día que cambie el
 * precio hay que acordarse de tocarlo en cinco sitios.
 */
export const metadata: Metadata = {
  title: GENERAL.metaTitulo,
  description: GENERAL.metaDescripcion,
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: `${GENERAL.metaTitulo} — dinkbit`,
    description: GENERAL.metaDescripcion,
    siteName: "dinkbit",
  },
};

export default function GrowthPage() {
  return <PaginaGrowth sector={GENERAL} />;
}
