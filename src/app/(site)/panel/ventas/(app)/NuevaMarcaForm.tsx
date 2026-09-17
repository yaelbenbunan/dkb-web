"use client";

import { useActionState } from "react";
import { crearMarcaAction } from "../acciones-marcas";
import { Mensaje } from "../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta } from "../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export function NuevaMarcaForm() {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearMarcaAction, null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ ...etiqueta, flex: "1 1 200px" }}>
        Nueva marca
        <input name="nombre" placeholder="Hydrup" required style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Identificador en la URL (opcional)
        <input name="slug" placeholder="hydrup" style={campo} />
      </label>
      <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
        Crear marca
      </button>
      <div style={{ flexBasis: "100%" }}>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
