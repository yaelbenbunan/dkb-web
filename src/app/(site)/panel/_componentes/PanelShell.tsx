import Link from "next/link";
import { panelLogout } from "../actions";

const PESTANAS = [
  { clave: "leads", texto: "Leads", ruta: "/panel" },
  { clave: "tablero", texto: "Tablero", ruta: "/panel/tablero" },
  { clave: "agenda", texto: "Agenda", ruta: "/panel/agenda" },
  { clave: "campanas", texto: "Campañas", ruta: "/panel/campanas" },
  { clave: "calculadora", texto: "Calculadora", ruta: "/panel/calculadora" },
] as const;

export type PestanaPanel = (typeof PESTANAS)[number]["clave"];

/** Marco común del CRM de leads: overlay a pantalla completa, cabecera oscura
 *  con las pestañas y el botón Salir, al estilo de `VentasShell` (pero sin
 *  importar de `panel/ventas`: son apps distintas dentro del mismo repo). */
export function PanelShell({
  activa,
  agendaCount,
  children,
}: {
  activa: PestanaPanel;
  /** Llamadas vencidas o de hoy, para el aviso rojo de la pestaña Agenda. Solo
   *  lo pasan las páginas que ya leen los leads; el resto lo omite. */
  agendaCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        background: "#f1f5f9",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 22px",
          background: "#0b1220",
          color: "#fff",
        }}
      >
        <nav style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, letterSpacing: 2, color: "#187bef", textTransform: "uppercase", fontSize: 12 }}>dinkbit</span>
          <strong style={{ fontSize: 16 }}>CRM de leads</strong>
          {PESTANAS.map((p) => {
            const activo = p.clave === activa;
            const aviso = p.clave === "agenda" && !!agendaCount && agendaCount > 0;
            return (
              <Link
                key={p.clave}
                href={p.ruta}
                aria-current={activo ? "page" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  fontWeight: activo ? 700 : 400,
                  color: activo ? "#fff" : "#cbd5e1",
                  textDecoration: "none",
                  padding: "2px 0",
                  borderBottom: `2px solid ${activo ? "#187bef" : "transparent"}`,
                }}
              >
                {p.texto}
                {aviso && (
                  <span
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      borderRadius: 999,
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {agendaCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <form action={panelLogout} style={{ margin: 0 }}>
          <button
            type="submit"
            style={{
              border: "1px solid #334155",
              background: "transparent",
              color: "#cbd5e1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </form>
      </header>
      <main style={{ padding: 22 }}>{children}</main>
    </div>
  );
}
