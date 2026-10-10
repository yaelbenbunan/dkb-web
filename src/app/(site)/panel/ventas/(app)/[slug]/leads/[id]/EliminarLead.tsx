"use client";

import { useActionState, useState } from "react";
import { eliminarLeadAction } from "../../../../acciones-leads";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonSecundario, campo, etiqueta, tarjeta } from "../../../../_componentes/estilos";

export function EliminarLead({ slug, leadId, negocio }: { slug: string; leadId: string; negocio: string }) {
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState("");
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(eliminarLeadAction.bind(null, slug, leadId), null);
  const coincide = escrito.trim().toLowerCase() === negocio.trim().toLowerCase();

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} style={{ ...botonSecundario, color: "#b91c1c", borderColor: "#fecaca", alignSelf: "flex-start" }}>
        Eliminar lead
      </button>
    );
  }
  return (
    <form action={accion} style={{ ...tarjeta, borderColor: "#fecaca", display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#7f1d1d" }}>
        Se borra el lead con todo su historial, sus conversaciones de WhatsApp y las tareas ligadas a él. No se puede deshacer y deja de contar en el resumen y el embudo.
      </p>
      <label style={etiqueta}>
        Escribe «{negocio}» para confirmar
        <input name="confirmacion" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" style={campo} />
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={!coincide || pendiente} style={{ ...botonSecundario, background: coincide ? "#b91c1c" : "#fecaca", color: "#fff", borderColor: "transparent" }}>
          Eliminar definitivamente
        </button>
        <button type="button" onClick={() => setAbierto(false)} style={botonSecundario}>Cancelar</button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}
