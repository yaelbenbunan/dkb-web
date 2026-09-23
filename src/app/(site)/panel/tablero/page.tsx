import Link from "next/link";
import { listLeads } from "@/lib/imagina-leads";
import { dueCount, todayInMadrid } from "@/lib/followup-agenda";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/lead-status";
import { filtrarLeads, opcionesDeCampana, opcionesDeCanal } from "@/lib/panel-filtros";
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
  searchParams: Promise<{ atrasados?: string; q?: string; canal?: string; campana?: string }>;
}) {
  const sp = await searchParams;
  const atrasados = sp.atrasados === "1";
  const q = (sp.q ?? "").trim();
  const canal = sp.canal || undefined;
  const campana = sp.campana || undefined;
  const hoy = todayInMadrid();

  const todos = await listLeads();
  // Los archivados no aparecen nunca en el tablero (piden lo contrario para la
  // lista, que sí los enseña con su propio filtro).
  const activos = todos.filter((l) => !l.archived);
  const pendingCalls = dueCount(activos, hoy);

  const conEstado: TarjetaLead[] = activos
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
    .filter((l) => !atrasados || estadoSeguimiento(l.followup_at, l.estado, hoy) === "atrasado");

  // Recuento de cada chip de canal/campaña = lo que se vería al pulsarlo: el
  // resto de tarjetas con los demás filtros ya aplicados (atrasados, búsqueda
  // y el otro filtro), pero sin el propio — igual que en la lista.
  const poolParaCanal = filtrarLeads(conEstado, { campana, query: q });
  const poolParaCampana = filtrarLeads(conEstado, { canal, query: q });
  const leads = filtrarLeads(poolParaCanal, { canal });

  const canales = opcionesDeCanal(poolParaCanal);
  const campanas = opcionesDeCampana(poolParaCampana);

  const filtro = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { atrasados: atrasados ? "1" : undefined, q: q || undefined, canal, campana, ...extra };
    Object.entries(valores).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/panel/tablero${s ? `?${s}` : ""}`;
  };
  const chip = (activo: boolean) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      textDecoration: "none",
      flexShrink: 0,
      border: `1px solid ${activo ? "#187bef" : "#cbd5e1"}`,
      color: activo ? "#187bef" : "#475569",
      background: activo ? "#eff6ff" : "#fff",
    }) as const;
  const contador = (activo: boolean) => ({ fontSize: 11, fontWeight: 800, color: activo ? "#187bef" : "#94a3b8" }) as const;

  return (
    <PanelShell activa="tablero" agendaCount={pendingCalls} alturaCompleta>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <Link href={filtro({ atrasados: undefined })} style={chip(!atrasados)}>Todos</Link>
          <Link href={filtro({ atrasados: atrasados ? undefined : "1" })} style={chip(atrasados)}>Con seguimiento atrasado</Link>
          <span style={{ fontSize: 13, color: "#64748b", marginLeft: 6 }}>{leads.length} leads</span>
          <form action="/panel/tablero" style={{ marginLeft: "auto" }}>
            {atrasados && <input type="hidden" name="atrasados" value="1" />}
            {canal && <input type="hidden" name="canal" value={canal} />}
            {campana && <input type="hidden" name="campana" value={campana} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar nombre, teléfono, email, campaña…"
              aria-label="Buscar en el tablero"
              style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
            />
          </form>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Canal</span>
          <Link href={filtro({ canal: undefined })} style={chip(!canal)}>
            Todos <span style={contador(!canal)}>{poolParaCanal.length}</span>
          </Link>
          {canales.map((op) => (
            <Link key={op.valor} href={filtro({ canal: op.valor })} style={chip(canal === op.valor)}>
              {op.valor} <span style={contador(canal === op.valor)}>{op.recuento}</span>
            </Link>
          ))}
        </div>

        {/* Campaña con scroll horizontal, no wrap: puede haber muchas más
            campañas que canales y así no empujan el tablero hacia abajo. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexShrink: 0 }}>
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#64748b" }}>Campaña</span>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: "1 1 auto", minWidth: 0, paddingBottom: 2 }}>
            <Link href={filtro({ campana: undefined })} style={chip(!campana)}>
              Todas <span style={contador(!campana)}>{poolParaCampana.length}</span>
            </Link>
            {campanas.map((op) => (
              <Link key={op.valor} href={filtro({ campana: op.valor })} style={chip(campana === op.valor)}>
                {op.valor} <span style={contador(campana === op.valor)}>{op.recuento}</span>
              </Link>
            ))}
          </div>
        </div>

        <Tablero leads={leads} hoy={hoy} filtrosLista={{ atrasados, q }} />
      </div>
    </PanelShell>
  );
}
