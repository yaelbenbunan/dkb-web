import { requireUsuaria } from "@/lib/ventas/auth";
import { listUsuarias } from "@/lib/ventas/db";
import { ROL_LABELS } from "@/lib/ventas/dominio";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";
import { AccionesUsuaria } from "./AccionesUsuaria";
import { NuevaUsuariaForm } from "./NuevaUsuariaForm";

export default async function UsuariasPage() {
  await requireUsuaria("admin");
  const usuarias = await listUsuarias();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <NuevaUsuariaForm />
      <section style={tarjeta}>
        <h2 style={titulo}>Usuarias ({usuarias.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th>
                <th style={th}>Email</th>
                <th style={th}>Rol</th>
                <th style={th}>Acceso</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarias.map((u) => (
                <tr key={u.id}>
                  <td style={td}>{u.nombre}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>{ROL_LABELS[u.rol]}</td>
                  <td style={{ ...td, color: u.activa ? "#16a34a" : "#b91c1c", fontWeight: 600 }}>{u.activa ? "Activa" : "Desactivada"}</td>
                  <td style={td}>
                    <AccionesUsuaria id={u.id} activa={u.activa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
