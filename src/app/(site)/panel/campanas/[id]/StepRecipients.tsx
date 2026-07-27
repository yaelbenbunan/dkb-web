"use client";

import { useState, useTransition } from "react";
import { sendTestAction } from "../actions";
import type { LeadRow } from "@/lib/imagina-leads";

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    border: `1px solid ${active ? "#187bef" : "#e2e8f0"}`,
    background: active ? "#187bef" : "#fff",
    color: active ? "#fff" : "#475569",
    fontWeight: 700,
    fontSize: 12,
    padding: "5px 12px",
    cursor: "pointer",
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
  textAlign: "left",
};

const td: React.CSSProperties = {
  padding: "11px 14px",
  verticalAlign: "top",
  fontSize: 13,
  color: "#1e293b",
  borderTop: "1px solid #f1f5f9",
};

function distinct(values: (string | null)[]): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => !!v && v.trim() !== "")),
  ).sort();
}

export function StepRecipients({
  campaignId,
  emailableLeads,
  selected,
  setSelected,
  subject,
  fromEmail,
}: {
  campaignId: string;
  emailableLeads: LeadRow[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  subject: string;
  fromEmail: string;
}) {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [campaignFilter, setCampaignFilter] = useState("todos");
  const [channelFilter, setChannelFilter] = useState("todos");
  const [testEmails, setTestEmails] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testPending, startTest] = useTransition();

  const statuses = distinct(emailableLeads.map((l) => l.status));
  const campaigns = distinct(emailableLeads.map((l) => l.campaign));
  const channels = distinct(emailableLeads.map((l) => l.channel));

  const filtered = emailableLeads.filter(
    (l) =>
      (statusFilter === "todos" || l.status === statusFilter) &&
      (campaignFilter === "todos" || l.campaign === campaignFilter) &&
      (channelFilter === "todos" || l.channel === channelFilter),
  );

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      filtered.forEach((l) => next.delete(l.id));
    } else {
      filtered.forEach((l) => next.add(l.id));
    }
    setSelected(next);
  };

  const canSendTest = subject.trim().length > 0 && fromEmail.trim().length > 0;

  const onSendTest = () => {
    setTestResult(null);
    startTest(async () => {
      const res = await sendTestAction(campaignId, testEmails);
      setTestResult({
        ok: res.ok,
        msg: res.ok ? "Enviado ✓" : res.error || "No se pudo enviar la prueba.",
      });
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FilterRow label="Estado" value={statusFilter} options={statuses} onChange={setStatusFilter} />
        <FilterRow label="Campaña" value={campaignFilter} options={campaigns} onChange={setCampaignFilter} />
        <FilterRow label="Canal" value={channelFilter} options={channels} onChange={setChannelFilter} />
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
        Solo aparecen leads con consentimiento, con email y sin rebotes ni quejas registradas.
      </p>

      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
        {selected.size} destinatario{selected.size === 1 ? "" : "s"} seleccionado
        {selected.size === 1 ? "" : "s"}
      </span>

      <div
        style={{
          overflowX: "auto",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ ...th, width: 36, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ cursor: "pointer", width: 16, height: 16 }}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th style={th}>Nombre</th>
              <th style={th}>Email</th>
              <th style={th}>Estado</th>
              <th style={th}>Canal</th>
              <th style={th}>Campaña</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 24 }}>
                  No hay destinatarios que cumplan estos filtros.
                </td>
              </tr>
            )}
            {filtered.map((l) => {
              const isSel = selected.has(l.id);
              return (
                <tr key={l.id} style={{ background: isSel ? "#eff6ff" : undefined }}>
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(l.id)}
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                      aria-label={`Seleccionar ${l.name ?? l.email ?? "lead"}`}
                    />
                  </td>
                  <td style={td}>{l.name || "—"}</td>
                  <td style={td}>{l.email}</td>
                  <td style={td}>{l.status || "—"}</td>
                  <td style={td}>{l.channel || "—"}</td>
                  <td style={td}>{l.campaign || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
          Enviar prueba a
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={testEmails}
            onChange={(e) => setTestEmails(e.target.value)}
            placeholder="tú@dinkbit.es, otro@dinkbit.es"
            style={{
              flex: "1 1 260px",
              padding: "8px 10px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 13,
              color: "#0f172a",
            }}
          />
          <button
            type="button"
            onClick={onSendTest}
            disabled={testPending || !canSendTest || testEmails.trim().length === 0}
            style={{
              background: "#187bef",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: testPending ? "wait" : "pointer",
              opacity:
                testPending || !canSendTest || testEmails.trim().length === 0 ? 0.6 : 1,
            }}
          >
            {testPending ? "Enviando…" : "Enviar prueba"}
          </button>
        </div>
        {!canSendTest && (
          <p style={{ fontSize: 12, color: "#b45309", margin: 0 }}>
            Añade un asunto y un remitente antes de enviar una prueba.
          </p>
        )}
        {testResult && (
          <p
            style={{
              fontSize: 13,
              color: testResult.ok ? "#16a34a" : "#b91c1c",
              margin: 0,
            }}
          >
            {testResult.msg}
          </p>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", minWidth: 60 }}>
        {label}
      </span>
      <button type="button" onClick={() => onChange("todos")} style={chipStyle(value === "todos")}>
        Todos
      </button>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} style={chipStyle(value === opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}
