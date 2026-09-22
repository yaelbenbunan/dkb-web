import { listCampaigns, listCampaignRecipients } from "@/lib/campaigns";
import {
  hasEngagementTracking,
  summarizeRecipientStatuses,
  type CampaignStats,
} from "@/lib/campaign-stats";
import { PanelShell } from "../_componentes/PanelShell";
import { CampaignsList } from "./CampaignsList";

export const metadata = {
  title: "Campañas — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const campaigns = await listCampaigns();
  // Rendimiento solo de las enviadas y con seguimiento: del resto no hay nada
  // que contar. Pocas campañas, así que una consulta por cada una basta.
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
    <PanelShell activa="campanas">
      <CampaignsList campaigns={campaigns} stats={stats} />
    </PanelShell>
  );
}
