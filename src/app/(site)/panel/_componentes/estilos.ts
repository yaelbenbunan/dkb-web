/** Estilos compartidos del panel de ventas: los mismos tonos que el panel de leads. */

export const tarjeta = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" } as const;

export const titulo = { margin: "0 0 14px", fontSize: 18, color: "#0f172a" } as const;

export const etiqueta = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569", fontWeight: 600 } as const;

export const campo = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  color: "#0f172a",
  background: "#fff",
  fontFamily: "inherit",
} as const;

export const botonPrimario = {
  background: "#187bef",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
} as const;

export const botonSecundario = {
  background: "#fff",
  color: "#334155",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
} as const;

export const th = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 12,
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  whiteSpace: "nowrap",
} as const;

export const td = { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 14, color: "#1e293b", verticalAlign: "top" } as const;
