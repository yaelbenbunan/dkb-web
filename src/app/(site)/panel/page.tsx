import { listLeads } from "@/lib/imagina-leads";
import { PanelShell } from "./_componentes/PanelShell";
import { LeadsConsulta } from "./LeadsConsulta";

export const metadata = {
  title: "Leads antiguos — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** El /panel viejo, solo de consulta: los leads se trabajan en /panel/ventas. */
export default async function PanelPage() {
  const leads = await listLeads(5000);
  return (
    <PanelShell activa="leads">
      <LeadsConsulta
        leads={leads.map((l) => ({
          id: l.id,
          created_at: l.created_at,
          name: l.name,
          phone: l.phone,
          email: l.email,
          channel: l.channel,
          campaign: l.campaign,
          status: String(l.status),
          account_manager: l.account_manager,
          archived: l.archived,
        }))}
      />
    </PanelShell>
  );
}
