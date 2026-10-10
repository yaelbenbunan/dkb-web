"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearTareaAction } from "../../../acciones-tareas";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta } from "../../../_componentes/estilos";

export function NuevaTareaForm({
  slug,
  usuarias,
  leads,
  yo,
}: {
  slug: string;
  usuarias: { id: string; nombre: string }[];
  leads: { id: string; negocio: string }[];
  yo: string;
}) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(crearTareaAction.bind(null, slug), null);
  const formulario = useRef<HTMLFormElement>(null);
  // Tras crear una tarea se vacía el formulario; reset() devuelve los select a su defaultValue (yo como responsable).
  const creada = resultado?.ok === true;
  useEffect(() => {
    if (creada) formulario.current?.reset();
  }, [creada, resultado]);
  return (
    <form ref={formulario} action={accion} style={{ ...tarjeta, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label style={{ ...etiqueta, flex: "2 1 240px" }}>
        Nueva tarea
        <input name="titulo" required maxLength={200} placeholder="Qué hay que hacer" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 150px" }}>
        Fecha
        <input name="vence" type="date" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "0 1 110px" }}>
        Hora
        <input name="vence_hora" type="time" style={campo} />
      </label>
      <label style={{ ...etiqueta, flex: "1 1 160px" }}>
        Responsable
        <select name="asignada_a" defaultValue={usuarias.some((u) => u.id === yo) ? yo : ""} style={campo}>
          <option value="">Sin asignar</option>
          {usuarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </label>
      <label style={{ ...etiqueta, flex: "1 1 180px" }}>
        Lead (opcional)
        <select name="lead_id" defaultValue="" style={campo}>
          <option value="">—</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>{l.negocio}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pendiente} style={botonPrimario}>Añadir</button>
      <Mensaje resultado={resultado} />
    </form>
  );
}
