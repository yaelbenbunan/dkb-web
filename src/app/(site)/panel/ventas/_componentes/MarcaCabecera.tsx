import Image from "next/image";
import Link from "next/link";
import type { Marca } from "@/lib/ventas/db";
import type { Rol } from "@/lib/ventas/dominio";
import { SECCIONES_CLIENTE } from "@/lib/ventas/rutas";

const PESTANAS = [
  { clave: "resumen", texto: "Resumen", ruta: "" },
  { clave: "tablero", texto: "Tablero", ruta: "/tablero" },
  { clave: "leads", texto: "Leads", ruta: "/leads" },
  { clave: "tareas", texto: "Tareas", ruta: "/tareas" },
  { clave: "secuencias", texto: "Secuencias", ruta: "/secuencias" },
  { clave: "conversaciones", texto: "Conversaciones", ruta: "/conversaciones" },
  { clave: "condiciones", texto: "Condiciones", ruta: "/condiciones" },
] as const;

export type Pestana = (typeof PESTANAS)[number]["clave"];

/** Logo de cada marca, por slug, para fondo claro. Una marca sin logo enseña solo su nombre. */
const LOGOS_MARCA: Record<string, { src: string; ancho: number; alto: number }> = {
  hydrup: { src: "/img/casos/hydrup/logo/positivo.png", ancho: 358, alto: 287 },
  dinkbit: { src: "/img/logo/dinkbit.svg", ancho: 1914, alto: 576 },
};
const ALTO_LOGO = 44;

export function MarcaCabecera({ marca, activa, rol }: { marca: Marca; activa: Pestana; rol: Rol }) {
  // La clienta solo ve las secciones que el servidor le deja abrir.
  const visibles = rol === "cliente" ? PESTANAS.filter((p) => (SECCIONES_CLIENTE as readonly string[]).includes(p.clave)) : PESTANAS;
  const logo = LOGOS_MARCA[marca.slug];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {rol !== "cliente" && <Link href="/panel/ventas" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Panel</Link>}
        {logo && (
          <Image
            src={logo.src}
            alt=""
            width={Math.round((ALTO_LOGO * logo.ancho) / logo.alto)}
            height={ALTO_LOGO}
            style={{ height: ALTO_LOGO, width: "auto", background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: logo.src.endsWith(".svg") ? "8px 10px" : 0 }}
          />
        )}
        <h1 style={{ margin: 0, fontSize: 24 }}>{marca.nombre}</h1>
        {marca.estado !== "activa" && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "2px 8px" }}>
            {marca.estado === "pausada" ? "Pausada" : "Finalizada"}
          </span>
        )}
      </div>
      <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {visibles.map((p) => (
          <Link
            key={p.clave}
            href={`/panel/ventas/${marca.slug}${p.ruta}`}
            style={{
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              color: p.clave === activa ? "#187bef" : "#64748b",
              borderBottom: `2px solid ${p.clave === activa ? "#187bef" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {p.texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
