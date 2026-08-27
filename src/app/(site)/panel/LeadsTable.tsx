"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  setLeadStatus,
  setLeadAccountManager,
  setLeadNotes,
  setLeadFollowup,
  setLeadFollowupDate,
  setLeadChannel,
  setLeadCampaign,
  setLeadName,
  setLeadEmail,
  setLeadPhone,
  resendKitDigitalEmailAction,
  archiveLeadsAction,
  deleteLeadsAction,
  createLeadAction,
  setLeadConsentAction,
  bulkSetConsentAction,
} from "./actions";
import { LEAD_STATUSES, STATUS_COLORS, statusLabel } from "@/lib/lead-status";
import { emailStatusLabel, EMAIL_STATUS_COLORS } from "@/lib/email-status";
import { isLeadEmailable } from "@/lib/lead-emailable";
import { ACCOUNT_MANAGERS, AM_COLORS } from "@/lib/account-managers";
import {
  addDays,
  dueCount,
  isFollowupDate,
  FOLLOWUP_MIN_DATE,
  FOLLOWUP_MAX_DATE,
  nextMonthLabel,
  nextWeekday,
  startOfNextMonth,
  todayInMadrid,
} from "@/lib/followup-agenda";
import { Agenda } from "./Agenda";
import { ImportLeadsPanel } from "./ImportLeadsPanel";

export interface LeadRowView {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: string | null;
  campaign: string | null;
  website: string | null;
  notes: string | null;
  followup: string | null;
  /** Fecha (YYYY-MM-DD) de la próxima llamada. null = no está en la agenda. */
  followup_at: string | null;
  account_manager: string | null;
  status: string;
  email_status: string | null;
  archived: boolean;
  /** Consentimiento de comunicaciones comerciales (para campañas). null = sin definir. */
  consent: boolean | null;
}

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

const CHANNEL_COLORS: Record<string, string> = {
  Meta: "#1d4ed8",
  "google ads": "#b45309",
  "Microsoft Ads": "#0e7490",
  LinkedIn: "#1d4ed8",
  TikTok: "#0f172a",
  landing: "#0d9488",
  Web: "#475569",
};

// Canales seleccionables en el panel. Incluye los valores que ya generan los
// formularios/atribución para poder corregir un lead a mano cuando haga falta.
const CHANNEL_OPTIONS = [
  "Web",
  "google ads",
  "Meta",
  "Microsoft Ads",
  "LinkedIn",
  "TikTok",
  "landing",
];

/** Safe http(s) URL or null — never linkify javascript:/data: values. */
function webHref(raw: string | null): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

// Columnas de la tabla. `min` es el ancho mínimo que necesita cada una para
// leerse sin cortes: la suma de las visibles fija el ancho de la tabla, así que
// ocultar columnas recupera espacio de verdad en vez de dejar hueco muerto.
const COLUMNS = [
  { key: "fecha", label: "Fecha", min: 120 },
  { key: "nombre", label: "Nombre", min: 170 },
  { key: "telefono", label: "Teléfono", min: 200 },
  { key: "email", label: "Email", min: 210 },
  { key: "email_status", label: "Estado email", min: 150 },
  { key: "consent", label: "Consent", min: 120 },
  { key: "web", label: "Web", min: 150 },
  { key: "canal", label: "Canal", min: 130 },
  { key: "campana", label: "Campaña", min: 150 },
  { key: "notas", label: "Notas adicionales", min: 390 },
  { key: "am", label: "Account manager", min: 160 },
  { key: "estado", label: "Estado", min: 160 },
  { key: "llamar", label: "Llamar el", min: 185 },
  { key: "seguimiento", label: "Seguimiento", min: 350 },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

/** Columnas ocultas, recordadas entre visitas (es una preferencia de trabajo,
 *  no un filtro: si escondes "Consent" no quieres volver a esconderla mañana). */
const COLS_STORAGE_KEY = "dkb-panel-hidden-cols";

const webLabel = (raw: string) =>
  raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");

export function LeadsTable({ leads }: { leads: LeadRowView[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [channelFilter, setChannelFilter] = useState<string>("todos");
  const [emailableOnly, setEmailableOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [busy, start] = useTransition();
  const [view, setView] = useState<"tabla" | "agenda">("tabla");
  const [hiddenCols, setHiddenCols] = useState<Set<ColKey>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);

  // Se lee tras montar (no en el useState inicial) para que el HTML del
  // servidor y el del cliente coincidan y no haya error de hidratación.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_STORAGE_KEY);
      if (raw) setHiddenCols(new Set(JSON.parse(raw) as ColKey[]));
    } catch {
      /* localStorage puede fallar (modo privado); se ven todas las columnas */
    }
  }, []);

  const persistCols = (next: Set<ColKey>) => {
    setHiddenCols(next);
    try {
      localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* no poder recordarlo no debe romper la vista */
    }
  };
  const toggleCol = (key: ColKey) => {
    const next = new Set(hiddenCols);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistCols(next);
  };

  const cols = COLUMNS.filter((c) => !hiddenCols.has(c.key));
  const show = (key: ColKey) => !hiddenCols.has(key);
  const tableMinWidth = 36 + cols.reduce((n, c) => n + c.min, 0);

  const today = todayInMadrid();
  const pendingCalls = dueCount(leads, today);

  // Pool for the current view (active vs archived); los filtros se acumulan
  // sobre él, así que se pueden combinar (p. ej. enviables de Meta).
  const pool = leads.filter((l) => (showArchived ? l.archived : !l.archived));
  const visible = pool.filter(
    (l) =>
      (statusFilter === "todos" || l.status === statusFilter) &&
      (channelFilter === "todos" || (l.channel ?? "Sin canal") === channelFilter) &&
      (!emailableOnly || isLeadEmailable(l)),
  );

  const archivedCount = leads.filter((l) => l.archived).length;
  const statusCounts = (s: string) =>
    pool.filter((l) => l.status === s).length;
  const emailableCount = pool.filter(isLeadEmailable).length;

  // Los canales salen de los datos, no de una lista fija: cualquier UTM nueva
  // (Bing, LinkedIn…) aparece sola sin tocar código.
  const channels = Array.from(
    new Set(pool.map((l) => l.channel?.trim() || "Sin canal")),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const channelCount = (c: string) =>
    pool.filter((l) => (l.channel?.trim() || "Sin canal") === c).length;

  const clearSel = () => setSelected(new Set());
  const allSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(visible.map((l) => l.id)));

  const runBulk = (
    action: (fd: FormData) => void | Promise<void>,
    extra?: Record<string, string>,
  ) => {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.set("ids", [...selected].join(","));
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    start(async () => {
      await action(fd);
      clearSel();
    });
  };

  const onArchive = () => runBulk(archiveLeadsAction, { archived: String(!showArchived) });
  const onMarkConsent = () => runBulk(bulkSetConsentAction, { consent: "true" });
  const onDelete = () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `¿Eliminar ${selected.size} lead${selected.size > 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    runBulk(deleteLeadsAction);
  };

  // La agenda es una vista aparte, no un filtro más: sale con todos los hooks ya
  // ejecutados, así que el orden de hooks no cambia entre vistas.
  if (view === "agenda") {
    return (
      <>
        <ViewTabs view={view} onChange={setView} pending={pendingCalls} />
        <Agenda leads={leads} />
      </>
    );
  }

  return (
    <>
      <ViewTabs view={view} onChange={setView} pending={pendingCalls} />

      {/* Toolbar: filtro por estado + archivados */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <FilterChip
          label="Todos"
          count={pool.length}
          active={statusFilter === "todos"}
          color="#334155"
          onClick={() => {
            setStatusFilter("todos");
            clearSel();
          }}
        />
        {LEAD_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={statusLabel(s)}
            count={statusCounts(s)}
            active={statusFilter === s}
            color={STATUS_COLORS[s] ?? "#334155"}
            onClick={() => {
              setStatusFilter(s);
              clearSel();
            }}
          />
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => {
            setShowArchived((v) => !v);
            setStatusFilter("todos");
            clearSel();
          }}
          style={{
            border: "1px solid #cbd5e1",
            background: showArchived ? "#0b1220" : "#fff",
            color: showArchived ? "#fff" : "#475569",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showArchived ? "← Volver a activos" : `🗄 Archivados (${archivedCount})`}
        </button>
      </div>

      {/* Segunda fila: enviables + canal. Van aparte del estado porque son
          criterios ortogonales y se combinan entre sí. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setEmailableOnly((v) => !v);
            clearSel();
          }}
          title="Con consentimiento, con email y sin rebotes ni quejas"
          style={{
            border: `1px solid ${emailableOnly ? "#16a34a" : "#cbd5e1"}`,
            background: emailableOnly ? "#16a34a" : "#fff",
            color: emailableOnly ? "#fff" : "#475569",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✉ Se les puede escribir ({emailableCount})
        </button>

        <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: "#64748b" }}>
          Canal
        </span>
        <FilterChip
          label="Todos"
          count={pool.length}
          active={channelFilter === "todos"}
          color="#334155"
          onClick={() => {
            setChannelFilter("todos");
            clearSel();
          }}
        />
        {channels.map((c) => (
          <FilterChip
            key={c}
            label={c}
            count={channelCount(c)}
            active={channelFilter === c}
            color={CHANNEL_COLORS[c] ?? "#334155"}
            onClick={() => {
              setChannelFilter(c);
              clearSel();
            }}
          />
        ))}
      </div>

      {/* Barra de acciones en lote */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          minHeight: 34,
        }}
      >
        <span style={{ fontSize: 13, color: "#475569" }}>
          {selected.size > 0
            ? `${selected.size} seleccionado${selected.size > 1 ? "s" : ""}`
            : `${visible.length} lead${visible.length === 1 ? "" : "s"}`}
        </span>
        {selected.size > 0 && (
          <>
            <button
              type="button"
              onClick={onArchive}
              disabled={busy}
              style={btnStyle("#0b1220", "#f1f5f9", busy)}
            >
              {showArchived ? "♻ Desarchivar" : "🗄 Archivar"}
            </button>
            <button
              type="button"
              onClick={onMarkConsent}
              disabled={busy}
              style={btnStyle("#f0fdf4", "#16a34a", busy, "#bbf7d0")}
            >
              ✓ Marcar consentimiento
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              style={btnStyle("#fef2f2", "#b91c1c", busy, "#fecaca")}
            >
              🗑 Eliminar
            </button>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setColsOpen((v) => !v)}
          title="Mostrar u ocultar columnas"
          style={btnStyle(
            colsOpen ? "#e2e8f0" : "#fff",
            "#334155",
            false,
            "#cbd5e1",
          )}
        >
          ⚙ Columnas{hiddenCols.size > 0 ? ` (${hiddenCols.size} ocultas)` : ""}
        </button>
        {!showArchived && selected.size === 0 && (
          <>
            <button
              type="button"
              onClick={() => {
                setImporting((v) => !v);
                setAdding(false);
              }}
              style={btnStyle(
                importing ? "#e2e8f0" : "#fff",
                "#334155",
                false,
                "#cbd5e1",
              )}
            >
              {importing ? "Cerrar importación" : "⬆ Importar CSV"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding((v) => !v);
                setImporting(false);
              }}
              style={btnStyle(adding ? "#e2e8f0" : "#187bef", adding ? "#334155" : "#fff", false, adding ? "#cbd5e1" : "#187bef")}
            >
              {adding ? "Cancelar" : "+ Añadir lead"}
            </button>
          </>
        )}
      </div>

      {colsOpen && (
        <ColumnsPanel
          hidden={hiddenCols}
          onToggle={toggleCol}
          onShowAll={() => persistCols(new Set())}
        />
      )}

      {importing && !showArchived && (
        <ImportLeadsPanel onDone={() => setImporting(false)} />
      )}

      {adding && !showArchived && (
        <AddLeadPanel onDone={() => setAdding(false)} />
      )}

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
            minWidth: tableMinWidth,
          }}
        >
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ ...th, width: 36, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                  style={{ cursor: "pointer", width: 16, height: 16 }}
                />
              </th>
              {cols.map((c) => (
                <th key={c.key} style={{ ...th, minWidth: c.min }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={cols.length + 1}
                  style={{
                    ...td,
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: 28,
                  }}
                >
                  {showArchived ? "No hay leads archivados." : "Aún no hay leads."}
                </td>
              </tr>
            )}
            {visible.map((l) => {
              const isSel = selected.has(l.id);
              const href = webHref(l.website);
              return (
                <tr
                  key={l.id}
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    background: isSel ? "#eff6ff" : undefined,
                  }}
                >
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(l.id)}
                      aria-label={`Seleccionar ${l.name ?? "lead"}`}
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                    />
                  </td>
                  {show("fecha") && (
                    <td style={{ ...td, color: "#64748b", fontSize: 13 }}>
                      {fmtDate(l.created_at)}
                    </td>
                  )}
                  {show("nombre") && (
                    <td style={{ ...td, fontWeight: 600, minWidth: 160 }}>
                      <InlineText
                        id={l.id}
                        field="name"
                        action={setLeadName}
                        value={l.name ?? ""}
                        placeholder="—"
                      />
                    </td>
                  )}
                  {show("telefono") && (
                    <td style={{ ...td, minWidth: 190 }}>
                      <InlineText
                        id={l.id}
                        field="phone"
                        minWidth={180}
                        action={setLeadPhone}
                        value={l.phone ?? ""}
                        placeholder="—"
                      />
                    </td>
                  )}
                  {show("email") && (
                    <td style={{ ...td, minWidth: 190 }}>
                      <InlineText
                        id={l.id}
                        field="email"
                        action={setLeadEmail}
                        value={l.email ?? ""}
                        placeholder="—"
                      />
                    </td>
                  )}
                  {show("email_status") && (
                    <td style={td}>
                      <EmailStatusCell
                        id={l.id}
                        status={l.email_status}
                        campaign={l.campaign}
                        hasEmail={!!(l.email ?? "").trim()}
                      />
                    </td>
                  )}
                  {show("consent") && (
                    <td style={td}>
                      <ConsentSelect id={l.id} value={l.consent} />
                    </td>
                  )}
                  {show("web") && (
                    <td style={td}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{ color: "#187bef" }}
                        >
                          {webLabel(l.website ?? "")} ↗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  {show("canal") && (
                    <td style={td}>
                      <ChannelSelect id={l.id} value={l.channel ?? ""} />
                    </td>
                  )}
                  {show("campana") && (
                    <td style={td}>
                      <InlineText
                        id={l.id}
                        field="campaign"
                        action={setLeadCampaign}
                        value={l.campaign ?? ""}
                        placeholder="—"
                      />
                    </td>
                  )}
                  {show("notas") && (
                    <td style={{ ...td, whiteSpace: "normal", minWidth: 380 }}>
                      <EditableCell
                        id={l.id}
                        field="notes"
                        action={setLeadNotes}
                        value={l.notes ?? ""}
                        placeholder="Añadir notas…"
                        rows={5}
                        minWidth={360}
                        autoGrow
                      />
                    </td>
                  )}
                  {show("am") && (
                    <td style={td}>
                      <AccountManagerSelect
                        id={l.id}
                        value={l.account_manager ?? ""}
                      />
                    </td>
                  )}
                  {show("estado") && (
                    <td style={td}>
                      <StatusSelect id={l.id} value={l.status} />
                    </td>
                  )}
                  {show("llamar") && (
                    <td style={td}>
                      <FollowupDateCell
                        id={l.id}
                        value={l.followup_at}
                        today={today}
                        needsDate={l.status === "seguimiento" && !l.followup_at}
                      />
                    </td>
                  )}
                  {show("seguimiento") && (
                    <td style={{ ...td, whiteSpace: "normal", minWidth: 340 }}>
                      <EditableCell
                        id={l.id}
                        field="followup"
                        action={setLeadFollowup}
                        value={l.followup ?? ""}
                        placeholder="Ej: llamado, no contesta…"
                        rows={6}
                        minWidth={330}
                        autoGrow
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Formulario para dar de alta un lead a mano. Se inserta con estado "nuevo";
 *  el resto de campos (account manager, seguimiento…) se editan luego en línea. */
function AddLeadPanel({ onDone }: { onDone: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setError(null);
        start(async () => {
          const r = await createLeadAction(fd);
          if (r.ok) {
            formRef.current?.reset();
            onDone();
          } else {
            setError(r.error ?? "No se pudo crear el lead.");
          }
        });
      }}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Nombre">
          <input name="name" placeholder="Nombre y apellidos" style={addInput} />
        </Field>
        <Field label="Teléfono">
          <input name="phone" type="tel" placeholder="+34 600 000 000" style={addInput} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" placeholder="nombre@email.com" style={addInput} />
        </Field>
        <Field label="Web">
          <input name="website" placeholder="ejemplo.com" style={addInput} />
        </Field>
        <Field label="Canal">
          <select name="channel" defaultValue="Web" style={addInput}>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Campaña">
          <input name="campaign" placeholder="Campaña / origen" style={addInput} />
        </Field>
      </div>

      <div style={{ marginTop: 12 }}>
        <Field label="Notas">
          <textarea
            name="notes"
            rows={2}
            placeholder="Contexto, cómo llegó, siguiente paso…"
            style={{ ...addInput, resize: "vertical", minHeight: 46 }}
          />
        </Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button
          type="submit"
          disabled={pending}
          style={btnStyle("#187bef", "#fff", pending, "#187bef")}
        >
          {pending ? "Guardando…" : "Guardar lead"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          style={btnStyle("#fff", "#475569", pending, "#cbd5e1")}
        >
          Cancelar
        </button>
        {error && (
          <span style={{ fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 5,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const addInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#0f172a",
  background: "#fff",
  boxSizing: "border-box",
};

function FilterChip({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        border: `1px solid ${active ? color : "#e2e8f0"}`,
        background: active ? color : "#fff",
        color: active ? "#fff" : "#475569",
        fontWeight: 700,
        fontSize: 12,
        padding: "5px 12px",
        cursor: "pointer",
      }}
    >
      {label}
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: active ? "#fff" : "#94a3b8",
        }}
      >
        {count}
      </span>
    </button>
  );
}

/** Controlled select that persists via a server action with optimistic state.
 *  No <form> — avoids React's form-reset snapping the value back. */
function StatusSelect({ id, value }: { id: string; value: string }) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  useEffect(() => setVal(value), [value]);

  const color = STATUS_COLORS[val] ?? "#64748b";
  return (
    <select
      value={val}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        const fd = new FormData();
        fd.set("id", id);
        fd.set("status", next);
        start(() => setLeadStatus(fd));
      }}
      style={{
        borderRadius: 999,
        border: "none",
        color: "#fff",
        background: color,
        fontWeight: 700,
        fontSize: 12,
        padding: "5px 12px",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        appearance: "none",
      }}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s} style={{ color: "#0f172a", background: "#fff" }}>
          {statusLabel(s)}
        </option>
      ))}
    </select>
  );
}

function AccountManagerSelect({ id, value }: { id: string; value: string }) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  useEffect(() => setVal(value), [value]);

  const color = AM_COLORS[val] ?? "#94a3b8";
  const assigned = val !== "";
  return (
    <select
      value={val}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        const fd = new FormData();
        fd.set("id", id);
        fd.set("account_manager", next);
        start(() => setLeadAccountManager(fd));
      }}
      style={{
        borderRadius: 999,
        border: `1px solid ${assigned ? color : "#cbd5e1"}`,
        color: assigned ? "#fff" : "#64748b",
        background: assigned ? color : "#fff",
        fontWeight: 700,
        fontSize: 12,
        padding: "5px 12px",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        appearance: "none",
      }}
    >
      <option value="" style={{ color: "#0f172a", background: "#fff" }}>
        Sin asignar
      </option>
      {ACCOUNT_MANAGERS.map((am) => (
        <option key={am} value={am} style={{ color: "#0f172a", background: "#fff" }}>
          {am}
        </option>
      ))}
    </select>
  );
}

/** Canal editable: dropdown con los canales conocidos + libre para corregir la
 *  atribución de un lead (p.ej. cuando aún no llegaba con UTMs). */
function ChannelSelect({ id, value }: { id: string; value: string }) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  useEffect(() => setVal(value), [value]);

  // Si el valor guardado no está en la lista, se añade para no perderlo.
  const options = CHANNEL_OPTIONS.includes(val) || val === "" ? CHANNEL_OPTIONS : [val, ...CHANNEL_OPTIONS];
  const set = val !== "";
  const color = CHANNEL_COLORS[val] ?? "#94a3b8";
  return (
    <select
      value={val}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        const fd = new FormData();
        fd.set("id", id);
        fd.set("channel", next);
        start(() => setLeadChannel(fd));
      }}
      style={{
        borderRadius: 999,
        border: `1px solid ${set ? color : "#cbd5e1"}`,
        color: set ? "#fff" : "#64748b",
        background: set ? color : "#fff",
        fontWeight: 700,
        fontSize: 12,
        padding: "5px 12px",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        appearance: "none",
      }}
    >
      <option value="" style={{ color: "#0f172a", background: "#fff" }}>
        Sin canal
      </option>
      {options.map((c) => (
        <option key={c} value={c} style={{ color: "#0f172a", background: "#fff" }}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** Consentimiento de comunicaciones comerciales: sí/no/— (sin definir). El
 *  estado "—" solo se muestra mientras el lead no tiene valor guardado; una vez
 *  fijado a sí/no no hay forma de volver a "sin definir" desde la UI (no existe
 *  un "unset" en el modelo — `setLeadConsent` solo acepta booleano). */
function ConsentSelect({ id, value }: { id: string; value: boolean | null }) {
  const toStr = (v: boolean | null) => (v === null ? "" : v ? "true" : "false");
  const [val, setVal] = useState(toStr(value));
  const [pending, start] = useTransition();
  useEffect(() => setVal(toStr(value)), [value]);

  const color = val === "true" ? "#16a34a" : val === "false" ? "#dc2626" : "#94a3b8";
  const set = val !== "";
  return (
    <select
      value={val}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setVal(next);
        const fd = new FormData();
        fd.set("id", id);
        fd.set("consent", next === "true" ? "true" : "false");
        start(() => setLeadConsentAction(fd));
      }}
      style={{
        borderRadius: 999,
        border: `1px solid ${set ? color : "#cbd5e1"}`,
        color: set ? "#fff" : "#64748b",
        background: set ? color : "#fff",
        fontWeight: 700,
        fontSize: 12,
        padding: "5px 12px",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.6 : 1,
        appearance: "none",
      }}
    >
      {val === "" && (
        <option value="" style={{ color: "#0f172a", background: "#fff" }}>
          —
        </option>
      )}
      <option value="true" style={{ color: "#0f172a", background: "#fff" }}>
        Sí
      </option>
      <option value="false" style={{ color: "#0f172a", background: "#fff" }}>
        No
      </option>
    </select>
  );
}

/** Campo de una línea que guarda al salir (blur), solo si cambió. Para valores
 *  cortos como la campaña. */
function InlineText({
  id,
  field,
  action,
  value,
  placeholder,
  minWidth = 110,
}: {
  id: string;
  field: string;
  action: (formData: FormData) => void | Promise<void>;
  value: string;
  placeholder: string;
  /** Ancho mínimo de la caja. Súbelo en campos que no deben cortarse nunca
   *  (teléfonos con prefijo internacional, por ejemplo). */
  minWidth?: number;
}) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  const lastSaved = useRef(value);
  useEffect(() => {
    setVal(value);
    lastSaved.current = value;
  }, [value]);
  return (
    <input
      value={val}
      placeholder={placeholder}
      disabled={pending}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val === lastSaved.current) return;
        lastSaved.current = val;
        const fd = new FormData();
        fd.set("id", id);
        fd.set(field, val);
        start(() => action(fd));
      }}
      style={{
        width: "100%",
        minWidth,
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "6px 8px",
        fontSize: 13,
        fontFamily: "inherit",
        color: "#0f172a",
        background: pending ? "#f8fafc" : "#fff",
      }}
    />
  );
}

/** Controlled textarea that saves on blur (only when changed) via a server action. */
function EditableCell({
  id,
  field,
  action,
  value,
  placeholder,
  rows = 2,
  minWidth = 200,
  autoGrow = false,
  maxHeight = 320,
}: {
  id: string;
  field: "notes" | "followup";
  action: (formData: FormData) => void | Promise<void>;
  value: string;
  placeholder: string;
  rows?: number;
  minWidth?: number;
  /** Crece con el contenido hasta `maxHeight`, para no leer notas largas por una rendija. */
  autoGrow?: boolean;
  maxHeight?: number;
}) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  const lastSaved = useRef(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setVal(value);
    lastSaved.current = value;
  }, [value]);

  // Alto mínimo en píxeles equivalente a `rows` líneas (13px · 1.5 + padding).
  // Sin esto, autoGrow encoge la caja a la altura del contenido e ignora `rows`.
  const minHeight = rows * 20 + 18;

  // Ajusta el alto al contenido, nunca por debajo del mínimo. Se recalcula al
  // escribir, no solo al montar.
  useEffect(() => {
    const el = ref.current;
    if (!autoGrow || !el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [autoGrow, maxHeight, minHeight, val]);

  return (
    <textarea
      ref={ref}
      value={val}
      placeholder={placeholder}
      rows={rows}
      disabled={pending}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val === lastSaved.current) return;
        lastSaved.current = val;
        const fd = new FormData();
        fd.set("id", id);
        fd.set(field, val);
        start(() => action(fd));
      }}
      style={{
        width: "100%",
        minWidth,
        minHeight,
        resize: "both",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: "inherit",
        color: "#0f172a",
        background: pending ? "#f8fafc" : "#fff",
      }}
    />
  );
}

/** Badge de estado del email + botón Reenviar para leads de Kit Digital 2026.
 *  El botón se resalta (rojo) cuando el email rebotó o fue marcado como spam. */
function EmailStatusCell({
  id,
  status,
  campaign,
  hasEmail,
}: {
  id: string;
  status: string | null;
  campaign: string | null;
  hasEmail: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const color = status ? EMAIL_STATUS_COLORS[status] ?? "#94a3b8" : "#cbd5e1";
  const canResend = campaign === "Kit Digital 2026" && hasEmail;
  const failed = status === "bounced" || status === "complained";

  const resend = () => {
    setMsg(null);
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      const r = await resendKitDigitalEmailAction(fd);
      setMsg(r.ok ? "Reenviado ✓" : r.error ?? "Error");
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}>
      <span
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          borderRadius: 999,
          background: status ? color : "#fff",
          color: status ? "#fff" : "#94a3b8",
          border: status ? "none" : "1px solid #e2e8f0",
          fontWeight: 700,
          fontSize: 12,
          padding: "3px 10px",
        }}
      >
        {emailStatusLabel(status)}
      </span>
      {canResend && (
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          style={{
            alignSelf: "flex-start",
            border: `1px solid ${failed ? "#dc2626" : "#cbd5e1"}`,
            background: failed ? "#fef2f2" : "#fff",
            color: failed ? "#b91c1c" : "#475569",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Enviando…" : failed ? "⟳ Reenviar" : "Reenviar"}
        </button>
      )}
      {msg && <span style={{ fontSize: 11, color: "#64748b" }}>{msg}</span>}
    </div>
  );
}

function btnStyle(
  bg: string,
  color: string,
  disabled: boolean,
  border = "#334155",
): React.CSSProperties {
  return {
    border: `1px solid ${border}`,
    background: bg,
    color,
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

/** Conmutador Tabla ↔ Agenda. El contador rojo son las llamadas vencidas o de
 *  hoy: es el número que no debe quedarse sin mirar. */
function ViewTabs({
  view,
  onChange,
  pending,
}: {
  view: "tabla" | "agenda";
  onChange: (v: "tabla" | "agenda") => void;
  pending: number;
}) {
  const tab = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? "#0b1220" : "#cbd5e1"}`,
    background: active ? "#0b1220" : "#fff",
    color: active ? "#fff" : "#475569",
    borderRadius: 999,
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  });
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      <button type="button" onClick={() => onChange("tabla")} style={tab(view === "tabla")}>
        📋 Tabla
      </button>
      <button type="button" onClick={() => onChange("agenda")} style={tab(view === "agenda")}>
        📅 Agenda
        {pending > 0 && (
          <span
            style={{
              background: "#dc2626",
              color: "#fff",
              borderRadius: 999,
              padding: "1px 8px",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {pending}
          </span>
        )}
      </button>
    </div>
  );
}

/** Casillas para esconder columnas que ahora mismo estorban. */
function ColumnsPanel({
  hidden,
  onToggle,
  onShowAll,
}: {
  hidden: Set<ColKey>;
  onToggle: (key: ColKey) => void;
  onShowAll: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <strong style={{ fontSize: 13, color: "#334155" }}>Columnas visibles</strong>
        <button
          type="button"
          onClick={onShowAll}
          disabled={hidden.size === 0}
          style={{
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: hidden.size === 0 ? "#cbd5e1" : "#475569",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            cursor: hidden.size === 0 ? "default" : "pointer",
          }}
        >
          Mostrar todas
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
        {COLUMNS.map((c) => (
          <label
            key={c.key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: hidden.has(c.key) ? "#94a3b8" : "#0f172a",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!hidden.has(c.key)}
              onChange={() => onToggle(c.key)}
              style={{ cursor: "pointer", width: 15, height: 15 }}
            />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Fecha de la próxima llamada.
 *
 *  El calendario se abre al pinchar en cualquier punto del campo, no solo en el
 *  iconito: `showPicker()` es lo que hace que se comporte como uno espera.
 *  Debajo van los atajos de lo que más se dice por teléfono ("el lunes que
 *  viene", "a partir de septiembre"), que evitan tener que navegar el
 *  calendario para la mitad de los casos. */
function FollowupDateCell({
  id,
  value,
  today,
  needsDate,
}: {
  id: string;
  value: string | null;
  today: string;
  /** El lead está en "Volver a llamar" pero nadie ha dicho cuándo. */
  needsDate: boolean;
}) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const valid = isFollowupDate(value);
  const overdue = valid && value! < today;
  const isToday = valid && value === today;

  // Lo que se ve mientras se escribe. El campo de fecha emite un valor por cada
  // pulsación ("0020-09-01" camino de "2026-09-01"), así que el borrador vive
  // aquí y solo se guarda cuando la fecha ya tiene sentido. Sin esto, guardar a
  // media escritura recargaba la tabla y el campo saltaba hacia atrás — que es
  // lo que hacía imposible corregir una fecha ya puesta.
  const [draft, setDraft] = useState(valid ? value! : "");
  useEffect(() => {
    setDraft(isFollowupDate(value) ? value! : "");
  }, [value]);

  const save = (next: string) => {
    setDraft(next);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("followup_at", next);
    start(() => setLeadFollowupDate(fd));
  };

  /** Cambio en el campo: se acepta el borrador siempre, pero solo se guarda
   *  cuando es una fecha completa y plausible (o cuando se ha vaciado). */
  const onDraftChange = (next: string) => {
    setDraft(next);
    if (next === "" || isFollowupDate(next)) save(next);
  };

  /** Abre el calendario nativo. No todos los navegadores traen showPicker,
   *  y si falta, el campo sigue funcionando a mano. */
  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      /* Firefox lo lanza si no viene de un gesto del usuario: se ignora */
    }
  };

  const border = overdue
    ? "#dc2626"
    : isToday || needsDate
      ? "#d97706"
      : "#e2e8f0";

  const shortcuts: { label: string; date: string; title: string }[] = [
    { label: "Mañana", date: addDays(today, 1), title: "Llamar mañana" },
    { label: "Lunes", date: nextWeekday(today, 1), title: "El lunes que viene" },
    { label: "+1 sem", date: addDays(today, 7), title: "Dentro de una semana" },
    {
      label: nextMonthLabel(today),
      date: startOfNextMonth(today),
      title: `A partir del 1 de ${nextMonthLabel(today)}`,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 150 }}>
      <div style={{ position: "relative" }}>
        <input
          ref={ref}
          type="date"
          value={draft}
          min={FOLLOWUP_MIN_DATE}
          max={FOLLOWUP_MAX_DATE}
          disabled={pending}
          onChange={(e) => onDraftChange(e.target.value)}
          // Si se sale del campo con algo a medias, se recupera lo guardado en
          // vez de dejar a la vista una fecha que no existe en la base.
          onBlur={() => setDraft(isFollowupDate(value) ? value! : "")}
          onClick={openPicker}
          onFocus={openPicker}
          aria-label="Fecha de la próxima llamada"
          style={{
            width: "100%",
            minWidth: 148,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: "6px 8px",
            fontSize: 13,
            fontFamily: "inherit",
            color: overdue ? "#dc2626" : draft ? "#0f172a" : "#94a3b8",
            fontWeight: overdue || isToday ? 700 : 400,
            background: pending ? "#f8fafc" : needsDate ? "#fffbeb" : "#fff",
            cursor: "pointer",
          }}
        />
      </div>

      {needsDate && (
        <span style={{ fontSize: 11, color: "#b45309", fontWeight: 700 }}>
          ¿A partir de cuándo?
        </span>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {shortcuts.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => save(s.date)}
            disabled={pending}
            title={s.title}
            style={{
              border: `1px solid ${value === s.date ? "#187bef" : "#e2e8f0"}`,
              background: value === s.date ? "#eff6ff" : "#fff",
              color: value === s.date ? "#187bef" : "#64748b",
              borderRadius: 6,
              padding: "2px 6px",
              fontSize: 11,
              fontWeight: 600,
              cursor: pending ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={openPicker}
          disabled={pending}
          title="Elegir otra fecha en el calendario"
          style={{
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#64748b",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 11,
            cursor: pending ? "default" : "pointer",
          }}
        >
          📅
        </button>
      </div>

      {valid && (
        <button
          type="button"
          onClick={() => save("")}
          disabled={pending}
          style={{
            border: "none",
            background: "none",
            color: "#94a3b8",
            fontSize: 11,
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          Quitar de la agenda
        </button>
      )}
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
