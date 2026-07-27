"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateAction } from "../actions";
import type { EmailTemplateRow } from "@/lib/campaigns";
import type { Block } from "@/lib/campaign-blocks";

const AI_TEMPLATE_ID = "__ai__";

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
} as const;

const textareaStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  color: "#0f172a",
  resize: "vertical" as const,
};

export function StepConcept({
  campaignId,
  templates,
  goTo,
}: {
  campaignId: string;
  templates: EmailTemplateRow[];
  blocks: Block[];
  setBlocks: (next: Block[]) => void;
  goTo: (step: 1 | 2 | 3 | 4) => void;
}) {
  const router = useRouter();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(AI_TEMPLATE_ID);
  const [concept, setConcept] = useState("");
  const [refs, setRefs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onGenerate = () => {
    setError(null);
    start(async () => {
      const templateId = selectedTemplateId === AI_TEMPLATE_ID ? undefined : selectedTemplateId;
      const res = await generateAction(campaignId, concept, refs, templateId);
      if (!res.ok) {
        setError(res.error || "No se pudo generar la propuesta.");
        return;
      }
      router.refresh();
      goTo(2);
    });
  };

  const disabled = pending || concept.trim().length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <div>
        <label style={labelStyle}>Plantilla de partida</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
              background: selectedTemplateId === AI_TEMPLATE_ID ? "#eff6ff" : "#fff",
            }}
          >
            <input
              type="radio"
              name="template"
              checked={selectedTemplateId === AI_TEMPLATE_ID}
              onChange={() => setSelectedTemplateId(AI_TEMPLATE_ID)}
            />
            Que proponga la IA
          </label>
          {templates.map((t) => (
            <label
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                background: selectedTemplateId === t.id ? "#eff6ff" : "#fff",
              }}
            >
              <input
                type="radio"
                name="template"
                checked={selectedTemplateId === t.id}
                onChange={() => setSelectedTemplateId(t.id)}
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>¿Qué quieres comunicar?</label>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          rows={4}
          placeholder="Ej: Lanzamos una promoción de verano para clientes inactivos…"
          style={textareaStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Referencias / estilo (opcional)</label>
        <textarea
          value={refs}
          onChange={(e) => setRefs(e.target.value)}
          rows={3}
          placeholder="Ej: tono cercano, incluir un CTA a la landing…"
          style={textareaStyle}
        />
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{error}</p>
      )}

      <div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          style={{
            background: "#187bef",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {pending ? "Generando…" : "Generar propuesta"}
        </button>
      </div>
    </div>
  );
}
