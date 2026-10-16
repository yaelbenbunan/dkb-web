import Link from "next/link";
import { hasEngagementTracking, summarizeRecipientStatuses } from "@/lib/campaign-stats";
import { getBuiltinTemplates, getCampaign, listCampaignRecipients, listEmailTemplates, type EmailTemplateRow } from "@/lib/campaigns";
import { listEmailableLeads, type LeadRow } from "@/lib/imagina-leads";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { campanaEsDeMarca, MODULO_CAMPANAS, tieneModulo } from "@/lib/ventas/campanas";
import { MARCA_DINKBIT_SLUG } from "@/lib/ventas/dominio";
import { listEmailableLeadsDeMarca } from "@/lib/ventas/leads-web";
import { ProveedorAccionesCampana } from "../../../../../_campanas/AccionesCampana";
import { CampaignStats } from "../../../../../_campanas/CampaignStats";
import { CampaignWizard } from "../../../../../_campanas/CampaignWizard";
import { MarcaCabecera } from "../../../../_componentes/MarcaCabecera";
import { tarjeta } from "../../../../_componentes/estilos";
import { accionesDeMarca } from "../acciones-marca";
import { ModuloApagado } from "../ModuloApagado";

/** Los mismos a los que `sendCampaign` dejará mandar: los de la marca de la campaña. */
async function destinatarios(marcaId: string, conMarca: boolean): Promise<{ leads: LeadRow[]; fallo: boolean }> {
  try {
    return { leads: conMarca ? await listEmailableLeadsDeMarca(marcaId) : await listEmailableLeads(), fallo: false };
  } catch (error) {
    console.error("[ventas/campanas] no se pudieron leer los destinatarios", error);
    return { leads: [], fallo: true };
  }
}

export default async function CampanaMarcaPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { usuaria, marca } = await requireAccesoMarca(slug, "campanas");
  const cabecera = <MarcaCabecera marca={marca} activa="campanas" rol={usuaria.rol} />;
  if (!tieneModulo(marca, MODULO_CAMPANAS)) {
    return (
      <div>
        {cabecera}
        <ModuloApagado slug={marca.slug} admin={usuaria.rol === "admin"} />
      </div>
    );
  }

  const volver = (
    <Link href={`/panel/ventas/${marca.slug}/campanas`} style={{ fontSize: 13, color: "#187bef", textDecoration: "none" }}>
      ← Campañas
    </Link>
  );
  const encontrada = await getCampaign(id);
  // Una campaña de otra marca se responde igual que una que no existe.
  if (!encontrada || !campanaEsDeMarca(encontrada, marca)) {
    return (
      <div>
        {cabecera}
        <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 15, color: "#64748b" }}>Campaña no encontrada.</p>
          {volver}
        </section>
      </div>
    );
  }
  const campaign = encontrada;

  const ambito = { marcaId: marca.id, incluirSinMarca: marca.slug === MARCA_DINKBIT_SLUG };
  const [predefinidas, propias, { leads, fallo }] = await Promise.all([
    getBuiltinTemplates(),
    listEmailTemplates(ambito),
    destinatarios(marca.id, Boolean(campaign.marca_id)),
  ]);
  const vistas = new Set<string>();
  const templates: EmailTemplateRow[] = [];
  for (const t of [...predefinidas, ...propias]) {
    if (vistas.has(t.id)) continue;
    vistas.add(t.id);
    templates.push(t);
  }

  const showStats = campaign.status === "sent" || campaign.status === "sending";
  const recipients = showStats ? await listCampaignRecipients(campaign.id) : [];

  return (
    <div>
      {cabecera}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          {volver}
          <strong style={{ fontSize: 16 }}>{campaign.name || "Campaña"}</strong>
        </div>
        {fallo && (
          <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
            No se pudieron leer los leads de la marca. Recarga la página antes de elegir destinatarios.
          </p>
        )}
        {showStats && (
          <CampaignStats
            stats={summarizeRecipientStatuses(recipients.map((r) => r.status))}
            recipients={recipients}
            tracked={hasEngagementTracking(campaign.sent_at)}
          />
        )}
        <ProveedorAccionesCampana acciones={accionesDeMarca(marca)}>
          <CampaignWizard campaign={campaign} templates={templates} emailableLeads={leads} />
        </ProveedorAccionesCampana>
      </div>
    </div>
  );
}
