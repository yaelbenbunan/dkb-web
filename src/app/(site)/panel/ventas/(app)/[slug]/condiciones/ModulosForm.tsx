"use client";

import { useActionState } from "react";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { actualizarModulosAction } from "../../../acciones-campanas";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonPrimario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

/**
 * Servicios opcionales de la marca. Hoy solo Campañas (mailing), que es de
 * pago: solo un admin lo enciende o apaga.
 */
export function ModulosForm({
  marcaId,
  campanas,
  remitentes,
  remitentesGlobales,
  editable,
}: {
  marcaId: string;
  campanas: boolean;
  remitentes: string[];
  remitentesGlobales: string[];
  editable: boolean;
}) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(actualizarModulosAction.bind(null, marcaId), null);
  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Módulos</h2>
      <fieldset disabled={!editable} style={{ display: "contents" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" name="campanas" defaultChecked={campanas} />
          Campañas de email (servicio de pago)
        </label>
        <label style={etiqueta}>
          Remitentes permitidos (separados por comas)
          <input name="remitentes" defaultValue={remitentes.join(", ")} placeholder={remitentesGlobales.join(", ")} style={campo} />
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          Vacío = {remitentesGlobales.join(", ")}. El dominio de cada remitente tiene que estar verificado en Resend; si no,
          los correos no salen.
        </p>
        {editable && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" disabled={pendiente} style={{ ...botonPrimario, opacity: pendiente ? 0.6 : 1 }}>
              Guardar módulos
            </button>
            <Mensaje resultado={resultado} />
          </div>
        )}
      </fieldset>
    </form>
  );
}
