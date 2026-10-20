"use client";

import { useState, useTransition } from "react";
import { cambiarRolAction } from "../../acciones-usuarias";
import { ROLES, ROL_LABELS, type Rol } from "@/lib/ventas/dominio";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { rolConMarca } from "@/lib/ventas/rutas";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonSecundario, campo } from "../../_componentes/estilos";
import { AVISO_ROL } from "./avisos-rol";

const pequeno = { ...campo, padding: "5px 8px", fontSize: 13 };

export function RolUsuaria({
  id,
  rol: rolActual,
  marcaId: marcaActual,
  marcas,
  esYo,
}: {
  id: string;
  rol: Rol;
  marcaId: string | null;
  marcas: { id: string; nombre: string }[];
  /** La propia admin: su rol no se toca desde aquí. */
  esYo: boolean;
}) {
  const [rol, setRol] = useState<Rol>(rolActual);
  const [marcaId, setMarcaId] = useState(marcaActual ?? "");
  const [pendiente, empezar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const conMarca = rolConMarca(rol);
  const cambiado = rol !== rolActual || (conMarca && marcaId !== (marcaActual ?? ""));

  if (esYo) return <span>{ROL_LABELS[rolActual]}</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <select aria-label="Rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)} style={pequeno}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROL_LABELS[r]}</option>
          ))}
        </select>
        {conMarca && (
          <select aria-label="Marca" value={marcaId} onChange={(e) => setMarcaId(e.target.value)} style={pequeno}>
            <option value="" disabled>Elige la marca…</option>
            {marcas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        )}
        {cambiado && (
          <button
            type="button"
            disabled={pendiente || (conMarca && !marcaId)}
            onClick={() => empezar(async () => setResultado(await cambiarRolAction(id, { rol, marca_id: conMarca ? marcaId : null })))}
            style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13 }}
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>
      {cambiado && conMarca && <span style={{ fontSize: 12, color: "#64748b" }}>{AVISO_ROL[rol]}</span>}
      <Mensaje resultado={resultado} />
    </div>
  );
}
