"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  setLeadStatus,
  setLeadAccountManager,
  setLeadNotes,
  setLeadFollowup,
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
  notes: string | null;
  followup: string | null;
  account_manager: string | null;
  status: string;
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

export function LeadsTable({ leads }: { leads: LeadRowView[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, startDelete] = useTransition();

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));

  const onDelete = () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `¿Eliminar ${selected.size} lead${selected.size > 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    const fd = new FormData();
    fd.set("ids", [...selected].join(","));
    startDelete(async () => {
      await deleteLeadsAction(fd);
      setSelected(new Set());
    });
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          minHeight: 34,
        }}
      >
        <span style={{ fontSize: 13, color: "#475569" }}>
          {selected.size > 0
            ? `${selected.size} seleccionado${selected.size > 1 ? "s" : ""}`
            : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
        </span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: deleting ? "wait" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            🗑 Eliminar
          </button>
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
            minWidth: 1100,
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
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  style={{
                    ...td,
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: 28,
                  }}
                >
                  Aún no hay leads.
                </td>
              </tr>
            )}
            {leads.map((l) => {
              const isSel = selected.has(l.id);
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
