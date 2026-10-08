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
import { PanelShell } from "../_componentes/PanelShell";
import { Prospeccion } from "./Prospeccion";

export const metadata = {
  title: "Prospección — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ProspeccionPage() {
  const [prospectos, busquedas, plantillas, enviadosHoy] = await Promise.all([
    listarProspectos(),
    listarBusquedas(),
    listarPlantillas(),
    enviadosDesde(inicioDelDiaMadrid(new Date())),
  ]);

  return (
    <PanelShell activa="prospeccion">
      <Prospeccion
        prospectos={prospectos}
        busquedas={busquedas}
        plantillas={plantillas}
        enviadosHoy={enviadosHoy}
        limite={limiteDiario()}
        remitentes={remitentesProspeccion()}
        placesConfigurado={!!process.env.GOOGLE_PLACES_API_KEY}
      />
    </PanelShell>
  );
}
