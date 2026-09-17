import { FASE_COLORES, FASE_LABELS, type Fase } from "@/lib/ventas/dominio";

export function FaseEtiqueta({ fase }: { fase: Fase }) {
  const c = FASE_COLORES[fase];
  return (
    <span style={{ display: "inline-block", background: c.bg, color: c.text, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {FASE_LABELS[fase]}
    </span>
  );
}
