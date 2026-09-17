"use client";

import { useState, useTransition } from "react";
import { regenerarSecretoAction } from "../../../acciones-marcas";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../_componentes/Mensaje";
import { botonSecundario, tarjeta, titulo } from "../../../_componentes/estilos";

export function WebhookInfo({ marcaId, slug, secreto }: { marcaId: string; slug: string; secreto: string }) {
  const [visible, setVisible] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null);
  const [pendiente, empezar] = useTransition();
  const codigo = { background: "#f1f5f9", borderRadius: 6, padding: "6px 8px", fontSize: 13, wordBreak: "break-all" } as const;

  return (
    <section style={tarjeta}>
      <h2 style={titulo}>Entrada de leads de anuncios</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#475569" }}>
        En Zapier (o en la landing), un POST a esta dirección con el secreto en la cabecera <code>x-webhook-secret</code>:
      </p>
      <p style={codigo}>https://www.dinkbit.es/api/ventas/leads/{slug}</p>
      <p style={codigo}>{visible ? secreto : "•".repeat(24)}</p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
        Campos que entiende: negocio o company_name, contacto o full_name, telefono o phone_number, email, ciudad, tipo_negocio, campana o campaign_name.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setVisible((v) => !v)} style={botonSecundario}>
          {visible ? "Ocultar secreto" : "Ver secreto"}
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm("El secreto actual dejará de funcionar y habrá que cambiarlo en Zapier. ¿Seguir?")) return;
            empezar(async () => setResultado(await regenerarSecretoAction(marcaId)));
          }}
          style={botonSecundario}
        >
          Generar secreto nuevo
        </button>
        <Mensaje resultado={resultado} />
      </div>
    </section>
  );
}
