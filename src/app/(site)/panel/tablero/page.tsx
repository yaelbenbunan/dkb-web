import Link from "next/link";
import { listLeads } from "@/lib/imagina-leads";
import { dueCount, todayInMadrid } from "@/lib/followup-agenda";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/lead-status";
import { ESTADOS_FUERA_DEL_TABLERO, estadoSeguimiento } from "@/lib/panel-tablero";
import { PanelShell } from "../_componentes/PanelShell";
import { Tablero, type TarjetaLead } from "./Tablero";

export const metadata = {
  title: "Tablero — Panel de leads · dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function esLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v);
}

export default async function TableroPage({
  searchParams,
}: {
  searchParams: Promise<{ atrasados?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const atrasados = sp.atrasados === "1";
  const q = (sp.q ?? "").trim().toLowerCase();
  const hoy = todayInMadrid();

  const todos = await listLeads();
  // Los archivados no aparecen nunca en el tablero (piden lo contrario para la
  // lista, que sí los enseña con su propio filtro).
  const activos = todos.filter((l) => !l.archived);
  const pendingCalls = dueCount(activos, hoy);

  const leads: TarjetaLead[] = activos
    // La base no tiene CHECK en `status` (a propósito, ver lead-status.ts): un
    // valor fuera de los 9 conocidos no tiene columna posible, así que se deja
    // fuera del tablero en vez de reventar la página. Sigue viéndose en la lista.
    .filter((l) => esLeadStatus(String(l.status)))
    // Kit Digital ya no tiene columna en el tablero (se gestiona desde la
    // lista de /panel): ni tarjeta, ni cuenta en el «N leads» de arriba.
    .filter((l) => !ESTADOS_FUERA_DEL_TABLERO.includes(l.status as LeadStatus))
    .map((l) => ({
      id: l.id,
      estado: l.status as LeadStatus,
      name: l.name,
      phone: l.phone,
      email: l.email,
      channel: l.channel,
      campaign: l.campaign,
      notes: l.notes,
      followup: l.followup,
      followup_at: l.followup_at,
      account_manager: l.account_manager,
      created_at: l.created_at,
    }))
    .filter((l) => !atrasados || estadoSeguimiento(l.followup_at, l.estado, hoy) === "atrasado")
    .filter((l) => !q || [l.name, l.phone, l.email, l.campaign].some((v) => v?.toLowerCase().includes(q)));

  const filtro = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { atrasados: atrasados ? "1" : undefined, q: q || undefined, ...extra };
    Object.entries(valores).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/panel/tablero${s ? `?${s}` : ""}`;
  };
  const chip = (activo: boolean) =>
    ({
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 13,
      textDecoration: "none",
      border: `1px solid ${activo ? "#187bef" : "#cbd5e1"}`,
      color: activo ? "#187bef" : "#475569",
      background: activo ? "#eff6ff" : "#fff",
    }) as const;

  return (
    <PanelShell activa="tablero" agendaCount={pendingCalls} alturaCompleta>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <Link href={filtro({ atrasados: undefined })} style={chip(!atrasados)}>Todos</Link>
          <Link href={filtro({ atrasados: atrasados ? undefined : "1" })} style={chip(atrasados)}>Con seguimiento atrasado</Link>
          <span style={{ fontSize: 13, color: "#64748b", marginLeft: 6 }}>{leads.length} leads</span>
          <form action="/panel/tablero" style={{ marginLeft: "auto" }}>
            {atrasados && <input type="hidden" name="atrasados" value="1" />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar nombre, teléfono, email, campaña…"
              aria-label="Buscar en el tablero"
              style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
            />
          </form>
        </div>

        <Tablero leads={leads} hoy={hoy} filtrosLista={{ atrasados, q }} />
      </div>
    </PanelShell>
  );
}
