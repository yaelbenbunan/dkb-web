import { hasEngagementTracking, summarizeRecipientStatuses, type CampaignStats } from "@/lib/campaign-stats";
import { listCampaignRecipients, listCampaigns } from "@/lib/campaigns";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { MODULO_CAMPANAS, tieneModulo } from "@/lib/ventas/campanas";
import { MARCA_DINKBIT_SLUG } from "@/lib/ventas/dominio";
import { ProveedorAccionesCampana } from "../../../../_campanas/AccionesCampana";
import { CampaignsList } from "../../../../_campanas/CampaignsList";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { accionesDeMarca } from "./acciones-marca";
import { ModuloApagado } from "./ModuloApagado";

export default async function CampanasMarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { usuaria, marca } = await requireAccesoMarca(slug, "campanas");
  if (!tieneModulo(marca, MODULO_CAMPANAS)) {
    return (
      <div>
        <MarcaCabecera marca={marca} activa="campanas" rol={usuaria.rol} />
        <ModuloApagado slug={marca.slug} admin={usuaria.rol === "admin"} />
      </div>
    );
  }

  const campaigns = await listCampaigns(200, { marcaId: marca.id, incluirSinMarca: marca.slug === MARCA_DINKBIT_SLUG });
  // Como en el /panel viejo: rendimiento solo de las enviadas con seguimiento.
  const stats: Record<string, CampaignStats> = {};
  await Promise.all(
    campaigns
      .filter((c) => c.status === "sent" && hasEngagementTracking(c.sent_at))
      .map(async (c) => {
        const recipients = await listCampaignRecipients(c.id);
        stats[c.id] = summarizeRecipientStatuses(recipients.map((r) => r.status));
      }),
  );

  return (
    <div>
      <MarcaCabecera marca={marca} activa="campanas" rol={usuaria.rol} />
      <ProveedorAccionesCampana acciones={accionesDeMarca(marca)}>
        <CampaignsList campaigns={campaigns} stats={stats} />
      </ProveedorAccionesCampana>
    </div>
  );
}
