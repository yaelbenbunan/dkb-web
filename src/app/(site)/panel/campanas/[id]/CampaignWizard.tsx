"use client";

import { useRef, useState } from "react";
import { saveBlocksAction } from "../actions";
import { blocksSchema, DEFAULT_STYLE, type Block, type CampaignStyle } from "@/lib/campaign-blocks";
import type { CampaignRow, EmailTemplateRow } from "@/lib/campaigns";
import { PreviewFrame } from "./PreviewFrame";
import { StepConcept } from "./StepConcept";

export type WizardStep = 1 | 2 | 3 | 4;

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Concepto" },
  { step: 2, label: "Diseño" },
  { step: 3, label: "Destinatarios" },
  { step: 4, label: "Enviar" },
];

const SAVE_DEBOUNCE_MS = 600;

function parseInitialBlocks(raw: unknown): Block[] {
  const parsed = blocksSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function CampaignWizard({
  campaign,
  templates,
}: {
  campaign: CampaignRow;
  templates: EmailTemplateRow[];
}) {
  const initialBlocks = parseInitialBlocks(campaign.blocks);
  const [step, setStep] = useState<WizardStep>(initialBlocks.length > 0 ? 2 : 1);
  const [blocks, setBlocksState] = useState<Block[]>(initialBlocks);
  const [style] = useState<CampaignStyle>(DEFAULT_STYLE);
  const [subject, setSubject] = useState(campaign.subject ?? "");
  const [fromEmail, setFromEmail] = useState(campaign.from_email ?? "hola@dinkbit.es");
  const [name, setName] = useState(campaign.name ?? "");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (next: WizardStep) => setStep(next);

  const setBlocks = (next: Block[]) => {
    setBlocksState(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveBlocksAction(campaign.id, JSON.stringify(next));
    }, SAVE_DEBOUNCE_MS);
  };

  const stepIndex = STEPS.findIndex((s) => s.step === step);
  const canGoPrev = stepIndex > 0;
  const canGoNext = stepIndex < STEPS.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "12px 16px",
        }}
      >
        {STEPS.map((s, i) => (
          <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => goTo(s.step)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 6,
                color: s.step === step ? "#187bef" : "#64748b",
                fontWeight: s.step === step ? 700 : 500,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: s.step === step ? "#187bef" : "#e2e8f0",
                  color: s.step === step ? "#fff" : "#475569",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {s.step}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <span style={{ color: "#cbd5e1", fontSize: 13 }}>·</span>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px", fontSize: 12, color: "#64748b" }}>
          Nombre interno
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Newsletter julio"
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, color: "#0f172a" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 220px", fontSize: 12, color: "#64748b" }}>
          Asunto
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del email"
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, color: "#0f172a" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px", fontSize: 12, color: "#64748b" }}>
          Remitente
          <input
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="hola@dinkbit.es"
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, color: "#0f172a" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 420px",
            minWidth: 320,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 20,
          }}
        >
          {step === 1 && (
            <StepConcept
              campaignId={campaign.id}
              templates={templates}
              blocks={blocks}
              setBlocks={setBlocks}
              goTo={goTo}
            />
          )}
          {step === 2 && <div>Paso 2 (en construcción)</div>}
          {step === 3 && <div>Paso 3 (en construcción)</div>}
          {step === 4 && <div>Paso 4 (en construcción)</div>}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              onClick={() => canGoPrev && goTo(STEPS[stepIndex - 1].step)}
              disabled={!canGoPrev}
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#334155",
                cursor: canGoPrev ? "pointer" : "not-allowed",
                opacity: canGoPrev ? 1 : 0.5,
              }}
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => canGoNext && goTo(STEPS[stepIndex + 1].step)}
              disabled={!canGoNext}
              style={{
                background: "#187bef",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: canGoNext ? "pointer" : "not-allowed",
                opacity: canGoNext ? 1 : 0.5,
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>

        <div style={{ flex: "1 1 420px", minWidth: 320 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 8px" }}>
            Previsualización
          </p>
          <PreviewFrame blocks={blocks} style={style} subject={subject || name || ""} />
        </div>
      </div>
    </div>
  );
}
