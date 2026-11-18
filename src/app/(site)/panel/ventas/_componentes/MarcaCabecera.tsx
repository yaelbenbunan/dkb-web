import Image from "next/image";
import Link from "next/link";
import type { Marca } from "@/lib/ventas/db";
import type { Rol } from "@/lib/ventas/dominio";
import { MODULO_CAMPANAS, tieneModulo } from "@/lib/ventas/campanas";
import { esMarcaPropia, pestanasVisibles, TEXTO_SECCION } from "@/lib/ventas/espacios";
import { rolConMarca, type SeccionMarca } from "@/lib/ventas/rutas";

export type Pestana = SeccionMarca;

/**
 * Logo de cada marca, por slug, para fondo claro y sin margen alrededor. Con
 * logo, el título de la página ES el logo (el nombre va en su `alt`): no se
 * repite al lado. Una marca sin logo enseña su nombre en texto.
 */
const LOGOS_MARCA: Record<string, { src: string; ancho: number; alto: number }> = {
  hydrup: { src: "/img/casos/hydrup/logo/positivo-recortado.png", ancho: 314, alto: 82 },
  dinkbit: { src: "/img/logo/dinkbit.svg", ancho: 1914, alto: 576 },
};
// 30 px de alto: el PNG de Hydrup mide 82, así que en pantallas de doble
// densidad sigue reduciéndose (nunca se estira, que es lo que lo pixelaba).
const ALTO_LOGO = 30;

export function MarcaCabecera({ marca, activa, rol }: { marca: Marca; activa: Pestana; rol: Rol }) {
  // Dinkbit: solo las pestañas del grupo del menú lateral en el que estás.
  // Un cliente: todas en una fila. La clienta y la agente: las suyas.
  // Mailing solo con el módulo de campañas; Prospección solo donde la hay.
  const visibles = pestanasVisibles({ slug: marca.slug, rol, activa, conCampanas: tieneModulo(marca, MODULO_CAMPANAS) });
  const logo = LOGOS_MARCA[marca.slug];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {!rolConMarca(rol) && !esMarcaPropia(marca.slug) && (
          <Link href="/panel/ventas/clientes" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Clientes</Link>
        )}
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1, display: "flex" }}>
          {logo ? (
            <Image
              src={logo.src}
              alt={marca.nombre}
              width={Math.round((ALTO_LOGO * logo.ancho) / logo.alto)}
              height={ALTO_LOGO}
              priority
              // Sin recomprimir: el optimizador de imágenes emborrona un logo de trazo fino.
              unoptimized
              style={{
                height: ALTO_LOGO,
                width: "auto",
                boxSizing: "content-box",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "9px 14px",
              }}
            />
          ) : (
            marca.nombre
          )}
        </h1>
        {marca.estado !== "activa" && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "2px 8px" }}>
            {marca.estado === "pausada" ? "Pausada" : "Finalizada"}
          </span>
        )}
      </div>
      <nav aria-label="Secciones" style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {visibles.map((clave) => (
          <Link
            key={clave}
            href={`/panel/ventas/${marca.slug}${clave === "resumen" ? "" : `/${clave}`}`}
            aria-current={clave === activa ? "page" : undefined}
            style={{
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              color: clave === activa ? "#187bef" : "#64748b",
              borderBottom: `2px solid ${clave === activa ? "#187bef" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {TEXTO_SECCION[clave]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
