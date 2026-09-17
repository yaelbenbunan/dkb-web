import { ETAPAS_EMBUDO, pctPaso, type Embudo } from "@/lib/ventas/metricas";

const TEXTO: Record<(typeof ETAPAS_EMBUDO)[number], string> = {
  contactado: "Contactados",
  interesado: "Interesados",
  muestras: "Con muestras",
  cliente: "Clientes",
};

export function EmbudoVista({ embudo }: { embudo: Embudo }) {
  const pasos = [{ clave: "total", texto: "Leads", valor: embudo.total }, ...ETAPAS_EMBUDO.map((e) => ({ clave: e, texto: TEXTO[e], valor: embudo.alcanzaron[e] }))];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {pasos.map((p, i) => {
        const anterior = i === 0 ? null : pasos[i - 1].valor;
        const ancho = embudo.total > 0 ? Math.max(4, (p.valor / embudo.total) * 100) : 4;
        const paso = anterior === null ? null : pctPaso(p.valor, anterior);
        return (
          <div key={p.clave} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px", gap: 8, alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "#475569" }}>{p.texto}</span>
            <div style={{ background: "#f1f5f9", borderRadius: 4, height: 18 }}>
              <div style={{ width: `${ancho}%`, height: "100%", background: "#187bef", borderRadius: 4 }} />
            </div>
            <span style={{ textAlign: "right" }}>
              <strong>{p.valor}</strong>
              {paso !== null && <span style={{ color: "#64748b" }}> · {paso} %</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
