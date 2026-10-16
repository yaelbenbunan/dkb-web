"use client";

import { useActionState, useTransition, useState } from "react";
import { actualizarOrigenLeadAction, archivarLeadAction } from "../../../../acciones-leads";
import type { Lead } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { Mensaje } from "../../../../_componentes/Mensaje";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "../../../../_componentes/estilos";

const ESTADO_EMAIL: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  opened: "Abierto",
  clicked: "Clic",
  bounced: "Rebotado",
  complained: "Marcado como spam",
};

/**
 * Por dónde llegó el lead y si se le puede escribir: canal, campaña, etiquetas
 * (p. ej. «kit-digital»), consentimiento y el estado del último correo
 * automático. Vienen de los formularios de la web; aquí se pueden corregir.
 */
export function OrigenLead({ slug, lead }: { slug: string; lead: Lead }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoAccion | null, FormData>(actualizarOrigenLeadAction.bind(null, slug, lead.id), null);
  const [archivo, setArchivo] = useState<ResultadoAccion | null>(null);
  const [archivando, empezar] = useTransition();
  const consentimiento = lead.consentimiento === true ? "si" : lead.consentimiento === false ? "no" : "";
  const pdf = typeof lead.extra?.pdf_path === "string" && lead.extra.pdf_path;
  const conjunto = typeof lead.extra?.adset_name === "string" ? lead.extra.adset_name : "";
  const anuncio = typeof lead.extra?.ad_name === "string" ? lead.extra.ad_name : "";

  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Origen</h2>
      <label style={etiqueta}>
        Canal
        <input name="canal" defaultValue={lead.canal ?? ""} placeholder="Meta, Web, WhatsApp…" style={campo} />
      </label>
      <label style={etiqueta}>
        Campaña
        <input name="campana" defaultValue={lead.campana ?? ""} style={campo} />
      </label>
      {(conjunto || anuncio) && (
        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
          {conjunto && (
            <>
              Conjunto de anuncios: <strong>{conjunto}</strong>
            </>
          )}
          {conjunto && anuncio && <br />}
          {anuncio && (
            <>
              Anuncio: <strong>{anuncio}</strong>
            </>
          )}
        </p>
      )}
      <label style={etiqueta}>
        Etiquetas (separadas por comas)
        <input name="etiquetas" defaultValue={(lead.etiquetas ?? []).join(", ")} placeholder="kit-digital" style={campo} />
      </label>
      <label style={etiqueta}>
        Acepta comunicaciones comerciales
        <select name="consentimiento" defaultValue={consentimiento} style={campo}>
          <option value="">Sin definir</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </label>
      {lead.email_estado && (
        <p style={{ margin: 0, fontSize: 13, color: lead.email_estado === "bounced" || lead.email_estado === "complained" ? "#b91c1c" : "#475569" }}>
          Último correo automático: <strong>{ESTADO_EMAIL[lead.email_estado] ?? lead.email_estado}</strong>
        </p>
      )}
      {pdf && (
        <a href={`/panel/pdf/${lead.id}`} target="_blank" rel="noopener" style={{ fontSize: 13, color: "#187bef", fontWeight: 600 }}>
          Ver PDF del preview
        </a>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={pendiente} style={botonPrimario}>
          Guardar origen
        </button>
        <button
          type="button"
          disabled={archivando}
          onClick={() => empezar(async () => setArchivo(await archivarLeadAction(slug, lead.id, !lead.archivado)))}
          style={botonSecundario}
        >
          {lead.archivado ? "Desarchivar" : "Archivar"}
        </button>
      </div>
      <Mensaje resultado={resultado ?? archivo} />
    </form>
  );
}
