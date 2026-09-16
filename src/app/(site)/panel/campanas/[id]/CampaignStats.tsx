import type { CampaignStats as Stats } from "@/lib/campaign-stats";

const RECIPIENT_STATUS: Record<string, { label: string; color: string }> = {
  clicked: { label: "Hizo clic", color: "#166534" },
  opened: { label: "Abierto", color: "#1e40af" },
  delivered: { label: "Entregado", color: "#475569" },
  sent: { label: "Enviado", color: "#64748b" },
  pending: { label: "Pendiente", color: "#64748b" },
  bounced: { label: "Rebotado", color: "#b91c1c" },
  complained: { label: "Marcado como spam", color: "#b91c1c" },
  failed: { label: "Falló el envío", color: "#b91c1c" },
};

/** Orden de la tabla: primero quien más ha interactuado. */
const ORDER = ["clicked", "opened", "delivered", "sent", "pending", "bounced", "complained", "failed"];

export function CampaignStats({
  stats,
  recipients,
  tracked,
}: {
  stats: Stats;
  recipients: { email: string; status: string }[];
  tracked: boolean;
}) {
  const sorted = [...recipients].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.email.localeCompare(b.email),
  );
  const noData = tracked ? null : "Sin datos";

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Rendimiento</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <Tile label="Enviados" value={String(stats.sent)} />
        <Tile
          label="Entregados"
          value={String(stats.delivered)}
          hint={stats.sent > 0 ? `${Math.round((stats.delivered / stats.sent) * 100)} % de enviados` : undefined}
        />
        <Tile
          label="Abiertos"
          value={noData ?? String(stats.opened)}
          hint={noData ? undefined : stats.openRate !== null ? `${stats.openRate} % de entregados` : undefined}
          accent={noData ? "#94a3b8" : "#1e40af"}
        />
        <Tile
          label="Clics"
          value={noData ?? String(stats.clicked)}
          hint={noData ? undefined : stats.clickRate !== null ? `${stats.clickRate} % de entregados` : undefined}
          accent={noData ? "#94a3b8" : "#166534"}
        />
        <Tile
          label="Rebotes"
          value={String(stats.bounced)}
          hint={stats.complained > 0 ? `${stats.complained} marcado${stats.complained === 1 ? "" : "s"} como spam` : undefined}
          accent={stats.bounced > 0 ? "#b91c1c" : undefined}
        />
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {tracked
          ? "Los datos llegan de Resend según ocurren, y pueden tardar unos minutos. Las aperturas son orientativas: Apple Mail abre los correos solo, y otros clientes bloquean las imágenes y no las cuentan. Los clics son fiables."
          : "Esta campaña salió antes de activar el seguimiento de aperturas y clics, así que de ella solo hay datos de entrega."}
      </p>

      {sorted.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#187bef" }}>
            Ver destinatarios ({sorted.length})
          </summary>
          <div style={{ overflowX: "auto", marginTop: 10, maxHeight: 420, overflowY: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Email</th>
                  <th style={th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const st = RECIPIENT_STATUS[r.status] ?? { label: r.status, color: "#475569" };
                  return (
                    <tr key={r.email}>
                      <td style={td}>{r.email}</td>
                      <td style={{ ...td, color: st.color, fontWeight: 600 }}>{st.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

const th = {
  textAlign: "left" as const,
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  color: "#64748b",
  fontWeight: 600,
  position: "sticky" as const,
  top: 0,
  background: "#fff",
};

const td = { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" };

function Tile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ?? "#0f172a", lineHeight: 1.3 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div>}
    </div>
  );
}
