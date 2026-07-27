import Link from "next/link";
import { getCampaign, listEmailTemplates, getBuiltinTemplates } from "@/lib/campaigns";
import type { EmailTemplateRow } from "@/lib/campaigns";
import { listEmailableLeads } from "@/lib/imagina-leads";
import { CampaignWizard } from "./CampaignWizard";

export const metadata = {
  title: "Campaña — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);

  const containerStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    overflow: "auto",
    background: "#f1f5f9",
    color: "#0f172a",
    fontFamily: "system-ui, sans-serif",
  } as const;

  const headerStyle = {
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
  } as const;

  if (!campaign) {
    return (
      <div style={containerStyle}>
        <header style={headerStyle}>
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
            <strong style={{ fontSize: 16 }}>Campaña</strong>
            <Link
              href="/panel/campanas"
              style={{ fontSize: 13, color: "#cbd5e1", textDecoration: "none" }}
            >
              ← Campañas
            </Link>
          </div>
        </header>
        <div style={{ padding: 22 }}>
          <p style={{ fontSize: 15, color: "#64748b" }}>Campaña no encontrada.</p>
          <Link href="/panel/campanas" style={{ color: "#187bef", fontSize: 14 }}>
            ← Volver a campañas
          </Link>
        </div>
      </div>
    );
  }

  const builtin = await getBuiltinTemplates();
  const custom = await listEmailTemplates();
  const seen = new Set<string>();
  const templates: EmailTemplateRow[] = [];
  for (const t of [...builtin, ...custom]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    templates.push(t);
  }

  const emailableLeads = await listEmailableLeads();

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
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
          <strong style={{ fontSize: 16 }}>{campaign.name || "Campaña"}</strong>
          <Link
            href="/panel/campanas"
            style={{ fontSize: 13, color: "#cbd5e1", textDecoration: "none" }}
          >
            ← Campañas
          </Link>
        </div>
      </header>

      <div style={{ padding: 22 }}>
        <CampaignWizard campaign={campaign} templates={templates} emailableLeads={emailableLeads} />
      </div>
    </div>
  );
}
