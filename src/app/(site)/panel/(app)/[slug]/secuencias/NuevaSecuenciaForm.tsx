"use client";

import { useActionState } from "react";
import { crearSecuenciaAction } from "../../../acciones-secuencias";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";
import { PLANTILLAS } from "@/lib/ventas/secuencias-plantilla";

/** Crea la secuencia y abre el editor. Se puede arrancar de una plantilla de
 *  sector —ya escrita y validada— o en blanco. */
export function NuevaSecuenciaForm({ slug }: { slug: string }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearSecuenciaAction.bind(null, slug), null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Nueva secuencia</h2>
      <label style={etiqueta}>
        Nombre
        <input name="nombre" required placeholder="Captación octubre" style={campo} />
      </label>
      <label style={etiqueta}>
        Empezar desde
        <select name="plantilla" defaultValue="" style={campo}>
          <option value="">En blanco</option>
          {PLANTILLAS.map((p) => (
            <option key={p.clave} value={p.clave}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>Crear y editar</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
