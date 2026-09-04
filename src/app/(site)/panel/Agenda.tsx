"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setLeadFollowup, setLeadFollowupDate } from "./actions";
import { EditableCell } from "./EditableCell";
import {
  addDays,
  buildAgenda,
  isFollowupDate,
  FOLLOWUP_MAX_DATE,
  FOLLOWUP_MIN_DATE,
  todayInMadrid,
  type AgendaBucketKey,
} from "@/lib/followup-agenda";
import { STATUS_COLORS, statusLabel } from "@/lib/lead-status";
import { AM_COLORS } from "@/lib/account-managers";
import type { LeadRowView } from "./LeadsTable";

/** "mié 26 ago" a partir de un YYYY-MM-DD. Se formatea en UTC porque la fecha
 *  no lleva hora: interpretarla en local la correría un día hacia atrás. */
function fmtDay(date: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  } catch {
    return date;
  }
}

/** Días de retraso de una fecha ya pasada (siempre ≥ 1). */
function daysLate(date: string, today: string): number {
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Lista de llamadas pendientes agrupada por urgencia. Solo lee `followup_at`:
 * los leads sin fecha y los archivados no aparecen, así que la agenda es
 * exactamente "lo que hay que hacer" y no una segunda copia de la tabla.
 */
export function Agenda({ leads }: { leads: LeadRowView[] }) {
  const today = todayInMadrid();
  const groups = buildAgenda(leads, today);

  if (groups.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "40px 24px",
          textAlign: "center",
          color: "#64748b",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
          No hay llamadas agendadas.
        </p>
        <p style={{ fontSize: 13, margin: "8px 0 0" }}>
          Pon una fecha en la columna <strong>Llamar el</strong> de la tabla y
          aparecerá aquí el día que toque.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {groups.map((g) => (
        <section key={g.key}>
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "0 0 8px",
              fontSize: 13,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: g.color,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: g.color,
              }}
            />
            {g.label}
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>({g.rows.length})</span>
          </h3>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {g.rows.map((lead, i) => (
              <AgendaRow
                key={lead.id}
                lead={lead}
                today={today}
                bucket={g.key}
                color={g.color}
                first={i === 0}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AgendaRow({
  lead,
  today,
  bucket,
  color,
  first,
}: {
  lead: LeadRowView;
  today: string;
  bucket: AgendaBucketKey;
  color: string;
  first: boolean;
}) {
  const [pending, start] = useTransition();
  const date = lead.followup_at!;
  const dateRef = useRef<HTMLInputElement>(null);

  const reschedule = (value: string) => {
    const fd = new FormData();
    fd.set("id", lead.id);
    fd.set("followup_at", value);
    start(() => setLeadFollowupDate(fd));
  };

  // Lo que se ve mientras se escribe en el campo de fecha. Un `input[type=date]`
  // emite un valor por cada pulsación ("0020-09-01" camino de "2026-09-01"), así
  // que el borrador vive aquí y solo se guarda cuando la fecha ya tiene sentido:
  // guardar a medias recargaría la agenda y el campo saltaría hacia atrás.
  const [draft, setDraft] = useState(date);
  useEffect(() => setDraft(date), [date]);

  const onDraftChange = (next: string) => {
    setDraft(next);
    if (next === "" || isFollowupDate(next)) reschedule(next);
  };

  /** Abre el calendario nativo al pinchar en cualquier punto del campo, no solo
   *  en el iconito. Si el navegador no trae `showPicker`, se escribe a mano. */
  const openPicker = () => {
    try {
      dateRef.current?.showPicker?.();
    } catch {
      /* Firefox lo lanza si no viene de un gesto del usuario: se ignora */
    }
  };

  // Posponer cuenta desde hoy, no desde la fecha vieja: si algo lleva dos
  // semanas vencido, "+1 día" tiene que significar mañana.
  const from = date < today ? today : date;
  const tel = (lead.phone ?? "").replace(/[^\d+]/g, "");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "16px 14px",
        borderTop: first ? "none" : "2px solid #dbe3ed",
        borderLeft: `4px solid ${color}`,
        opacity: pending ? 0.5 : 1,
      }}
    >
      <div style={{ minWidth: 116 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color }}>{fmtDay(date)}</div>
        {bucket === "vencidos" && (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            hace {daysLate(date, today)} día{daysLate(date, today) === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div style={{ minWidth: 190, flex: "1 1 190px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {lead.name?.trim() || "(sin nombre)"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 2 }}>
          {tel && (
            <a
              href={`tel:${tel}`}
              style={{ fontSize: 13, color: "#187bef", textDecoration: "none", fontWeight: 600 }}
            >
              📞 {lead.phone}
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}
            >
              ✉ {lead.email}
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 150 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            background: STATUS_COLORS[lead.status] ?? "#334155",
            borderRadius: 999,
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {statusLabel(lead.status)}
        </span>
        {lead.account_manager && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: AM_COLORS[lead.account_manager] ?? "#475569",
              whiteSpace: "nowrap",
            }}
          >
            {lead.account_manager}
          </span>
        )}
      </div>

      {/* Editable aquí y no solo en la tabla: lo que se apunta de una llamada se
          apunta al colgar, y salir a buscar el lead en la tabla para escribir
          dos líneas es justo lo que hace que no se apunten. Es el mismo campo
          `followup` de la tabla, así que lo escrito aparece en los dos sitios. */}
      <div style={{ flex: "2 1 260px", minWidth: 220 }}>
        <EditableCell
          id={lead.id}
          field="followup"
          action={setLeadFollowup}
          value={lead.followup ?? ""}
          placeholder="Añadir seguimiento…"
          rows={3}
          minWidth={210}
          autoGrow
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        <button
          type="button"
          disabled={pending}
          onClick={() => reschedule("")}
          title="Llamada hecha: quita la fecha y sale de la agenda"
          style={agendaBtn("#f0fdf4", "#16a34a", "#bbf7d0", pending)}
        >
          ✓ Hecho
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => reschedule(addDays(from, 1))}
          style={agendaBtn("#fff", "#475569", "#cbd5e1", pending)}
        >
          +1 día
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => reschedule(addDays(from, 7))}
          style={agendaBtn("#fff", "#475569", "#cbd5e1", pending)}
        >
          +1 sem
        </button>
        {/* El día concreto. Los atajos cubren "mañana" y "la semana que viene",
            pero por teléfono lo que se dice es "llámame el 14": sin este campo
            había que salir a la tabla a ponerlo. Muestra la fecha actual del
            aviso, así que también sirve para ver qué día está puesto. */}
        <input
          ref={dateRef}
          type="date"
          value={draft}
          min={FOLLOWUP_MIN_DATE}
          max={FOLLOWUP_MAX_DATE}
          disabled={pending}
          onChange={(e) => onDraftChange(e.target.value)}
          // Si se sale del campo con algo a medias, se recupera lo guardado en
          // vez de dejar a la vista una fecha que no existe en la base.
          onBlur={() => setDraft(date)}
          onClick={openPicker}
          onFocus={openPicker}
          title="Elegir otro día para el aviso"
          aria-label="Elegir otro día para el aviso"
          style={{
            ...agendaBtn("#fff", "#475569", "#cbd5e1", pending),
            fontFamily: "inherit",
            padding: "5px 8px",
          }}
        />
      </div>
    </div>
  );
}

const agendaBtn = (
  bg: string,
  color: string,
  border: string,
  disabled: boolean,
): React.CSSProperties => ({
  border: `1px solid ${border}`,
  background: bg,
  color,
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: disabled ? "default" : "pointer",
  whiteSpace: "nowrap",
});
