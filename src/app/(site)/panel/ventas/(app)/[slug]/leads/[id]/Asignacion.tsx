"use client";

import { useState, useTransition } from "react";
import { asignarLeadAction } from "../../../../acciones-leads";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { campo, etiqueta } from "../../../../_componentes/estilos";

export function Asignacion({
  slug,
  leadId,
  asignadaA,
  usuarias,
}: {
  slug: string;
  leadId: string;
  asignadaA: string | null;
  usuarias: { id: string; nombre: string }[];
}) {
  const [valor, setValor] = useState(asignadaA ?? "");
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <label style={etiqueta}>
      Asignada a
      <select
        value={valor}
        disabled={pendiente}
        onChange={(e) => {
          const nuevo = e.target.value;
          setValor(nuevo);
          empezar(async () => setResultado(await asignarLeadAction(slug, leadId, nuevo)));
        }}
        style={campo}
      >
        <option value="">Sin asignar</option>
        {usuarias.map((u) => (
          <option key={u.id} value={u.id}>{u.nombre}</option>
        ))}
      </select>
      <Mensaje resultado={resultado} />
    </label>
  );
}
