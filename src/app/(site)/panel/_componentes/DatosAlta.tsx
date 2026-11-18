import type { AltaCliente } from "@/lib/altas/db";
import { SECCIONES_ALTA, valorLegible } from "@/lib/altas/preguntas";
import { tarjeta, titulo } from "./estilos";

function tamanoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Solo se enlaza lo que es http(s): lo demás (datos viejos, a mano) va como texto. */
const ES_HTTP = /^https?:\/\//i;

const vacio = <span style={{ color: "#94a3b8" }}>—</span>;

/**
 * Lo que rellenó el cliente en su alta, sección a sección, con sus archivos
 * para descargar. Lo usan la página del alta y la ficha del cliente.
 * `descargas`: enlaces firmados por ruta (`firmarDescargas`, caducan en 1 h).
 */
export function DatosAlta({ alta, descargas }: { alta: AltaCliente; descargas: Map<string, string> }) {
  return (
    <>
      {SECCIONES_ALTA.map((seccion, i) => (
        <section key={seccion.id} style={tarjeta}>
          <h2 style={titulo}>
            {i + 1}. {seccion.titulo}
          </h2>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(160px, 280px) minmax(0, 1fr)", gap: "10px 18px" }}>
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
                  <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{texto}</span>
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
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Los enlaces de descarga caducan en 1 hora. Recarga la página para tener otros.</p>
    </>
  );
}
