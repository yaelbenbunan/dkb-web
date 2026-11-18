"use client";

import { useActionState } from "react";
import { crearAltaAction } from "../../acciones-altas";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export function NuevaAltaForm() {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearAltaAction, null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <h2 style={{ ...titulo, flexBasis: "100%", margin: 0 }}>Nueva alta</h2>
      <p style={{ flexBasis: "100%", margin: 0, fontSize: 13, color: "#475569" }}>
        Genera un enlace propio para que el cliente rellene su alta y suba logo, manual y fotos. No necesita cuenta.
      </p>
      <label style={{ ...etiqueta, flex: "1 1 260px" }}>
        Nombre del cliente
        <input name="cliente" required maxLength={120} placeholder="Por ejemplo: Nubosoft" style={campo} />
      </label>
      <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
        {pendiente ? "Creando…" : "Crear enlace"}
      </button>
      <div style={{ flexBasis: "100%" }}>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
