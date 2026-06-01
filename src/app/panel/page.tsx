import { listLeads, type LeadRow } from "@/lib/imagina-leads";
import { getSectorLabel } from "@/lib/preview-themes";
import { normalizeUrl } from "@/lib/website-extract-guard";
import { StatusSelect } from "./StatusSelect";
import { panelLogout } from "./actions";

export const metadata = {
  title: "Panel de leads — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

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

function reviewBadge(l: LeadRow): string {
  if (l.review_rating === "up") return "👍";
  if (l.review_rating === "down") return "👎";
  return "—";
}

export default async function PanelPage() {
  const leads = await listLeads();
  const configured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

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
          <span style={{ fontWeight: 800, letterSpacing: 2, color: "#187bef", textTransform: "uppercase", fontSize: 12 }}>
            dinkbit
          </span>
          <strong style={{ fontSize: 16 }}>Leads · Imagina tu web</strong>
          <span style={{ opacity: 0.6, fontSize: 13 }}>{leads.length} registros</span>
        </div>
        <form action={panelLogout} style={{ margin: 0 }}>
          <button
            type="submit"
            style={{ border: "1px solid #334155", background: "transparent", color: "#cbd5e1", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
          >
            Salir
          </button>
        </form>
      </header>

      <div style={{ padding: 22 }}>
        {!configured && (
          <p style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 14 }}>
            ⚠️ Supabase no está configurado (faltan <code>SUPABASE_URL</code> / <code>SUPABASE_SERVICE_ROLE_KEY</code>). La tabla aparecerá vacía hasta que se configuren.
          </p>
        )}

        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14, minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {["Fecha", "Contacto", "Sector", "Negocio", "Estilo", "PDF", "Review", "Estado"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 28 }}>
                    Aún no hay leads.
                  </td>
                </tr>
              )}
              {leads.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={td}>{fmtDate(l.created_at)}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{l.name ?? "—"}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>{l.email ?? ""}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>{l.phone ?? ""}</div>
                  </td>
                  <td style={td}>{l.sector ? getSectorLabel(l.sector) : "—"}</td>
                  <td style={td}>
                    {l.business_name ?? "—"}
                    {(() => {
                      // Sanitize the user-submitted URL: only http(s) becomes a
                      // link, so a stored `javascript:`/`data:` value can't run
                      // when an admin clicks it.
                      const href = normalizeUrl(l.current_website ?? "")?.toString();
                      return href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{ display: "block", color: "#187bef", fontSize: 12 }}
                        >
                          web actual ↗
                        </a>
                      ) : null;
                    })()}
                  </td>
                  <td style={{ ...td, textTransform: "capitalize" }}>{l.style ?? "—"}</td>
                  <td style={td}>
                    {l.pdf_path ? (
                      <a href={`/panel/pdf/${l.id}`} target="_blank" rel="noreferrer" style={{ color: "#187bef", fontWeight: 600 }}>
                        Ver PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={td} title={l.review_comment ?? ""}>
                    {reviewBadge(l)}
                    {l.review_comment ? <span style={{ color: "#94a3b8" }}> 💬</span> : null}
                  </td>
                  <td style={td}>
                    <StatusSelect id={l.id} value={String(l.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "11px 14px",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};
