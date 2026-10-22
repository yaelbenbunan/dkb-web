import Link from "next/link";
import { listAltas } from "@/lib/altas/db";
import { enlaceAlta } from "@/lib/altas/token";
import { requireUsuaria } from "@/lib/ventas/auth";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";
import { AvisoMigracion } from "./AvisoMigracion";
import { CopiarEnlace } from "./CopiarEnlace";
import { NuevaAltaForm } from "./NuevaAltaForm";
import { fechaHora } from "./fechas";

export default async function AltasPage() {
  await requireUsuaria("admin");
  const lista = await listAltas();
  if (lista.estado === "falta_migracion") return <AvisoMigracion />;
  const { altas } = lista;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <NuevaAltaForm />
      <section style={tarjeta}>
        <h2 style={titulo}>Altas de clientes ({altas.length})</h2>
        {altas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>Todavía no hay ninguna. Crea la primera arriba.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>Cliente</th>
                  <th style={th}>Creada</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Enlace</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {altas.map((a) => (
                  <tr key={a.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{a.cliente}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fechaHora(a.created_at)}</td>
                    <td style={td}>
                      {a.enviada_en ? (
                        <span style={{ color: "#16a34a", fontWeight: 600 }}>Enviada el {fechaHora(a.enviada_en)}</span>
                      ) : (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>Pendiente</span>
                      )}
                      {!a.activa && <div style={{ fontSize: 12, color: "#b91c1c" }}>Enlace desactivado</div>}
                    </td>
                    <td style={td}>{a.activa ? <CopiarEnlace enlace={enlaceAlta(a.token)} /> : <span style={{ color: "#64748b" }}>—</span>}</td>
                    <td style={td}>
                      <Link href={`/panel/ventas/altas/${a.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
