"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editAction, saveAsTemplateAction } from "../actions";
import { newBlock, type Block, type BlockType } from "@/lib/campaign-blocks";

const TYPE_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  paragraph: "Párrafo",
  checklist: "Checklist",
  button: "Botón",
  image: "Imagen",
  divider: "Separador",
  footer: "Pie",
};

const ADDABLE_TYPES: BlockType[] = ["hero", "paragraph", "checklist", "button", "image", "divider"];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  color: "#0f172a",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 13,
    color: "#475569",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}

function normalizeHex(v?: string): string {
  if (!v) return "#187bef";
  return v.startsWith("#") ? v : `#${v}`;
}

export function StepDesign({
  campaignId,
  blocks,
  setBlocks,
}: {
  campaignId: string;
  blocks: Block[];
  setBlocks: (next: Block[]) => void;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();
  const [templateName, setTemplateName] = useState("");
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templatePending, startTemplate] = useTransition();

  const updateProps = (idx: number, patch: Record<string, unknown>) => {
    const next = blocks.map((b, i) =>
      i === idx ? ({ ...b, props: { ...b.props, ...patch } } as Block) : b,
    );
    setBlocks(next);
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    if (blocks[idx].type === "footer" || blocks[target].type === "footer") return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  };

  const removeBlock = (idx: number) => {
    if (blocks[idx].type === "footer") return;
    setBlocks(blocks.filter((_, i) => i !== idx));
  };

  const addBlock = (type: BlockType) => {
    const nb = newBlock(type);
    const footerIdx = blocks.findIndex((b) => b.type === "footer");
    const next =
      footerIdx === -1
        ? [...blocks, nb]
        : [...blocks.slice(0, footerIdx), nb, ...blocks.slice(footerIdx)];
    setBlocks(next);
    setAddOpen(false);
  };

  const onApplyAi = () => {
    setAiError(null);
    startAi(async () => {
      const res = await editAction(campaignId, instruction);
      if (!res.ok) {
        setAiError(res.error || "No se pudo aplicar la edición.");
        return;
      }
      setInstruction("");
      router.refresh();
    });
  };

  const onSaveTemplate = () => {
    setTemplateError(null);
    setTemplateSaved(false);
    startTemplate(async () => {
      const res = await saveAsTemplateAction(campaignId, templateName, "");
      if (!res.ok) {
        setTemplateError(res.error || "No se pudo guardar la plantilla.");
        return;
      }
      setTemplateSaved(true);
      setTemplateName("");
      setShowTemplateInput(false);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {blocks.length === 0 && (
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          Todavía no hay bloques. Añade uno abajo o vuelve al paso 1 para generar una propuesta.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {TYPE_LABELS[block.type]}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => moveBlock(idx, -1)}
                  disabled={idx === 0 || block.type === "footer"}
                  style={iconBtnStyle(idx === 0 || block.type === "footer")}
                  aria-label="Subir bloque"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(idx, 1)}
                  disabled={
                    idx >= blocks.length - 1 ||
                    block.type === "footer" ||
                    blocks[idx + 1]?.type === "footer"
                  }
                  style={iconBtnStyle(
                    idx >= blocks.length - 1 ||
                      block.type === "footer" ||
                      blocks[idx + 1]?.type === "footer",
                  )}
                  aria-label="Bajar bloque"
                >
                  ↓
                </button>
                {block.type !== "footer" && (
                  <button
                    type="button"
                    onClick={() => removeBlock(idx)}
                    style={{ ...iconBtnStyle(false), color: "#b91c1c", borderColor: "#fecaca" }}
                    aria-label="Eliminar bloque"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>

            <BlockFields block={block} onChange={(patch) => updateProps(idx, patch)} />
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          style={{
            background: "none",
            border: "1px dashed #cbd5e1",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#187bef",
            cursor: "pointer",
          }}
        >
          ＋ Añadir bloque
        </button>
        {addOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {ADDABLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addBlock(t)}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 13,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
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
        <label style={labelStyle}>Editar con IA</label>
        <textarea
          style={textareaStyle}
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Ej: cambia el color de acento a verde, acorta el párrafo…"
        />
        {aiError && (
          <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{aiError}</p>
        )}
        <div>
          <button
            type="button"
            onClick={onApplyAi}
            disabled={aiPending || instruction.trim().length === 0}
            style={{
              background: "#187bef",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: aiPending ? "wait" : "pointer",
              opacity: aiPending || instruction.trim().length === 0 ? 0.6 : 1,
            }}
          >
            {aiPending ? "Aplicando…" : "Aplicar con IA"}
          </button>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {!showTemplateInput ? (
          <button
            type="button"
            onClick={() => {
              setShowTemplateInput(true);
              setTemplateSaved(false);
              setTemplateError(null);
            }}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Guardar como plantilla
          </button>
        ) : (
          <>
            <input
              style={{ ...inputStyle, width: 220 }}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nombre de la plantilla"
            />
            <button
              type="button"
              onClick={onSaveTemplate}
              disabled={templatePending || templateName.trim().length === 0}
              style={{
                background: "#187bef",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: templatePending ? "wait" : "pointer",
                opacity: templatePending || templateName.trim().length === 0 ? 0.6 : 1,
              }}
            >
              {templatePending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTemplateInput(false);
                setTemplateName("");
                setTemplateError(null);
              }}
              disabled={templatePending}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#475569",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: templatePending ? "wait" : "pointer",
              }}
            >
              Cancelar
            </button>
          </>
        )}
        {templateSaved && (
          <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>Guardada ✓</span>
        )}
        {templateError && (
          <span style={{ fontSize: 13, color: "#b91c1c" }}>{templateError}</span>
        )}
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  switch (block.type) {
    case "hero":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={labelStyle}>Eyebrow</label>
            <input
              style={inputStyle}
              value={block.props.eyebrow ?? ""}
              onChange={(e) => onChange({ eyebrow: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Título</label>
            <input
              style={inputStyle}
              value={block.props.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Texto</label>
            <textarea
              style={textareaStyle}
              rows={3}
              value={block.props.body ?? ""}
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </div>
          <AccentField value={block.props.accent} onChange={(v) => onChange({ accent: v })} />
        </div>
      );
    case "paragraph":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={labelStyle}>Texto</label>
            <textarea
              style={textareaStyle}
              rows={3}
              value={block.props.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Tamaño</label>
            <select
              style={inputStyle}
              value={block.props.size ?? "md"}
              onChange={(e) => onChange({ size: e.target.value })}
            >
              <option value="sm">Pequeño</option>
              <option value="md">Medio</option>
              <option value="lg">Grande</option>
            </select>
          </div>
        </div>
      );
    case "checklist":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={labelStyle}>Etiqueta</label>
            <input
              style={inputStyle}
              value={block.props.label ?? ""}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
          <ChecklistItemsField items={block.props.items} onChange={(items) => onChange({ items })} />
          <AccentField value={block.props.accent} onChange={(v) => onChange({ accent: v })} />
        </div>
      );
    case "button":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={labelStyle}>Texto del botón</label>
            <input
              style={inputStyle}
              value={block.props.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>URL</label>
            <input
              type="url"
              style={inputStyle}
              value={block.props.url}
              onChange={(e) => onChange({ url: e.target.value })}
            />
          </div>
          <AccentField value={block.props.accent} onChange={(v) => onChange({ accent: v })} />
        </div>
      );
    case "image":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={labelStyle}>URL de la imagen</label>
            <input
              style={inputStyle}
              value={block.props.src}
              onChange={(e) => onChange({ src: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Texto alternativo</label>
            <input
              style={inputStyle}
              value={block.props.alt ?? ""}
              onChange={(e) => onChange({ alt: e.target.value })}
            />
          </div>
        </div>
      );
    case "divider":
      return (
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
          Línea separadora, sin opciones.
        </p>
      );
    case "footer":
      return (
        <div>
          <label style={labelStyle}>Texto del pie</label>
          <input
            style={inputStyle}
            value={block.props.orgLine}
            onChange={(e) => onChange({ orgLine: e.target.value })}
          />
        </div>
      );
    default:
      return null;
  }
}

function AccentField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>Color de acento</label>
      <input
        type="color"
        value={normalizeHex(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 48,
          height: 32,
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: 2,
          cursor: "pointer",
        }}
      />
    </div>
  );
}

/** Textarea con un item por línea; solo confirma el cambio al perder foco y
 *  nunca deja la lista vacía (checklist.items exige mínimo 1 en el schema). */
function ChecklistItemsField({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [text, setText] = useState(items.join("\n"));
  useEffect(() => setText(items.join("\n")), [items]);

  const commit = () => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setText(items.join("\n"));
      return;
    }
    onChange(lines);
  };

  return (
    <div>
      <label style={labelStyle}>Puntos (uno por línea)</label>
      <textarea
        style={textareaStyle}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
    </div>
  );
}
