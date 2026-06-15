import Link from "next/link";
import { listLeads } from "@/lib/imagina-leads";
import { LeadsTable, type LeadRowView } from "./LeadsTable";
import { panelLogout } from "./actions";

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
    account_manager: l.account_manager,
    status: String(l.status),
    archived: l.archived,
  }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        background: "#f1f5f9",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 22px",
          background: "#0b1220",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontWeight: 800,
              letterSpacing: 2,
              color: "#187bef",
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            dinkbit
          </span>
          <strong style={{ fontSize: 16 }}>Leads · CRM</strong>
          <Link
            href="/panel/calculadora"
            style={{ fontSize: 13, color: "#cbd5e1", textDecoration: "none" }}
          >
            🧮 Calculadora
          </Link>
        </div>
        <form action={panelLogout} style={{ margin: 0 }}>
          <button
            type="submit"
            style={{
              border: "1px solid #334155",
              background: "transparent",
              color: "#cbd5e1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </form>
      </header>

      <div style={{ padding: 22 }}>
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
      </div>
    </div>
  );
}
