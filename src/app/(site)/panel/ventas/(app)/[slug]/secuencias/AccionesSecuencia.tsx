"use client";

import { useActionState, useState, useTransition } from "react";
import { activarSecuenciaAction, archivarSecuenciaAction, duplicarSecuenciaAction } from "../../../acciones-secuencias";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonSecundario, campo } from "../../../_componentes/estilos";

const boton = { ...botonSecundario, padding: "5px 10px", fontSize: 13 } as const;

/** Acciones de una fila de la lista de secuencias: solo para admin. */
export function AccionesSecuencia({
  slug,
  secuencia,
}: {
  slug: string;
  secuencia: { id: string; estado: "borrador" | "activa" | "archivada" };
}) {
  const [pendiente, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [duplicando, setDuplicando] = useState(false);
  const [rDup, aDup, pDup] = useActionState<ResultadoAccion | null, FormData>(
    duplicarSecuenciaAction.bind(null, slug, secuencia.id),
    null,
  );

  function activar() {
    setResultado(null);
    startTransition(async () => {
      setResultado(await activarSecuenciaAction(slug, secuencia.id));
    });
  }

  function archivar() {
    setResultado(null);
    startTransition(async () => {
      setResultado(await archivarSecuenciaAction(slug, secuencia.id));
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {secuencia.estado !== "activa" && (
          <button type="button" onClick={activar} disabled={pendiente} style={boton}>Activar</button>
        )}
        {secuencia.estado !== "archivada" && (
          <button type="button" onClick={archivar} disabled={pendiente} style={boton}>Archivar</button>
        )}
        <button type="button" onClick={() => setDuplicando((v) => !v)} style={boton}>Duplicar…</button>
      </div>
      <Mensaje resultado={resultado} />

      {duplicando && (
        <form action={aDup} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input name="nombre" required placeholder="Nombre de la copia" style={{ ...campo, padding: "5px 8px", fontSize: 13 }} />
          <button type="submit" disabled={pDup} style={boton}>Duplicar</button>
          <Mensaje resultado={rDup} />
        </form>
      )}
    </div>
  );
}
