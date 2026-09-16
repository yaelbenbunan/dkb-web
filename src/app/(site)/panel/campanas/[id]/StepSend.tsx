"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelScheduleAction, scheduleCampaignAction, sendCampaignAction } from "../actions";
import { DEFAULT_SENDER_NAME, sanitizeSenderName } from "@/lib/email-from";
import { checkScheduleTime, formatMadrid, MIN_LEAD_MINUTES } from "@/lib/campaign-schedule";

type Mode = "now" | "schedule";

/** `datetime-local` trabaja en la hora del navegador y sin zona: se rellena y
 *  se lee así, y se convierte a ISO (UTC) solo al mandarlo al servidor. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StepSend({
  campaignId,
  status,
  scheduledAt,
  scheduledCount,
  sentAt,
  recipientsTotal,
  subject,
  fromEmail,
  fromName,
  preheader,
  selectedCount,
  selectedIds,
}: {
  campaignId: string;
  status: string;
  scheduledAt: string | null;
  scheduledCount: number;
  sentAt: string | null;
  recipientsTotal: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  preheader: string;
  selectedCount: number;
  selectedIds: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("now");
  const [when, setWhen] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [done, setDone] = useState(false);

  const canSend = selectedCount > 0 && subject.trim().length > 0;
  const whenDate = when ? new Date(when) : null;
  const whenCheck = whenDate
    ? checkScheduleTime(Number.isNaN(whenDate.getTime()) ? "" : whenDate.toISOString())
    : null;
  const canConfirm = canSend && (mode === "now" || whenCheck?.ok === true);

  const onSend = () => {
    setResult(null);
    start(async () => {
      const res = await sendCampaignAction(campaignId, selectedIds.join(","));
      if (res.ok) {
        setResult({ ok: true, msg: `Enviada: ${res.sent ?? 0} · Omitidos: ${res.skipped ?? 0}` });
        setDone(true);
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error || "No se pudo enviar la campaña." });
      }
      setConfirming(false);
    });
  };

  const onSchedule = () => {
    if (!whenCheck?.ok) return;
    setResult(null);
    start(async () => {
      const res = await scheduleCampaignAction(campaignId, selectedIds.join(","), whenCheck.iso);
      if (res.ok) {
        router.refresh();
      } else {
        setResult({ ok: false, msg: res.error || "No se pudo programar la campaña." });
      }
      setConfirming(false);
    });
  };

  const onCancelSchedule = () => {
    setResult(null);
    start(async () => {
      const res = await cancelScheduleAction(campaignId);
      if (!res.ok) setResult({ ok: false, msg: res.error || "No se pudo cancelar." });
      router.refresh();
    });
  };

  const summary = (
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
      <SummaryRow
        label="Remitente"
        value={fromEmail ? `${sanitizeSenderName(fromName) || DEFAULT_SENDER_NAME} <${fromEmail}>` : "—"}
      />
      <SummaryRow label="Texto previo" value={preheader || "La primera línea del correo"} />
      <SummaryRow
        label="Destinatarios"
        value={String(status === "scheduled" ? scheduledCount : selectedCount)}
      />
    </div>
  );

  if (status === "sent" || status === "sending") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
        {summary}
        <p style={{ fontSize: 14, fontWeight: 600, color: "#16a34a", margin: 0 }}>
          {status === "sending"
            ? "Se está enviando ahora mismo."
            : `Enviada${sentAt ? ` el ${formatMadrid(sentAt)}` : ""} a ${recipientsTotal} destinatario${recipientsTotal === 1 ? "" : "s"}. El rendimiento está arriba.`}
        </p>
      </div>
    );
  }

  if (status === "scheduled") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
        {summary}
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <strong style={{ fontSize: 14, color: "#92400e" }}>
            Programada para el {scheduledAt ? formatMadrid(scheduledAt) : "—"} (hora de Madrid)
          </strong>
          <span style={{ fontSize: 13, color: "#92400e" }}>
            Puedes seguir retocando el asunto y el diseño: se envía lo que esté guardado a esa hora,
            con unos minutos de margen. Para cambiar los destinatarios o la hora, cancela y vuelve a
            programar.
          </span>
        </div>
        <button
          type="button"
          onClick={onCancelSchedule}
          disabled={pending}
          style={{ ...secondaryButton, alignSelf: "flex-start", cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Cancelando…" : "Cancelar programación"}
        </button>
        {result && <ResultLine result={result} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
      {summary}

      {!canSend && (
        <p style={{ fontSize: 13, color: "#b45309", margin: 0 }}>
          Selecciona al menos un destinatario y define un asunto antes de enviar.
        </p>
      )}

      {done && result ? (
        <ResultLine result={result} />
      ) : (
        <>
          <div role="radiogroup" aria-label="Cuándo enviar" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              [
                ["now", "Enviar ahora"],
                ["schedule", "Programar envío"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => {
                  setMode(value);
                  setConfirming(false);
                  setResult(null);
                }}
                disabled={pending}
                style={{
                  border: `1px solid ${mode === value ? "#187bef" : "#e2e8f0"}`,
                  background: mode === value ? "#eff6ff" : "#fff",
                  color: mode === value ? "#1d4ed8" : "#475569",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: pending ? "wait" : "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "schedule" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#64748b" }}>
              Fecha y hora de envío
              <input
                type="datetime-local"
                value={when}
                min={toLocalInputValue(new Date(Date.now() + MIN_LEAD_MINUTES * 60_000))}
                onChange={(e) => {
                  setWhen(e.target.value);
                  setConfirming(false);
                }}
                disabled={pending}
                style={{
                  padding: "8px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "#0f172a",
                  alignSelf: "flex-start",
                }}
              />
              <span style={{ color: whenCheck && !whenCheck.ok ? "#b45309" : "#94a3b8" }}>
                {whenCheck && !whenCheck.ok
                  ? whenCheck.error
                  : whenCheck?.ok
                    ? `Saldrá el ${formatMadrid(whenCheck.iso)} (hora de Madrid), con hasta 5 minutos de margen.`
                    : "Se envía automáticamente, aunque no tengas el panel abierto."}
              </span>
            </label>
          )}

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canConfirm || pending}
              style={{
                ...primaryButton,
                padding: "10px 20px",
                fontSize: 14,
                cursor: !canConfirm || pending ? "not-allowed" : "pointer",
                opacity: !canConfirm || pending ? 0.6 : 1,
                alignSelf: "flex-start",
              }}
            >
              {mode === "now" ? "Enviar campaña" : "Programar envío"}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                {mode === "now"
                  ? `¿Enviar a ${selectedCount} destinatario${selectedCount === 1 ? "" : "s"}?`
                  : `¿Programar para el ${whenCheck?.ok ? formatMadrid(whenCheck.iso) : "—"} a ${selectedCount} destinatario${selectedCount === 1 ? "" : "s"}?`}
              </span>
              <button
                type="button"
                onClick={mode === "now" ? onSend : onSchedule}
                disabled={pending}
                style={{ ...primaryButton, cursor: pending ? "wait" : "pointer", opacity: pending ? 0.6 : 1 }}
              >
                {mode === "now"
                  ? pending
                    ? "Enviando…"
                    : "Confirmar envío"
                  : pending
                    ? "Programando…"
                    : "Confirmar programación"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                style={{ ...secondaryButton, cursor: pending ? "wait" : "pointer" }}
              >
                Cancelar
              </button>
            </div>
          )}

          {result && <ResultLine result={result} />}
        </>
      )}
    </div>
  );
}

const primaryButton = {
  background: "#187bef",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
} as const;

const secondaryButton = {
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#475569",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
} as const;

function ResultLine({ result }: { result: { ok: boolean; msg: string } }) {
  return (
    <p style={{ fontSize: 14, fontWeight: 600, color: result.ok ? "#16a34a" : "#b91c1c", margin: 0 }}>
      {result.msg}
    </p>
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
