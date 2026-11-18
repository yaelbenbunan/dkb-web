"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLOR_DINKBIT, colorDeCliente, ubicacion, type Espacio } from "@/lib/ventas/espacios";

export interface ClienteMenu {
  slug: string;
  nombre: string;
  pausada: boolean;
}

const COLOR_BARRA: Record<Espacio, string> = {
  personal: "#0f172a",
  dinkbit: COLOR_DINKBIT,
  clientes: "#334155",
  ajustes: "#0f172a",
};

const ETIQUETA_BARRA: Record<Espacio, string> = {
  personal: "PERSONAL",
  dinkbit: "DINKBIT",
  clientes: "CLIENTES",
  ajustes: "AJUSTES",
};

function Entrada({ href, activa, children }: { href: string; activa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 14,
        textDecoration: "none",
        minHeight: 22,
        background: activa ? "#1f2b45" : "transparent",
        color: activa ? "#fff" : "#cbd5e1",
        fontWeight: activa ? 600 : 400,
      }}
    >
      {children}
    </Link>
  );
}

function Titulo({ color, texto }: { color: string; texto: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 4px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#cbd5e1" }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {texto}
    </div>
  );
}

/** El menú lateral de admin y comercial: lo personal, Dinkbit, Clientes y Ajustes. */
export function MenuEspacios({ clientes, esAdmin }: { clientes: ClienteMenu[]; esAdmin: boolean }) {
  const pathname = usePathname() ?? "";
  const { menu } = ubicacion(pathname, [{ slug: "dinkbit", nombre: "dinkbit" }, ...clientes]);
  const grupo = { display: "flex", flexDirection: "column", gap: 2 } as const;

  return (
    <nav aria-label="Menú del panel" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={grupo}>
        <Entrada href="/panel/hoy" activa={menu === "hoy"}>Mi día</Entrada>
        <Entrada href="/panel/tareas" activa={menu === "tareas"}>Tareas</Entrada>
      </div>

      <div style={grupo}>
        <Titulo color="#3b82f6" texto="DINKBIT · LO NUESTRO" />
        <Entrada href="/panel/dinkbit/tablero" activa={menu === "dinkbit:leads"}>Leads</Entrada>
        <Entrada href="/panel/dinkbit/conversaciones" activa={menu === "dinkbit:conversaciones"}>Conversaciones</Entrada>
        <Entrada href="/panel/dinkbit/secuencias" activa={menu === "dinkbit:captacion"}>Captación</Entrada>
        {esAdmin && <Entrada href="/panel/altas" activa={menu === "altas"}>Altas</Entrada>}
      </div>

      <div style={grupo}>
        <Titulo color="#94a3b8" texto="CLIENTES" />
        {clientes.map((c) => (
          <Entrada key={c.slug} href={`/panel/${c.slug}`} activa={menu === `cliente:${c.slug}`}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: colorDeCliente(c.slug), flex: "none" }} />
            <span style={{ flex: 1 }}>{c.nombre}</span>
            {c.pausada && <span style={{ fontSize: 11, color: "#fcd34d" }}>pausada</span>}
          </Entrada>
        ))}
        <Entrada href="/panel/clientes" activa={menu === "clientes"}>Todos los clientes</Entrada>
      </div>

      {esAdmin && (
        <div style={grupo}>
          <Titulo color="#475569" texto="AJUSTES" />
          <Entrada href="/panel/usuarias" activa={menu === "usuarias"}>Usuarios</Entrada>
          <Entrada href="/panel/dinkbit/condiciones" activa={menu === "dinkbit:ajustes"}>Ajustes de dinkbit</Entrada>
        </div>
      )}
    </nav>
  );
}

/** La barra de encima del contenido: en qué espacio estás y la ruta, con su color. */
export function BarraUbicacion({ clientes }: { clientes: ClienteMenu[] }) {
  const pathname = usePathname() ?? "";
  const { espacio, migas, menu } = ubicacion(pathname, [{ slug: "dinkbit", nombre: "dinkbit" }, ...clientes]);
  const slugCliente = menu.startsWith("cliente:") ? menu.slice("cliente:".length) : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        padding: "9px 22px",
        background: COLOR_BARRA[espacio],
        borderLeft: slugCliente ? `6px solid ${colorDeCliente(slugCliente)}` : undefined,
        color: "#fff",
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 1.2, fontSize: 11 }}>{ETIQUETA_BARRA[espacio]}</span>
      <span>{migas.join(" › ")}</span>
    </div>
  );
}
