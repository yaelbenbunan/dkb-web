import Image from "next/image";
import Link from "next/link";
import type { Marca } from "@/lib/ventas/db";
import type { Rol } from "@/lib/ventas/dominio";
import { MODULO_CAMPANAS, tieneModulo } from "@/lib/ventas/campanas";
import { getUsuariaActual } from "@/lib/ventas/auth";
import { cabeceraMarca, esMarcaPropia, rutaSeccion, TEXTO_SECCION, tieneWhatsApp } from "@/lib/ventas/espacios";
import { SERVICIO_WHATSAPP } from "@/lib/ventas/proyectos";
import { rolConMarca, type SeccionMarca } from "@/lib/ventas/rutas";
import { BotonAnclar } from "./BotonAnclar";

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

function Pestana({ href, activa, texto, grande }: { href: string; activa: boolean; texto: string; grande: boolean }) {
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      style={{
        padding: grande ? "9px 14px" : "6px 12px",
        fontSize: grande ? 15 : 13,
        fontWeight: 600,
        textDecoration: "none",
        borderRadius: grande ? 0 : 999,
        color: grande ? (activa ? "#187bef" : "#64748b") : activa ? "#fff" : "#475569",
        background: grande ? "transparent" : activa ? "#0f172a" : "#fff",
        border: grande ? "none" : `1px solid ${activa ? "#0f172a" : "#cbd5e1"}`,
        borderBottom: grande ? `2px solid ${activa ? "#187bef" : "transparent"}` : undefined,
        marginBottom: grande ? -1 : 0,
      }}
    >
      {texto}
    </Link>
  );
}

/**
 * La cabecera de una marca: logo, «Anclar en mi menú» (en los clientes) y las
 * pestañas en dos niveles (lib/ventas/espacios.ts, `cabeceraMarca`).
 */
export async function MarcaCabecera({ marca, activa, rol }: { marca: Marca; activa: Pestana; rol: Rol }) {
  const { grupos, secciones } = cabeceraMarca({
    slug: marca.slug,
    rol,
    activa,
    conCampanas: tieneModulo(marca, MODULO_CAMPANAS),
    conWhatsApp: tieneWhatsApp(marca, SERVICIO_WHATSAPP),
  });
  const esCliente = !rolConMarca(rol) && !esMarcaPropia(marca.slug);
  const usuaria = esCliente ? await getUsuariaActual() : null;
  const anclados = usuaria?.clientes_anclados;
  const logo = LOGOS_MARCA[marca.slug];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {esCliente && (
          <Link href="/panel/clientes" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Clientes</Link>
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
        {/* Sin la migración no viene la lista: el botón no aparece. */}
        {esCliente && Array.isArray(anclados) && (
          <span style={{ marginLeft: "auto" }}>
            <BotonAnclar marcaId={marca.id} anclado={anclados.includes(marca.id)} />
          </span>
        )}
      </div>
      {grupos.length > 0 && (
        <nav aria-label="Secciones" style={{ display: "flex", flexWrap: "wrap", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
          {grupos.map((g) => (
            <Pestana key={g.clave} href={rutaSeccion(marca.slug, g.seccion)} activa={g.activo} texto={g.texto} grande />
          ))}
        </nav>
      )}
      {secciones.length > 0 && (
        <nav aria-label="Vistas" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {secciones.map((clave) => (
            <Pestana key={clave} href={rutaSeccion(marca.slug, clave)} activa={clave === activa} texto={TEXTO_SECCION[clave]} grande={false} />
          ))}
        </nav>
      )}
    </div>
  );
}
