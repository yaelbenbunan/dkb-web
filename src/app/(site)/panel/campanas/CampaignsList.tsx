"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createDraftAction } from "./actions";
import type { CampaignRow } from "@/lib/campaigns";
import type { CampaignStats } from "@/lib/campaign-stats";

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#e2e8f0", text: "#334155" },
  scheduled: { bg: "#fef3c7", text: "#92400e" },
  sending: { bg: "#dbeafe", text: "#1e40af" },
  sent: { bg: "#dcfce7", text: "#166534" },
  failed: { bg: "#fee2e2", text: "#b91c1c" },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Error",
};

const th = {
  padding: "12px 14px",
  textAlign: "left" as const,
  fontWeight: 600,
  fontSize: 13,
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
};

const td = {
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 14,
  color: "#1e293b",
};

export function CampaignsList({
  campaigns,
  stats,
}: {
  campaigns: CampaignRow[];
  stats: Record<string, CampaignStats>;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();

  const onNewCampaign = () => {
    start(async () => {
      const res = await createDraftAction();
      if ("id" in res) {
        router.push(`/panel/campanas/${res.id}`);
      }
    });
  };

  if (campaigns.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 16,
            color: "#64748b",
            margin: 0,
          }}
        >
          Aún no hay campañas
        </p>
        <button
          type="button"
          onClick={onNewCampaign}
          disabled={busy}
          style={{
            background: "#187bef",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          ＋ Nueva campaña
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, color: "#475569" }}>
          {campaigns.length} campaña{campaigns.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onNewCampaign}
          disabled={busy}
          style={{
            background: "#187bef",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          ＋ Nueva campaña
        </button>
      </div>

      <div
        style={{
          overflowX: "auto",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 14,
            minWidth: 900,
          }}
        >
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ ...th }}>Fecha</th>
              <th style={{ ...th }}>Nombre</th>
              <th style={{ ...th }}>Asunto</th>
              <th style={{ ...th }}>Estado</th>
              <th style={{ ...th }}>Destinatarios</th>
              <th style={{ ...th }}>Enviada</th>
              <th style={{ ...th, textAlign: "right" }}>Abiertos</th>
              <th style={{ ...th, textAlign: "right" }}>Clics</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const statusKey = (campaign.status || "draft") as keyof typeof STATUS_COLORS;
              const colors = STATUS_COLORS[statusKey] || STATUS_COLORS.draft;
              const label = STATUS_LABELS[statusKey] || campaign.status;

              return (
                <tr key={campaign.id} style={{ verticalAlign: "top" }}>
                  <td style={{ ...td }}>{fmtDate(campaign.created_at)}</td>
                  <td style={{ ...td }}>
                    <a
                      href={`/panel/campanas/${campaign.id}`}
                      style={{
                        color: "#187bef",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/panel/campanas/${campaign.id}`);
                      }}
                    >
                      {campaign.name || "(sin nombre)"}
                    </a>
                  </td>
                  <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {campaign.subject || "—"}
                  </td>
                  <td style={{ ...td }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: colors.bg,
                        color: colors.text,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {campaign.recipients_total ?? 0}
                  </td>
                  <td style={{ ...td }}>
                    {campaign.sent_at
                      ? fmtDate(campaign.sent_at)
                      : campaign.status === "scheduled" && campaign.scheduled_at
                        ? `Programada · ${fmtDate(campaign.scheduled_at)}`
                        : "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Rate count={stats[campaign.id]?.opened} rate={stats[campaign.id]?.openRate} />
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Rate count={stats[campaign.id]?.clicked} rate={stats[campaign.id]?.clickRate} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Rate({ count, rate }: { count?: number; rate?: number | null }) {
  if (count === undefined) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <span>
      {count}
      {rate !== null && rate !== undefined && (
        <span style={{ color: "#64748b", fontSize: 12 }}> · {rate} %</span>
      )}
    </span>
  );
}
