"use client";

import { useState, useTransition } from "react";
import { vincularAltaAction } from "../../../acciones-altas";
import { guardarServiciosAction } from "../../../acciones-marcas";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario } from "../../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

/** Los servicios contratados: de ellos salen las plantillas de la pestaña Tareas. */
export function ServiciosForm({ marcaId, opciones, elegidos }: { marcaId: string; opciones: { clave: string; nombre: string }[]; elegidos: string[] }) {
  const [marcados, setMarcados] = useState(() => new Set(elegidos));
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  const cambiado = marcados.size !== elegidos.length || elegidos.some((c) => !marcados.has(c));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        empezar(async () => setResultado(await guardarServiciosAction(marcaId, [...marcados])));
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <legend style={{ position: "absolute", left: -9999 }}>Servicios contratados</legend>
        {opciones.map((o) => {
          const activo = marcados.has(o.clave);
          return (
            <label
              key={o.clave}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 14,
                cursor: "pointer",
                border: `1px solid ${activo ? "#0f172a" : "#cbd5e1"}`,
                background: activo ? "#0f172a" : "#fff",
                color: activo ? "#fff" : "#0f172a",
              }}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => {
                  const s = new Set(marcados);
                  if (e.target.checked) s.add(o.clave);
                  else s.delete(o.clave);
                  setMarcados(s);
                  setResultado(null);
                }}
                style={{ margin: 0, accentColor: "#187bef" }}
              />
              {o.nombre}
            </label>
          );
        })}
      </fieldset>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={pendiente || !cambiado} style={{ ...botonPrimario, opacity: pendiente || !cambiado ? 0.55 : 1 }}>
          Guardar servicios
        </button>
        <Mensaje resultado={resultado} />
      </div>
    </form>
  );
}

/** Para un cliente que existía antes del alta: unirle un alta ya enviada. */
export function VincularAlta({ marcaId, altas }: { marcaId: string; altas: { id: string; cliente: string }[] }) {
  const [altaId, setAltaId] = useState(altas[0]?.id ?? "");
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        Unir el alta de
        <select value={altaId} onChange={(e) => setAltaId(e.target.value)} style={{ fontSize: 14, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6 }}>
          {altas.map((a) => (
            <option key={a.id} value={a.id}>{a.cliente}</option>
          ))}
        </select>
      </label>
      <button type="button" disabled={pendiente || !altaId} onClick={() => empezar(async () => setResultado(await vincularAltaAction(marcaId, altaId)))} style={botonSecundario}>
        Unir a esta ficha
      </button>
      <Mensaje resultado={resultado} />
    </div>
  );
}
