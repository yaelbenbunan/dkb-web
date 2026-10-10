"use client";

import { useActionState } from "react";
import { crearLeadManualAction } from "../../../acciones-leads";
import { TIPO_NEGOCIO_LABELS, tiposNegocioDeMarca } from "@/lib/ventas/dominio";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

// `enDialogo`: el diálogo ya pone la tarjeta y el título, aquí sobran.
export function NuevoLeadForm({ slug, enDialogo = false }: { slug: string; enDialogo?: boolean }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearLeadManualAction.bind(null, slug), null);
  return (
    <form action={accion} style={{ ...(enDialogo ? {} : tarjeta), display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {!enDialogo && <h2 style={{ ...titulo, gridColumn: "1 / -1", margin: 0 }}>Añadir lead a mano</h2>}
      <label style={etiqueta}>Negocio<input name="negocio" required style={campo} /></label>
      <label style={etiqueta}>
        Tipo
        <select name="tipo_negocio" defaultValue="" style={campo}>
          <option value="">—</option>
          {tiposNegocioDeMarca(slug).map((t) => (
            <option key={t} value={t}>{TIPO_NEGOCIO_LABELS[t]}</option>
          ))}
        </select>
      </label>
      <label style={etiqueta}>Contacto<input name="contacto" style={campo} /></label>
      <label style={etiqueta}>Teléfono<input name="telefono" style={campo} /></label>
      <label style={etiqueta}>Email<input name="email" type="email" style={campo} /></label>
      <label style={etiqueta}>Ciudad<input name="ciudad" style={campo} /></label>
      <label style={etiqueta}>CIF<input name="cif" style={campo} /></label>
      <label style={etiqueta}>Web<input name="web" style={campo} /></label>
      <label style={{ ...etiqueta, gridColumn: "1 / -1" }}>
        Notas
        <textarea name="nota" rows={2} maxLength={2000} style={{ ...campo, resize: "vertical" }} />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>Crear lead</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
