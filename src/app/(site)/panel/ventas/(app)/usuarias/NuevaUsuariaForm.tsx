"use client";

import { useActionState } from "react";
import { crearUsuariaAction } from "../../acciones-usuarias";
import { ROLES, ROL_LABELS } from "@/lib/ventas/dominio";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export function NuevaUsuariaForm() {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearUsuariaAction, null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <h2 style={{ ...titulo, flexBasis: "100%", margin: 0 }}>Nueva usuaria</h2>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Nombre
        <input name="nombre" required style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 200px" }}>
        Email
        <input name="email" type="email" required style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Contraseña inicial
        <input name="password" type="text" minLength={10} required autoComplete="off" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 140px" }}>
        Rol
        <select name="rol" defaultValue="comercial" style={campo}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROL_LABELS[r]}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
        {pendiente ? "Creando…" : "Crear cuenta"}
      </button>
      <div style={{ flexBasis: "100%" }}>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
