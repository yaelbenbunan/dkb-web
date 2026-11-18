import { requireUsuaria } from "@/lib/ventas/auth";
import { listMarcas, listUsuarias } from "@/lib/ventas/db";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";
import { AccionesUsuaria } from "./AccionesUsuaria";
import { RolUsuaria } from "./RolUsuaria";
import { NuevaUsuariaForm } from "./NuevaUsuariaForm";

export default async function UsuariasPage() {
  const admin = await requireUsuaria("admin");
  const [usuarias, marcas] = await Promise.all([listUsuarias(), listMarcas()]);
  // Solo id y nombre: la marca completa lleva el secreto del webhook.
  const opcionesMarca = marcas.map(({ id, nombre }) => ({ id, nombre }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <NuevaUsuariaForm marcas={opcionesMarca} />
      <section style={tarjeta}>
        <h2 style={titulo}>Usuarios ({usuarias.length})</h2>
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
                  <td style={td}>
                    {/* key: tras guardar, la fila vuelve a nacer con el rol nuevo como punto de partida. */}
                    <RolUsuaria key={`${u.rol}:${u.marca_id ?? ""}`} id={u.id} rol={u.rol} marcaId={u.marca_id} marcas={opcionesMarca} esYo={u.id === admin.id} />
                  </td>
                  <td style={{ ...td, color: u.activa ? "#16a34a" : "#b91c1c", fontWeight: 600 }}>{u.activa ? "Activo" : "Desactivado"}</td>
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
