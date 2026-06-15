"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  setLeadStatus,
  setLeadAccountManager,
  setLeadNotes,
  setLeadFollowup,
  archiveLeadsAction,
  deleteLeadsAction,
} from "./actions";
import { LEAD_STATUSES, STATUS_COLORS } from "@/lib/lead-status";
import { ACCOUNT_MANAGERS, AM_COLORS } from "@/lib/account-managers";

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
  account_manager: string | null;
  status: string;
  archived: boolean;
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
  landing: "#0d9488",
};

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

const webLabel = (raw: string) =>
  raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");

export function LeadsTable({ leads }: { leads: LeadRowView[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [busy, start] = useTransition();

  // Pool for the current view (active vs archived), then status filter on top.
  const pool = leads.filter((l) => (showArchived ? l.archived : !l.archived));
  const visible =
    statusFilter === "todos"
      ? pool
      : pool.filter((l) => l.status === statusFilter);

  const archivedCount = leads.filter((l) => l.archived).length;
  const statusCounts = (s: string) =>
    pool.filter((l) => l.status === s).length;

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

  return (
    <>
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
            label={s}
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
              onClick={onDelete}
              disabled={busy}
              style={btnStyle("#fef2f2", "#b91c1c", busy, "#fecaca")}
            >
              🗑 Eliminar
            </button>
          </>
        )}
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
            minWidth: 1200,
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
              {[
                "Fecha",
                "Nombre",
                "Teléfono",
                "Email",
                "Web",
                "Canal",
                "Campaña",
                "Notas adicionales",
                "Account manager",
                "Estado",
                "Seguimiento",
              ].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={12}
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
                  <td style={{ ...td, color: "#64748b", fontSize: 13 }}>
                    {fmtDate(l.created_at)}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{l.name ?? "—"}</td>
                  <td style={td}>
                    {l.phone ? (
                      <a
                        href={`tel:${l.phone.replace(/\s+/g, "")}`}
                        style={{ color: "#187bef" }}
                      >
                        {l.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={td}>
                    {l.email ? (
                      <a href={`mailto:${l.email}`} style={{ color: "#187bef" }}>
                        {l.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
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
                  <td style={td}>
                    {l.channel ? (
                      <span
                        style={{
                          display: "inline-block",
                          borderRadius: 999,
                          padding: "3px 9px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: CHANNEL_COLORS[l.channel] ?? "#334155",
                          background: `${CHANNEL_COLORS[l.channel] ?? "#94a3b8"}14`,
                        }}
                      >
                        {l.channel}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={td}>{l.campaign ?? "—"}</td>
                  <td style={{ ...td, whiteSpace: "normal", minWidth: 240 }}>
                    <EditableCell
                      id={l.id}
                      field="notes"
                      action={setLeadNotes}
                      value={l.notes ?? ""}
                      placeholder="Añadir notas…"
                    />
                  </td>
                  <td style={td}>
                    <AccountManagerSelect
                      id={l.id}
                      value={l.account_manager ?? ""}
                    />
                  </td>
                  <td style={td}>
                    <StatusSelect id={l.id} value={l.status} />
                  </td>
                  <td style={{ ...td, whiteSpace: "normal", minWidth: 220 }}>
                    <EditableCell
                      id={l.id}
                      field="followup"
                      action={setLeadFollowup}
                      value={l.followup ?? ""}
                      placeholder="Ej: llamado, no contesta…"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

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
        textTransform: "capitalize",
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
        textTransform: "capitalize",
        opacity: pending ? 0.6 : 1,
        appearance: "none",
      }}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s} style={{ color: "#0f172a", background: "#fff" }}>
          {s}
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

/** Controlled textarea that saves on blur (only when changed) via a server action. */
function EditableCell({
  id,
  field,
  action,
  value,
  placeholder,
}: {
  id: string;
  field: "notes" | "followup";
  action: (formData: FormData) => void | Promise<void>;
  value: string;
  placeholder: string;
}) {
  const [val, setVal] = useState(value);
  const [pending, start] = useTransition();
  const lastSaved = useRef(value);
  useEffect(() => {
    setVal(value);
    lastSaved.current = value;
  }, [value]);

  return (
    <textarea
      value={val}
      placeholder={placeholder}
      rows={2}
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
        minWidth: 200,
        resize: "vertical",
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
