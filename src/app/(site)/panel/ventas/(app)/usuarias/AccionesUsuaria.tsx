"use client";

import { useState, useTransition } from "react";
import { cambiarPasswordAction, setUsuariaActivaAction } from "../../acciones-usuarias";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../_componentes/Mensaje";
import { botonSecundario, campo } from "../../_componentes/estilos";

export function AccionesUsuaria({ id, activa }: { id: string; activa: boolean }) {
  const [pendiente, empezar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [password, setPassword] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => empezar(async () => setResultado(await setUsuariaActivaAction(id, !activa)))}
          style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13 }}
        >
          {activa ? "Desactivar" : "Reactivar"}
        </button>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          autoComplete="off"
          style={{ ...campo, padding: "5px 8px", fontSize: 13, width: 160 }}
        />
        <button
          type="button"
          disabled={pendiente || password.length === 0}
          onClick={() =>
            empezar(async () => {
              const r = await cambiarPasswordAction(id, password);
              setResultado(r);
              if (r.ok) setPassword("");
            })
          }
          style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13 }}
        >
          Cambiar
        </button>
      </div>
      <Mensaje resultado={resultado} />
    </div>
  );
}
