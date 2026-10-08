"use client";

import { useState } from "react";
import type {
  ProspectRow,
  ProspectSearchRow,
  ProspectTemplateRow,
} from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario } from "../_componentes/estilos";
import { Buscador } from "./Buscador";
import { Plantillas } from "./Plantillas";
import { TablaProspectos } from "./TablaProspectos";

export interface Aviso {
  ok: boolean;
  texto: string;
}

export function Prospeccion(props: {
  prospectos: ProspectRow[];
  busquedas: ProspectSearchRow[];
  plantillas: ProspectTemplateRow[];
  enviadosHoy: number;
  limite: number;
  remitentes: string[];
  placesConfigurado: boolean;
}) {
  const [vista, setVista] = useState<"empresas" | "plantillas">("empresas");
  const [aviso, setAviso] = useState<Aviso | null>(null);

  // Empresas que se quedaron sin revisar, agrupadas por su búsqueda.
  const cuenta = new Map<string, number>();
  for (const p of props.prospectos) {
    if (p.status === "nuevo" && p.search_id) cuenta.set(p.search_id, (cuenta.get(p.search_id) ?? 0) + 1);
  }
  const pendientes = [...cuenta].map(([searchId, n]) => ({ searchId, n }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setVista("empresas")} style={vista === "empresas" ? botonPrimario : botonSecundario}>
          Empresas ({props.prospectos.length})
        </button>
        <button type="button" onClick={() => setVista("plantillas")} style={vista === "plantillas" ? botonPrimario : botonSecundario}>
          Plantillas ({props.plantillas.length})
        </button>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#475569" }}>
          Enviados hoy: <strong>{props.enviadosHoy}</strong> de {props.limite}
        </span>
      </div>

      {props.remitentes.length === 0 && (
        <p style={{ margin: 0, padding: "10px 14px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13 }}>
          No hay remitente de prospección configurado (<code>PROSPECT_SENDERS</code>). Puedes buscar y preparar, pero no enviar.
        </p>
      )}

      {aviso && (
        <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: aviso.ok ? "#16a34a" : "#b91c1c" }}>
          {aviso.texto}
        </p>
      )}

      {vista === "empresas" ? (
        <>
          <Buscador placesConfigurado={props.placesConfigurado} pendientes={pendientes} onAviso={setAviso} />
          <TablaProspectos
            prospectos={props.prospectos}
            busquedas={props.busquedas}
            plantillas={props.plantillas}
            remitentes={props.remitentes}
            cupo={Math.max(0, props.limite - props.enviadosHoy)}
            onAviso={setAviso}
          />
        </>
      ) : (
        <Plantillas plantillas={props.plantillas} onAviso={setAviso} />
      )}
    </div>
  );
}
