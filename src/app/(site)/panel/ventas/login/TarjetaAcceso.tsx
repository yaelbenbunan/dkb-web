import Image from "next/image";

export const etiquetaAcceso = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 } as const;
export const campoAcceso = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 15,
  marginBottom: 14,
  color: "#0f172a",
  boxSizing: "border-box",
} as const;
export const botonAcceso = {
  width: "100%",
  background: "#187bef",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "11px 0",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
} as const;
export const enlaceAcceso = { color: "#1557b8", fontSize: 14 } as const;

/** El marco de las pantallas de acceso: fondo oscuro, tarjeta blanca y logo. */
export function TarjetaAcceso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 16, padding: 28, boxSizing: "border-box" }}>
        <Image src="/img/logo/dinkbit.svg" alt="dinkbit" width={110} height={33} priority style={{ height: 33, width: 110 }} />
        <h1 style={{ margin: "10px 0 18px", fontSize: 22, color: "#0f172a" }}>{titulo}</h1>
        {children}
      </div>
    </div>
  );
}
