"use client";

import { useState } from "react";
import { botonSecundario, campo } from "../../_componentes/estilos";

/** El enlace en un campo de solo lectura (se selecciona entero al pulsarlo, por
 *  si el portapapeles no está disponible) y un botón para copiarlo. */
export function CopiarEnlace({ enlace }: { enlace: string }) {
  const [estado, setEstado] = useState<"" | "copiado" | "manual">("");
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        readOnly
        value={enlace}
        aria-label="Enlace del alta"
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        style={{ ...campo, padding: "5px 8px", fontSize: 12, width: 300, maxWidth: "100%", fontFamily: "ui-monospace, monospace" }}
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(enlace);
            setEstado("copiado");
          } catch {
            setEstado("manual");
          }
        }}
        style={{ ...botonSecundario, padding: "5px 10px", fontSize: 13 }}
      >
        Copiar
      </button>
      {estado && (
        <span role="status" style={{ fontSize: 12, color: estado === "copiado" ? "#16a34a" : "#b45309" }}>
          {estado === "copiado" ? "Copiado" : "No se pudo copiar: selecciona el texto y cópialo a mano."}
        </span>
      )}
    </div>
  );
}
