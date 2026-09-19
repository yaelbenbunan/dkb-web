"use client";

import { useActionState } from "react";
import { crearSecuenciaAction } from "../../../acciones-secuencias";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

/** Crea una secuencia vacía (un primer paso de plantilla) y abre el editor. */
export function NuevaSecuenciaForm({ slug }: { slug: string }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearSecuenciaAction.bind(null, slug), null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Nueva secuencia</h2>
      <label style={etiqueta}>
        Nombre
        <input name="nombre" required placeholder="Captación gimnasios" style={campo} />
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>Crear y editar</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
