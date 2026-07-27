"use client";

import { useState, useTransition } from "react";
import { sendCampaignAction } from "../actions";

export function StepSend({
  campaignId,
  subject,
  fromEmail,
  selectedCount,
  selectedIds,
}: {
  campaignId: string;
  subject: string;
  fromEmail: string;
  selectedCount: number;
  selectedIds: string[];
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const canSend = selectedCount > 0 && subject.trim().length > 0;

  const onSend = () => {
    setResult(null);
    start(async () => {
      const res = await sendCampaignAction(campaignId, selectedIds.join(","));
      if (res.ok) {
        setResult({ ok: true, msg: `Enviada: ${res.sent ?? 0} · Omitidos: ${res.skipped ?? 0}` });
      } else {
        setResult({ ok: false, msg: res.error || "No se pudo enviar la campaña." });
      }
      setConfirming(false);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <SummaryRow label="Asunto" value={subject || "—"} />
        <SummaryRow label="Remitente" value={fromEmail || "—"} />
        <SummaryRow label="Destinatarios" value={String(selectedCount)} />
      </div>

      {!canSend && (
        <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
          Selecciona al menos un destinatario y define un asunto antes de enviar.
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!canSend || pending}
          style={{
            background: "#187bef",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: !canSend || pending ? "not-allowed" : "pointer",
            opacity: !canSend || pending ? 0.6 : 1,
            alignSelf: "flex-start",
          }}
        >
          Enviar campaña
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            ¿Enviar a {selectedCount} destinatario{selectedCount === 1 ? "" : "s"}?
          </span>
          <button
            type="button"
            onClick={onSend}
            disabled={pending}
            style={{
              background: "#187bef",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Enviando…" : "Confirmar envío"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: pending ? "wait" : "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {result && (
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: result.ok ? "#16a34a" : "#b91c1c",
            margin: 0,
          }}
        >
          {result.msg}
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
