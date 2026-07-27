import Link from "next/link";
import { listCampaigns } from "@/lib/campaigns";
import { CampaignsList } from "./CampaignsList";

export const metadata = {
  title: "Campañas — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CampanasPage() {
  const campaigns = await listCampaigns();

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
          <strong style={{ fontSize: 16 }}>Campañas</strong>
          <Link
            href="/panel"
            style={{ fontSize: 13, color: "#cbd5e1", textDecoration: "none" }}
          >
            ← Leads
          </Link>
        </div>
      </header>

      <div style={{ padding: 22 }}>
        <CampaignsList campaigns={campaigns} />
      </div>
    </div>
  );
}
