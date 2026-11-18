"use client";

import { useState, useTransition } from "react";
import { crearFichaDesdeAltaAction } from "../../acciones-altas";
import { botonPrimario } from "../../_componentes/estilos";

/** «Crear ficha de cliente»: crea el cliente desde el alta y abre su ficha. */
export function CrearFicha({ altaId }: { altaId: string }) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          empezar(async () => {
            // Si va bien, la acción redirige a la ficha y esto no vuelve.
            const r = await crearFichaDesdeAltaAction(altaId);
            if (!r.ok) setError(r.error ?? "No se pudo crear la ficha.");
          })
        }
        style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}
      >
        {pendiente ? "Creando…" : "Crear ficha de cliente"}
      </button>
      {error && <span role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>{error}</span>}
    </span>
  );
}
