import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getSecuencia } from "@/lib/ventas/db";
import { parsearSecuencia } from "@/lib/ventas/secuencias";
import { cargarMarca } from "../../../../_componentes/cargarMarca";
import { MarcaCabecera } from "../../../../_componentes/MarcaCabecera";
import { tarjeta } from "../../../../_componentes/estilos";
import { EditorSecuencia } from "./EditorSecuencia";

export default async function EditorSecuenciaPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const usuaria = await requireUsuaria();
  const { slug, id } = await params;
  const marca = await cargarMarca(slug);
  const fila = await getSecuencia(id);
  if (!fila || fila.marca_id !== marca.id) notFound();

  const parseado = parsearSecuencia(fila.pasos);

  return (
    <div>
      <MarcaCabecera marca={marca} activa="secuencias" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href={`/panel/ventas/${slug}/secuencias`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Secuencias</Link>

        {!parseado.ok ? (
          <section style={tarjeta}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16, color: "#b91c1c" }}>Esta secuencia no se puede editar</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>
              Los datos guardados no tienen una forma válida: {parseado.error}. Prueba a duplicar otra secuencia como punto de partida.
            </p>
          </section>
        ) : (
          <EditorSecuencia
            slug={slug}
            secuenciaId={fila.id}
            nombreInicial={fila.nombre}
            estadoInicial={fila.estado}
            secuenciaInicial={parseado.secuencia}
            editable={usuaria.rol === "admin"}
          />
        )}
      </div>
    </div>
  );
}
