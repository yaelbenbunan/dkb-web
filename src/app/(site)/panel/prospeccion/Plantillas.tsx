"use client";

import { useState, useTransition } from "react";
import { VARIABLES } from "@/lib/prospeccion/plantilla";
import type { ProspectTemplateRow } from "@/lib/prospeccion/tipos";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta, titulo } from "../_componentes/estilos";
import { borrarPlantillaAction, guardarPlantillaAction } from "./actions";
import type { Aviso } from "./Prospeccion";

const VACIA = { id: undefined as string | undefined, name: "", subject: "", body: "" };

export function Plantillas({
  plantillas,
  onAviso,
}: {
  plantillas: ProspectTemplateRow[];
  onAviso: (a: Aviso | null) => void;
}) {
  const [borrador, setBorrador] = useState(VACIA);
  const [pendiente, startTransition] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await guardarPlantillaAction(borrador);
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (r.ok) setBorrador(VACIA);
    });
  }

  function borrar(t: ProspectTemplateRow) {
    if (!window.confirm(`¿Borrar la plantilla «${t.name}»?`)) return;
    startTransition(async () => {
      const r = await borrarPlantillaAction(t.id);
      onAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      if (borrador.id === t.id) setBorrador(VACIA);
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <form onSubmit={guardar} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={titulo}>{borrador.id ? "Editar plantilla" : "Nueva plantilla"}</h2>
        <label style={etiqueta}>
          Nombre (solo lo ves tú)
          <input style={campo} value={borrador.name} onChange={(e) => setBorrador({ ...borrador, name: e.target.value })} required maxLength={80} />
        </label>
        <label style={etiqueta}>
          Asunto
          <input style={campo} value={borrador.subject} onChange={(e) => setBorrador({ ...borrador, subject: e.target.value })} required maxLength={200} />
        </label>
        <label style={etiqueta}>
          Texto
          <textarea style={{ ...campo, minHeight: 220, resize: "vertical" }} value={borrador.body} onChange={(e) => setBorrador({ ...borrador, body: e.target.value })} required maxLength={5000} />
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          Variables: {VARIABLES.map((v) => `{{${v}}}`).join(" ")}. Si a una empresa le falta un dato que usas, ese correo no se envía. El pie con los datos de dinkbit y el enlace de baja se añade solo.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={pendiente} style={botonPrimario}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          {borrador.id && (
            <button type="button" onClick={() => setBorrador(VACIA)} style={botonSecundario}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {plantillas.length === 0 && <p style={{ ...tarjeta, margin: 0, color: "#64748b", fontSize: 14 }}>Aún no hay plantillas.</p>}
        {plantillas.map((t) => (
          <article key={t.id} style={tarjeta}>
            <strong>{t.name}</strong>
            <p style={{ margin: "6px 0", fontSize: 13, color: "#334155" }}>{t.subject}</p>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b", whiteSpace: "pre-wrap", maxHeight: 96, overflow: "hidden" }}>{t.body}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={botonSecundario} onClick={() => setBorrador({ id: t.id, name: t.name, subject: t.subject, body: t.body })}>
                Editar
              </button>
              <button type="button" style={{ ...botonSecundario, color: "#b91c1c" }} disabled={pendiente} onClick={() => borrar(t)}>
                Borrar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
