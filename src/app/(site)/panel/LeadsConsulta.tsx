import Link from "next/link";
import { statusLabel } from "@/lib/lead-status";

export interface LeadConsulta {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: string | null;
  campaign: string | null;
  status: string;
  account_manager: string | null;
  archived: boolean;
}

const th = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0" } as const;
const td = { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid #f1f5f9", color: "#0f172a" } as const;

/**
 * Los leads del /panel viejo (`imagina_leads`), solo para consultar. Desde la
 * unificación del CRM (2026-10-15) se trabajan en /panel/ventas, marca dinkbit:
 * aquí no hay nada editable para que nadie apunte una llamada donde ya no se lee.
 * Desaparece cuando se retire el /panel viejo.
 */
export function LeadsConsulta({ leads }: { leads: LeadConsulta[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p role="status" style={{ margin: 0, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", fontSize: 14 }}>
        Los leads se gestionan ahora en /panel/ventas. Esta lista es solo de consulta.{" "}
        <Link href="/panel/ventas/dinkbit" style={{ color: "#187bef", fontWeight: 700 }}>
          Ir al CRM de dinkbit →
        </Link>
      </p>
      <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
          <thead>
            <tr>
              {["Fecha", "Nombre", "Teléfono", "Email", "Canal", "Campaña", "Estado", "Responsable"].map((t) => (
                <th key={t} style={th}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} style={{ opacity: l.archived ? 0.55 : 1 }}>
                <td style={td}>{new Date(l.created_at).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}</td>
                <td style={td}>{l.name ?? "—"}</td>
                <td style={td}>{l.phone ?? "—"}</td>
                <td style={td}>{l.email ?? "—"}</td>
                <td style={td}>{l.channel ?? "—"}</td>
                <td style={td}>{l.campaign ?? "—"}</td>
                <td style={td}>{statusLabel(l.status)}</td>
                <td style={td}>{l.account_manager ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{leads.length} leads (los archivados, atenuados)</p>
    </div>
  );
}
