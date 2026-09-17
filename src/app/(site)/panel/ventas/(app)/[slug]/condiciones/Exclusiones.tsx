"use client";

import { useActionState, useTransition } from "react";
import { borrarExclusionAction, crearExclusionAction } from "../../../acciones-marcas";
import type { Exclusion } from "@/lib/ventas/db";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, td, th, titulo } from "../../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export function Exclusiones({ marcaId, exclusiones, editable }: { marcaId: string; exclusiones: Exclusion[]; editable: boolean }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearExclusionAction.bind(null, marcaId), null);
  const [borrando, empezar] = useTransition();

  return (
    <section style={tarjeta}>
      <h2 style={titulo}>Lista de exclusión ({exclusiones.length})</h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
        Clientes B2B que la marca ya tenía antes de empezar. No se importan como leads y nunca cuentan para la comisión.
      </p>
      {editable && (
        <form action={accion} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <label style={{ ...etiqueta, flex: "1 1 160px" }}>Nombre<input name="nombre" style={campo} /></label>
          <label style={{ ...etiqueta, flex: "1 1 180px" }}>Email<input name="email" type="email" style={campo} /></label>
          <label style={{ ...etiqueta, flex: "1 1 140px" }}>Teléfono<input name="telefono" style={campo} /></label>
          <label style={{ ...etiqueta, flex: "1 1 120px" }}>CIF<input name="cif" style={campo} /></label>
          <button type="submit" disabled={pendiente} style={botonPrimario}>Añadir</button>
          <div style={{ flexBasis: "100%" }}><Mensaje resultado={resultado} /></div>
        </form>
      )}
      {exclusiones.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th><th style={th}>Email</th><th style={th}>Teléfono</th><th style={th}>CIF</th>
                {editable && <th style={th} />}
              </tr>
            </thead>
            <tbody>
              {exclusiones.map((e) => (
                <tr key={e.id}>
                  <td style={td}>{e.nombre ?? "—"}</td>
                  <td style={td}>{e.email ?? "—"}</td>
                  <td style={td}>{e.telefono ?? "—"}</td>
                  <td style={td}>{e.cif ?? "—"}</td>
                  {editable && (
                    <td style={td}>
                      <button
                        type="button"
                        disabled={borrando}
                        onClick={() => empezar(async () => void (await borrarExclusionAction(marcaId, e.id)))}
                        style={{ ...botonSecundario, padding: "4px 10px", fontSize: 12 }}
                      >
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
