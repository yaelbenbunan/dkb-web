"use client";

import { useState, useTransition } from "react";
import { crearTareasPlantillaAction } from "../../../acciones-tareas";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario } from "../../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export interface PlantillaPendiente {
  clave: string;
  nombre: string;
  fases: { nombre: string; tareas: { clave: string; titulo: string }[] }[];
}

/**
 * «Añadir tareas de un servicio»: se elige el servicio (de los contratados en
 * la ficha), salen sus tareas de plantilla que aún no tiene, todas marcadas, y
 * se desmarca lo que no aplique.
 */
export function AnadirPlantilla({ slug, plantillas }: { slug: string; plantillas: PlantillaPendiente[] }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  const actual = plantillas.find((p) => p.clave === abierta) ?? null;

  const abrir = (p: PlantillaPendiente) => {
    setAbierta(p.clave);
    setMarcadas(new Set(p.fases.flatMap((f) => f.tareas.map((t) => t.clave))));
    setResultado(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "#475569" }}>Añadir las tareas de:</span>
        {plantillas.map((p) => {
          const n = p.fases.reduce((acc, f) => acc + f.tareas.length, 0);
          return (
            <button
              key={p.clave}
              type="button"
              aria-pressed={abierta === p.clave}
              onClick={() => (abierta === p.clave ? setAbierta(null) : abrir(p))}
              style={{ ...botonSecundario, ...(abierta === p.clave ? { background: "#0f172a", color: "#fff", borderColor: "#0f172a" } : {}) }}
            >
              {p.nombre} ({n})
            </button>
          );
        })}
      </div>

      {actual && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            empezar(async () => {
              const r = await crearTareasPlantillaAction(slug, actual.clave, [...marcadas]);
              setResultado(r);
              if (r.ok) setAbierta(null);
            });
          }}
          style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <strong style={{ fontSize: 15 }}>{actual.nombre}: desmarca lo que no aplique a este cliente</strong>
          {actual.fases.map((f) => (
            <fieldset key={f.nombre} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <legend style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#475569", marginBottom: 4 }}>{f.nombre}</legend>
              {f.tareas.map((t) => (
                <label key={t.clave} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "4px 0" }}>
                  <input
                    type="checkbox"
                    checked={marcadas.has(t.clave)}
                    onChange={(e) => {
                      const s = new Set(marcadas);
                      if (e.target.checked) s.add(t.clave);
                      else s.delete(t.clave);
                      setMarcadas(s);
                    }}
                  />
                  {t.titulo}
                </label>
              ))}
            </fieldset>
          ))}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" disabled={pendiente || marcadas.size === 0} style={{ ...botonPrimario, opacity: pendiente || marcadas.size === 0 ? 0.55 : 1 }}>
              Añadir {marcadas.size} {marcadas.size === 1 ? "tarea" : "tareas"}
            </button>
            <button type="button" onClick={() => setAbierta(null)} style={botonSecundario}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      <Mensaje resultado={resultado} />
    </div>
  );
}
