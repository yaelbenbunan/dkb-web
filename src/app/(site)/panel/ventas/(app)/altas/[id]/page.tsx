import Link from "next/link";
import { notFound } from "next/navigation";
import { firmarDescargas, getAltaPorId } from "@/lib/altas/db";
import { SECCIONES_ALTA, valorLegible } from "@/lib/altas/preguntas";
import { enlaceAlta } from "@/lib/altas/token";
import { requireUsuaria } from "@/lib/ventas/auth";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { ActivarAlta } from "../ActivarAlta";
import { CopiarEnlace } from "../CopiarEnlace";
import { fechaHora } from "../fechas";

function tamanoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Solo se enlaza lo que es http(s): lo demás (datos viejos, a mano) va como texto. */
const ES_HTTP = /^https?:\/\//i;

const vacio = <span style={{ color: "#94a3b8" }}>—</span>;

export default async function AltaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUsuaria("admin");
  const { id } = await params;
  const alta = await getAltaPorId(id);
  if (!alta) notFound();
  // Se firman al pintar la página: caducan en 1 h; recargar da enlaces nuevos.
  const descargas = await firmarDescargas(alta.archivos);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/panel/ventas/altas" style={{ color: "#187bef", fontSize: 14, textDecoration: "none" }}>
        ← Altas
      </Link>
      <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 style={{ ...titulo, fontSize: 22, margin: 0 }}>{alta.cliente}</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
          Creada el {fechaHora(alta.created_at)} ·{" "}
          {alta.enviada_en ? (
            <span style={{ color: "#16a34a", fontWeight: 600 }}>enviada el {fechaHora(alta.enviada_en)}</span>
          ) : (
            <span style={{ color: "#b45309", fontWeight: 600 }}>pendiente de enviar</span>
          )}
          {!alta.activa && <span style={{ color: "#b91c1c", fontWeight: 600 }}> · enlace desactivado</span>}
        </p>
        {alta.activa && <CopiarEnlace enlace={enlaceAlta(alta.token)} />}
        <ActivarAlta id={alta.id} activa={alta.activa} />
      </section>

      {!alta.enviada_en && (
        <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>El cliente aún no ha enviado el formulario: cuando lo haga, aquí verás sus respuestas y archivos.</p>
      )}

      {alta.enviada_en &&
        SECCIONES_ALTA.map((seccion, i) => (
          <section key={seccion.id} style={tarjeta}>
            <h2 style={titulo}>
              {i + 1}. {seccion.titulo}
            </h2>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(180px, 280px) 1fr", gap: "10px 18px" }}>
              {seccion.campos.map((campo) => {
                let valor: React.ReactNode;
                if (campo.tipo === "archivos") {
                  const archivos = alta.archivos.filter((a) => a.campo === campo.archivo);
                  valor = archivos.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {archivos.map((a) => {
                        const url = descargas.get(a.ruta);
                        return (
                          <li key={a.ruta}>
                            {url ? (
                              <a href={url} style={{ color: "#187bef", fontWeight: 600 }}>
                                {a.nombre}
                              </a>
                            ) : (
                              <span>{a.nombre} (no disponible ahora)</span>
                            )}{" "}
                            <span style={{ color: "#64748b", fontSize: 12 }}>{tamanoLegible(a.tamano)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    vacio
                  );
                } else {
                  const texto = valorLegible(campo, alta.respuestas[campo.id]);
                  valor = !texto ? (
                    vacio
                  ) : campo.tipo === "url" && ES_HTTP.test(texto) ? (
                    <a href={texto} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "#187bef", wordBreak: "break-all" }}>
                      {texto}
                    </a>
                  ) : (
                    <span style={{ whiteSpace: "pre-wrap" }}>{texto}</span>
                  );
                }
                return (
                  <div key={campo.id} style={{ display: "contents" }}>
                    <dt style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{campo.etiqueta}</dt>
                    <dd style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>{valor}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      {alta.enviada_en && <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Los enlaces de descarga caducan en 1 hora. Recarga la página para tener otros.</p>}
    </div>
  );
}
