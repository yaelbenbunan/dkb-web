"use client";

import { useRef, useState } from "react";
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
          <form
            action={deleteLeadsAction}
            onSubmit={(e) => {
              if (
                !confirm(
                  `¿Eliminar ${selected.size} lead${selected.size > 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
                )
              ) {
                e.preventDefault();
                return;
              }
              setSelected(new Set());
            }}
            style={{ margin: 0 }}
          >
            <input type="hidden" name="ids" value={[...selected].join(",")} />
            <button
              type="submit"
              style={{
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🗑 Eliminar
            </button>
          </form>
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
                      name="notes"
                      action={setLeadNotes}
                      value={l.notes ?? ""}
                      placeholder="Añadir notas…"
                    />
                  </td>
                  <td style={td}>
                    <AccountManagerSelect id={l.id} value={l.account_manager ?? ""} />
                  </td>
                  <td style={td}>
                    <StatusSelectInline id={l.id} value={l.status} />
                  </td>
                  <td style={{ ...td, whiteSpace: "normal", minWidth: 220 }}>
                    <EditableCell
                      id={l.id}
                      name="followup"
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

function EditableCell({
  id,
  name,
  action,
  value,
  placeholder,
}: {
  id: string;
  name: "notes" | "followup";
  action: (formData: FormData) => void | Promise<void>;
  value: string;
  placeholder: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={id} />
      <textarea
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        rows={2}
        onBlur={(e) => {
          if (e.target.value !== value) formRef.current?.requestSubmit();
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
          background: "#fff",
        }}
      />
    </form>
  );
}

function AccountManagerSelect({ id, value }: { id: string; value: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const color = AM_COLORS[value] ?? "#94a3b8";
  return (
    <form ref={formRef} action={setLeadAccountManager} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={id} />
      <select
        name="account_manager"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        style={{
          borderRadius: 999,
          border: `1px solid ${value ? color : "#cbd5e1"}`,
          color: value ? color : "#64748b",
          background: value ? `${color}14` : "#fff",
          fontWeight: 700,
          fontSize: 12,
          padding: "5px 10px",
          cursor: "pointer",
        }}
      >
        <option value="">Sin asignar</option>
        {ACCOUNT_MANAGERS.map((am) => (
          <option key={am} value={am}>
            {am}
          </option>
        ))}
      </select>
    </form>
  );
}

function StatusSelectInline({ id, value }: { id: string; value: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const color = STATUS_COLORS[value] ?? "#cbd5e1";
  return (
    <form ref={formRef} action={setLeadStatus} style={{ margin: 0 }}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        style={{
          borderRadius: 999,
          border: `1px solid ${color}`,
          color,
          background: `${color}14`,
          fontWeight: 700,
          fontSize: 12,
          padding: "5px 10px",
          cursor: "pointer",
          textTransform: "capitalize",
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
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
