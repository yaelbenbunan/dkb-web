"use client";

import { datosDeProspecto, renderPlantilla } from "@/lib/prospeccion/plantilla";
import type { ProspectRow, ProspectTemplateRow } from "@/lib/prospeccion/tipos";
import { tarjeta } from "../_componentes/estilos";

/** Lo que va a recibir esa empresa, renderizado con el mismo código que el
 *  envío. Si falta un dato, lo dice en vez de enseñar un correo a medias. */
export function VistaPrevia({ prospecto, plantilla }: { prospecto: ProspectRow; plantilla: ProspectTemplateRow }) {
  const datos = datosDeProspecto(prospecto);
  const asunto = renderPlantilla(plantilla.subject, datos);
  const cuerpo = renderPlantilla(plantilla.body, datos);
  const faltan = [...new Set([...(asunto.ok ? [] : asunto.faltan), ...(cuerpo.ok ? [] : cuerpo.faltan)])];

  return (
    <div style={{ ...tarjeta, background: "#f8fafc" }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
        Para <strong>{prospecto.email}</strong>
      </p>
      {faltan.length > 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
          No se puede enviar: a esta empresa le falta {faltan.map((f) => `{{${f}}}`).join(", ")}.
        </p>
      ) : (
        <>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14 }}>{asunto.ok && asunto.texto}</p>
          <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{cuerpo.ok && cuerpo.texto}</p>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#94a3b8" }}>+ pie con los datos de dinkbit y el enlace de baja.</p>
        </>
      )}
    </div>
  );
}
