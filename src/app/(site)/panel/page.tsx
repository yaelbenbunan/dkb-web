import { listLeads } from "@/lib/imagina-leads";
import { dueCount, todayInMadrid } from "@/lib/followup-agenda";
import { PanelShell } from "./_componentes/PanelShell";
import { LeadsTable, type LeadRowView } from "./LeadsTable";

export const metadata = {
  title: "Panel de leads — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const leads = await listLeads();
  const configured =
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    <PanelShell activa="leads" agendaCount={pendingCalls}>
      {!configured && (
        <p
          style={{
            background: "#fef9c3",
            border: "1px solid #fde047",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          ⚠️ Supabase no está configurado (faltan <code>SUPABASE_URL</code> /{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>). La tabla aparecerá vacía
          hasta que se configuren.
        </p>
      )}

      <LeadsTable leads={rows} />
    </PanelShell>
  );
}
