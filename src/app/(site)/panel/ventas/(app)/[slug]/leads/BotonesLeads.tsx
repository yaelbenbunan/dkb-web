"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { botonPrimario, botonSecundario } from "../../../_componentes/estilos";
import { ImportarLeads } from "./ImportarLeads";
import { NuevoLeadForm } from "./NuevoLeadForm";

function Dialogo({ titulo, etiquetaBoton, estiloBoton, children }: { titulo: string; etiquetaBoton: string; estiloBoton: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} style={{ ...estiloBoton, padding: "6px 12px", fontSize: 13 }}>
        {etiquetaBoton}
      </button>
      <dialog
        ref={ref}
        aria-label={titulo}
        // Clic en el fondo (el propio <dialog>, no su contenido) cierra.
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        style={{ border: "none", borderRadius: 12, padding: 0, width: "min(720px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)" }}
      >
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong style={{ fontSize: 17 }}>{titulo}</strong>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Cerrar" style={{ ...botonSecundario, padding: "4px 10px" }}>✕</button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

export function BotonesLeads({ slug }: { slug: string }) {
  return (
    <>
      <Dialogo titulo="Añadir lead" etiquetaBoton="+ Añadir lead" estiloBoton={botonPrimario}>
        <NuevoLeadForm slug={slug} enDialogo />
      </Dialogo>
      <Dialogo titulo="Importar leads desde CSV" etiquetaBoton="Importar CSV" estiloBoton={botonSecundario}>
        <ImportarLeads slug={slug} enDialogo />
      </Dialogo>
    </>
  );
}
