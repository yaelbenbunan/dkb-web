"use client";

import { useState, useTransition } from "react";
import { setAltaActivaAction } from "../../acciones-altas";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonSecundario } from "../../_componentes/estilos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

export function ActivarAlta({ id, activa }: { id: string; activa: boolean }) {
  const [pendiente, empezar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (activa && !window.confirm("¿Desactivar el enlace? El cliente ya no podrá abrir el formulario.")) return;
          empezar(async () => setResultado(await setAltaActivaAction(id, !activa)));
        }}
        style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13, opacity: pendiente ? 0.6 : 1 }}
      >
        {activa ? "Desactivar enlace" : "Reactivar enlace"}
      </button>
      <Mensaje resultado={resultado} />
    </div>
  );
}
