import { notFound } from "next/navigation";
import {
  enviadosDesde,
  listarBusquedas,
  listarPlantillas,
  listarProspectos,
} from "@/lib/prospeccion/db";
import {
  inicioDelDiaMadrid,
  limiteDiario,
  remitentesProspeccion,
} from "@/lib/prospeccion/reglas-envio";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { listUsuarias, resolverLeadsEnlazados } from "@/lib/ventas/db";
import { tieneProspeccion } from "@/lib/ventas/rutas";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { Prospeccion } from "./Prospeccion";

export const metadata = {
  title: "Prospección — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
// Las acciones de esta página son largas: «Buscar en su web» lee hasta 3 páginas con 6 s de espera cada una, y un envío múltiple va correo a correo.
export const maxDuration = 60;

export default async function ProspeccionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Admin y comercial; la clienta no entra (no está en SECCIONES_CLIENTE).
  const { usuaria, marca } = await requireAccesoMarca(slug, "prospeccion");
  if (!tieneProspeccion(marca.slug)) notFound();

  const [prospectos, busquedas, plantillas, enviadosHoy] = await Promise.all([
    listarProspectos(),
    listarBusquedas(),
    listarPlantillas(),
    enviadosDesde(inicioDelDiaMadrid(new Date())),
  ]);
  // Sin enlaces se pinta igual («En el embudo», sin enlace a la ficha).
  const enlaces = await resolverLeadsEnlazados(
    marca.id,
    prospectos.map((p) => p.lead_id).filter((id): id is string => Boolean(id)),
  ).catch((error) => {
    console.error("[prospeccion] no se pudieron resolver los leads enlazados", error);
    return new Map<string, string>();
  });

  // Quién registró cada consentimiento. Sin nombres se pinta igual.
  const nombres = await listUsuarias().catch((error) => {
    console.error("[prospeccion] no se pudieron leer las usuarias", error);
    return [];
  });

  return (
    <div>
      <MarcaCabecera marca={marca} activa="prospeccion" rol={usuaria.rol} />
      <Prospeccion
        slug={marca.slug}
        prospectos={prospectos}
        enlaces={Object.fromEntries(enlaces)}
        busquedas={busquedas}
        plantillas={plantillas}
        enviadosHoy={enviadosHoy ?? 0}
        limite={limiteDiario()}
        remitentes={remitentesProspeccion()}
        nombres={Object.fromEntries(nombres.map((u) => [u.id, u.nombre]))}
      />
    </div>
  );
}
