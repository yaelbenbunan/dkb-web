import Image from "next/image";
import { listMarcas, type Usuaria } from "@/lib/ventas/db";
import { ROL_LABELS } from "@/lib/ventas/dominio";
import { clientesDelMenu, esMarcaPropia } from "@/lib/ventas/espacios";
import { rolConMarca } from "@/lib/ventas/rutas";
import { ventasLogout } from "../login/actions";
import { BarraUbicacion, MenuEspacios, type ClienteMenu } from "./EspaciosNav";

const fondo = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  overflow: "auto",
  background: "#f1f5f9",
  color: "#0f172a",
  fontFamily: "system-ui, sans-serif",
} as const;

function Salir({ usuaria }: { usuaria: Usuaria }) {
  return (
    <form action={ventasLogout} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "#cbd5e1" }}>
        {usuaria.nombre} · {ROL_LABELS[usuaria.rol]}
      </span>
      <button type="submit" style={{ background: "none", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 6, padding: "5px 10px", fontSize: 13, cursor: "pointer" }}>
        Salir
      </button>
    </form>
  );
}

/**
 * El marco de /panel. Admin y comercial: menú lateral con lo personal,
 * Dinkbit, Clientes y Ajustes (docs/superpowers/specs/2026-11-18-panel-espacios-design.md).
 * La clienta y la agente, ligadas a una marca: la barra de siempre, sin espacios.
 */
export async function VentasShell({ usuaria, children }: { usuaria: Usuaria; children: React.ReactNode }) {
  if (rolConMarca(usuaria.rol)) {
    return (
      <div style={fondo}>
        <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "12px 22px", background: "#0b1220", color: "#fff" }}>
          <Image src="/img/logo/dinkbit.svg" alt="dinkbit" width={80} height={24} priority style={{ height: 24, width: 80 }} />
          <Salir usuaria={usuaria} />
        </header>
        <main style={{ padding: 22, maxWidth: 1240, margin: "0 auto" }}>{children}</main>
      </div>
    );
  }

  const clientes: ClienteMenu[] = (await listMarcas())
    .filter((m) => m.estado !== "finalizada" && !esMarcaPropia(m.slug))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((m) => ({ id: m.id, slug: m.slug, nombre: m.nombre, pausada: m.estado === "pausada" }));
  // Cada persona ve en el menú los clientes que ha anclado; sin la migración, todos.
  const menu = clientesDelMenu(clientes, usuaria.clientes_anclados);

  return (
    <div style={fondo}>
      {/* En pantalla ancha el menú se queda fijo al hacer scroll (con su propio
          scroll si no cabe). En el móvil va encima del contenido y se desplaza con él. */}
      <style>{`@media (min-width: 800px) { .panel-menu { position: sticky; top: 0; height: 100vh; overflow-y: auto; align-self: flex-start; } }`}</style>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", minHeight: "100%" }}>
        <aside className="panel-menu" style={{ flex: "1 1 220px", maxWidth: "100%", boxSizing: "border-box", background: "#0b1220", color: "#e2e8f0", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ padding: "0 10px" }}>
            <Image src="/img/logo/dinkbit.svg" alt="dinkbit" width={80} height={24} priority style={{ height: 24, width: 80 }} />
          </div>
          <MenuEspacios clientes={menu.lista} conAnclaje={menu.conAnclaje} esAdmin={usuaria.rol === "admin"} />
          <div style={{ marginTop: "auto", padding: "12px 10px 0", borderTop: "1px solid #1e293b" }}>
            <Salir usuaria={usuaria} />
          </div>
        </aside>
        <div style={{ flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <BarraUbicacion clientes={clientes} />
          <main style={{ padding: 22, maxWidth: 1240, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
