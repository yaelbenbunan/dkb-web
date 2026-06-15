"use client";

import { useState } from "react";
import type { Catalogo } from "@/lib/service-catalog";

interface Linea {
  categoria: string;
  concepto: string;
  cantidad: number;
  precio: number;
  tipo: string;
}

const nuevaLinea = (): Linea => ({
  categoria: "",
  concepto: "",
  cantidad: 1,
  precio: 0,
  tipo: "Puntual",
});

const MESES_RAPIDOS = [3, 6, 12, 24];

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt = (n: number) => eur.format(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

const TIPO_COLOR: Record<string, string> = {
  Puntual: "#0284c7",
  Mensual: "#16a34a",
  Anual: "#d97706",
};

export function Calculadora({ catalogo }: { catalogo: Catalogo }) {
  const categorias = Object.keys(catalogo).sort();
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()]);
  const [meses, setMeses] = useState(12);

  const setLinea = (i: number, cambio: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambio } : l)));
  const elegirCategoria = (i: number, cat: string) =>
    setLinea(i, { categoria: cat, concepto: "", precio: 0, tipo: "Puntual" });
  const elegirConcepto = (i: number, con: string) => {
    const s = (catalogo[lineas[i].categoria] ?? []).find((x) => x.concepto === con);
    setLinea(i, {
      concepto: con,
      precio: s ? s.precioBase : 0,
      tipo: s ? s.tipo : "Puntual",
    });
  };
  const addLinea = () => setLineas((ls) => [...ls, nuevaLinea()]);
  const delLinea = (i: number) =>
    setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [nuevaLinea()]));
  const limpiar = () => setLineas([nuevaLinea()]);

  const validas = lineas.filter((l) => l.concepto && l.precio > 0);
  const sub = (l: Linea) => l.cantidad * l.precio;
  const sumaTipo = (t: string) =>
    validas.filter((l) => l.tipo === t).reduce((a, l) => a + sub(l), 0);

  const puntual = round2(sumaTipo("Puntual"));
  const mensual = round2(sumaTipo("Mensual"));
  const anual = round2(sumaTipo("Anual"));
  const m = Math.max(0, meses || 0);
  const proyeccion = round2(puntual + mensual * m + (anual * m) / 12);
  const media = m > 0 ? round2(proyeccion / m) : 0;

  return (
    <div style={{ display: "grid", gap: 22, gridTemplateColumns: "minmax(0,1fr) 340px" }}>
      {/* Selector */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>Servicios</span>
          <div style={{ display: "flex", gap: 14 }}>
            <button onClick={limpiar} style={linkBtn("#94a3b8")}>Limpiar</button>
            <button onClick={addLinea} style={linkBtn("#187bef")}>+ Añadir servicio</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lineas.map((l, i) => (
            <div
              key={i}
              style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 52px 96px 84px auto", gap: 8, alignItems: "center" }}
            >
              <select value={l.categoria} onChange={(e) => elegirCategoria(i, e.target.value)} style={inputSm}>
                <option value="">Categoría…</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={l.concepto}
                onChange={(e) => elegirConcepto(i, e.target.value)}
                disabled={!l.categoria}
                style={{ ...inputSm, opacity: l.categoria ? 1 : 0.5 }}
              >
                <option value="">Servicio…</option>
                {(catalogo[l.categoria] ?? []).map((s) => (
                  <option key={s.concepto} value={s.concepto}>{s.concepto}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={l.cantidad}
                onChange={(e) => setLinea(i, { cantidad: Math.max(1, Number(e.target.value)) })}
                style={{ ...inputSm, textAlign: "center" }}
                title="Cantidad"
              />
              <input
                type="number"
                step="0.01"
                value={l.precio || ""}
                onChange={(e) => setLinea(i, { precio: Number(e.target.value) })}
                placeholder="Precio"
                style={{ ...inputSm, textAlign: "right" }}
                title="Precio (editable)"
              />
              <span
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: TIPO_COLOR[l.tipo] ?? "#64748b",
                  background: `${TIPO_COLOR[l.tipo] ?? "#94a3b8"}14`,
                  border: `1px solid ${TIPO_COLOR[l.tipo] ?? "#cbd5e1"}33`,
                  borderRadius: 6,
                  padding: "5px 6px",
                }}
              >
                {l.tipo || "—"}
              </span>
              <button onClick={() => delLinea(i)} style={{ ...linkBtn("#e11d48"), padding: "4px 8px" }} title="Quitar">✕</button>
            </div>
          ))}
        </div>

        {/* Meses a proyectar */}
        <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8 }}>Meses a proyectar</div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {MESES_RAPIDOS.map((n) => (
              <button
                key={n}
                onClick={() => setMeses(n)}
                style={{
                  borderRadius: 8,
                  border: "1px solid " + (meses === n ? "#187bef" : "#e2e8f0"),
                  background: meses === n ? "#187bef" : "#fff",
                  color: meses === n ? "#fff" : "#475569",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {n} meses
              </button>
            ))}
            <input
              type="number"
              min={1}
              value={meses}
              onChange={(e) => setMeses(Math.max(1, Number(e.target.value)))}
              style={{ ...inputSm, width: 76, textAlign: "center" }}
            />
            <span style={{ fontSize: 13, color: "#64748b" }}>meses</span>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <aside style={{ height: "fit-content", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", padding: 18 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#94a3b8", fontWeight: 700 }}>
          Resumen
        </div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
          {validas.length === 0 && (
            <div style={{ color: "#94a3b8" }}>Añade servicios para ver el cálculo.</div>
          )}
          {validas.map((l, i) => (
            <Row
              key={i}
              k={`${l.cantidad}× ${l.concepto}`}
              v={
                l.tipo === "Mensual"
                  ? `${fmt(sub(l))}/mes`
                  : l.tipo === "Anual"
                    ? `${fmt(sub(l))}/año`
                    : fmt(sub(l))
              }
            />
          ))}
        </div>

        {validas.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              {puntual > 0 && <Row k="Alta inicial (pago único)" v={fmt(puntual)} />}
              {mensual > 0 && <Row k="Cuota mensual" v={`${fmt(mensual)}/mes`} />}
              {anual > 0 && <Row k="Anual" v={`${fmt(anual)}/año`} />}
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                Proyección a {m} {m === 1 ? "mes" : "meses"}
              </span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#187bef" }}>{fmt(proyeccion)}</span>
            </div>
            {m > 0 && (mensual > 0 || anual > 0) && (
              <div style={{ marginTop: 4, textAlign: "right", fontSize: 12, color: "#94a3b8" }}>
                ≈ {fmt(media)}/mes de media
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

const inputSm: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  padding: "7px 9px",
  fontSize: 13,
  color: "#0f172a",
  outline: "none",
};

function linkBtn(color: string): React.CSSProperties {
  return { background: "transparent", border: "none", color, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 };
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
      <span style={{ color: "#0f172a", textAlign: "right", flexShrink: 0 }}>{v}</span>
    </div>
  );
}
