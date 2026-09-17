import Link from "next/link";
import { mesAnterior, mesSiguiente, nombreMes } from "@/lib/ventas/metricas";

export function SelectorMes({ mes, ruta }: { mes: string; ruta: string }) {
  const boton = { padding: "4px 10px", border: "1px solid #cbd5e1", borderRadius: 6, textDecoration: "none", color: "#334155", background: "#fff" } as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Link href={`${ruta}?mes=${mesAnterior(mes)}`} style={boton} aria-label="Mes anterior">←</Link>
      {/* Solo la primera letra: `text-transform: capitalize` pondría «Septiembre De 2026». */}
      <strong style={{ minWidth: 150, textAlign: "center" }}>
        {nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1)}
      </strong>
      <Link href={`${ruta}?mes=${mesSiguiente(mes)}`} style={boton} aria-label="Mes siguiente">→</Link>
    </div>
  );
}
