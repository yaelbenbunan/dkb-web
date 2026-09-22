import { listLeads } from "@/lib/imagina-leads";
import { dueCount, todayInMadrid } from "@/lib/followup-agenda";
import { PanelShell } from "../_componentes/PanelShell";
import { Agenda } from "../Agenda";
import type { LeadRowView } from "../LeadsTable";

export const metadata = {
  title: "Agenda — Panel de leads · dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const leads = await listLeads();

  const rows: LeadRowView[] = leads.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    name: l.name,
    phone: l.phone,
    email: l.email,
    channel: l.channel,
    campaign: l.campaign,
    website: l.current_website,
    notes: l.notes,
    followup: l.followup,
    followup_at: l.followup_at,
    account_manager: l.account_manager,
    status: String(l.status),
    email_status: l.email_status,
    archived: l.archived,
    consent: l.consent,
  }));

  const pendingCalls = dueCount(rows, todayInMadrid());

  return (
    <PanelShell activa="agenda" agendaCount={pendingCalls}>
      <Agenda leads={rows} />
    </PanelShell>
  );
}
