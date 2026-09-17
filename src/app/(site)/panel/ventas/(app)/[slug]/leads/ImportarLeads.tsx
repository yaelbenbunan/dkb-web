"use client";

import { useActionState, useRef, useState } from "react";
import { importarLeadsAction, previsualizarLeadsAction } from "../../../acciones-leads";
import { decodeCsvBytes, parseVentasLeadsCsv, plantillaVentasCsv, type ParsedVentasCsv } from "@/lib/ventas/leads-csv";
import type { PreviaImportacion, ResultadoImportacion } from "@/lib/ventas/servicios";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "../../../_componentes/estilos";

const MAX_LISTADOS = 10;

export function ImportarLeads({ slug }: { slug: string }) {
  const [csv, setCsv] = useState("");
  const [nombreFichero, setNombreFichero] = useState("");
  // Lectura local: se ve al instante y sirve de reserva mientras responde el servidor.
  const [previa, setPrevia] = useState<ParsedVentasCsv | null>(null);
  // Previsualización del servidor: además detecta duplicados y excluidos.
  const [previaServidor, setPreviaServidor] = useState<PreviaImportacion | null>(null);
  const [errorPrevia, setErrorPrevia] = useState("");
  const peticion = useRef(0);
  const [resultado, accion, pendiente] = useActionState<ResultadoImportacion | null, FormData>(importarLeadsAction.bind(null, slug), null);

  async function elegir(fichero: File | undefined) {
    if (!fichero) return;
    const texto = decodeCsvBytes(await fichero.arrayBuffer());
    setCsv(texto);
    setNombreFichero(fichero.name);
    setPrevia(parseVentasLeadsCsv(texto));
    setPreviaServidor(null);
    setErrorPrevia("");

    const esta = ++peticion.current;
    try {
      const res = await previsualizarLeadsAction(slug, texto);
      if (esta !== peticion.current) return; // Ya se eligió otro fichero.
      if (res.ok) setPreviaServidor(res.previa);
      else setErrorPrevia(res.error);
    } catch {
      if (esta === peticion.current) setErrorPrevia("No se han podido comprobar duplicados ni exclusiones.");
    }
  }

  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob([plantillaVentasCsv()], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-leads-ventas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const nombres = (items: string[], color: string) => (
    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color }}>
      {items.slice(0, MAX_LISTADOS).map((n, i) => (
        <li key={i}>{n}</li>
      ))}
      {items.length > MAX_LISTADOS && <li>y {items.length - MAX_LISTADOS} más</li>}
    </ul>
  );

  const lista = (items: { line: number; message: string }[], color: string) => (
    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color }}>
      {items.slice(0, MAX_LISTADOS).map((e, i) => (
        <li key={i}>Línea {e.line}: {e.message}</li>
      ))}
      {items.length > MAX_LISTADOS && <li>y {items.length - MAX_LISTADOS} más</li>}
    </ul>
  );

  return (
    <form action={accion} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ ...titulo, margin: 0 }}>Importar lista (CSV)</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ ...etiqueta, flex: "1 1 220px" }}>
          Fichero
          <input type="file" accept=".csv,text/csv" onChange={(e) => elegir(e.target.files?.[0])} style={campo} />
        </label>
        <label style={{ ...etiqueta, flex: "1 1 220px" }}>
          Nombre de la lista
          <input name="nombre_lista" placeholder="Gimnasios Madrid septiembre" required style={campo} />
        </label>
        <button type="button" onClick={descargarPlantilla} style={botonSecundario}>Descargar plantilla</button>
      </div>
      <input type="hidden" name="csv" value={csv} />
      <input type="hidden" name="nombre_fichero" value={nombreFichero} />

      {previaServidor ? (
        <div style={{ fontSize: 14 }}>
          <strong>{previaServidor.validas - previaServidor.duplicados.length - previaServidor.excluidos.length} leads nuevos</strong>
          {" · "}
          <strong style={{ color: "#b45309" }}>{previaServidor.duplicados.length} duplicados</strong>
          {" · "}
          <strong style={{ color: "#64748b" }}>{previaServidor.excluidos.length} excluidos</strong>
          {previaServidor.errores.length > 0 && <> · <strong style={{ color: "#b91c1c" }}>{previaServidor.errores.length} con errores</strong></>}
          {previaServidor.cabecerasDesconocidas.length > 0 && (
            <div style={{ fontSize: 13, color: "#64748b" }}>Columnas que se ignoran: {previaServidor.cabecerasDesconocidas.join(", ")}</div>
          )}
          {previaServidor.errores.length > 0 && lista(previaServidor.errores, "#b91c1c")}
          {previaServidor.avisos.length > 0 && lista(previaServidor.avisos, "#b45309")}
          {previaServidor.duplicados.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              Duplicados (ya están como lead de la marca, no se guardan):
              {nombres(previaServidor.duplicados, "#b45309")}
            </div>
          )}
          {previaServidor.excluidos.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              Excluidos (ya eran clientes de la marca, no se guardan):
              {nombres(previaServidor.excluidos, "#64748b")}
            </div>
          )}
        </div>
      ) : (
        previa && (
          <div style={{ fontSize: 14 }}>
            <strong>{previa.filas.length} filas válidas</strong>
            {previa.errores.length > 0 && <> · <strong style={{ color: "#b91c1c" }}>{previa.errores.length} con errores</strong></>}
            {previa.cabecerasDesconocidas.length > 0 && (
              <div style={{ fontSize: 13, color: "#64748b" }}>Columnas que se ignoran: {previa.cabecerasDesconocidas.join(", ")}</div>
            )}
            {previa.errores.length > 0 && lista(previa.errores, "#b91c1c")}
            {previa.avisos.length > 0 && lista(previa.avisos, "#b45309")}
            <div style={{ fontSize: 12, color: errorPrevia ? "#b91c1c" : "#64748b", marginTop: 6 }}>
              {errorPrevia || "Comprobando duplicados y exclusiones…"}
            </div>
          </div>
        )
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pendiente || !previa || previa.filas.length === 0 || previa.errores.length > 0}
          style={{ ...botonPrimario, opacity: pendiente || !previa || previa.errores.length > 0 ? 0.6 : 1 }}
        >
          {pendiente ? "Importando…" : "Importar"}
        </button>
        {resultado?.ok && (
          <span style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>
            {resultado.creados} leads nuevos · {resultado.duplicados} duplicados · {resultado.excluidos} excluidos
          </span>
        )}
        {resultado && !resultado.ok && <span style={{ fontSize: 14, fontWeight: 600, color: "#b91c1c" }}>{resultado.error}</span>}
      </div>
      {resultado && !resultado.ok && resultado.errores.length > 0 && lista(resultado.errores, "#b91c1c")}
    </form>
  );
}
