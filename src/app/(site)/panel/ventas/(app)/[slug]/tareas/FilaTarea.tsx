"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarTareaAction, reasignarTareaAction } from "../../../acciones-tareas";
import { formatoSeguimiento } from "@/lib/ventas/metricas";
import type { TareaVista } from "@/lib/ventas/tareas";

const ETIQUETA = { llamar: "Llamada", enviar_muestras: "Muestras", manual: "Tarea" } as const;

export function FilaTarea({
  slug,
  tarea,
  usuarias,
  responsable,
  atrasada,
}: {
  slug: string;
  tarea: TareaVista;
  usuarias: { id: string; nombre: string }[];
  responsable: string | null;
  atrasada: boolean;
}) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const manual = tarea.tipo === "manual" && tarea.tareaId !== null;
  const ejecutar = (accion: () => Promise<{ ok: boolean; error?: string }>) =>
    empezar(async () => {
      const r = await accion();
      setError(r.ok ? null : (r.error ?? "No se pudo guardar."));
    });

  return (
    <li style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, opacity: pendiente ? 0.55 : 1 }}>
      {manual ? (
        <input
          type="checkbox"
          checked={tarea.hecha}
          disabled={pendiente}
          aria-label={`${tarea.hecha ? "Deshacer" : "Marcar hecha"}: ${tarea.titulo}`}
          onChange={(e) => ejecutar(() => marcarTareaAction(slug, tarea.tareaId!, e.target.checked))}
        />
      ) : (
        <span aria-hidden="true" style={{ width: 13 }} />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", background: "#f1f5f9", borderRadius: 4, padding: "2px 6px" }}>{ETIQUETA[tarea.tipo]}</span>
      <span style={{ flex: "1 1 220px", fontSize: 14, textDecoration: tarea.hecha ? "line-through" : "none" }}>
        {tarea.leadId ? (
          <Link href={`/panel/ventas/${slug}/leads/${tarea.leadId}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>{tarea.titulo}</Link>
        ) : (
          <strong>{tarea.titulo}</strong>
        )}
        {manual && tarea.negocio && <span style={{ color: "#64748b" }}> · {tarea.negocio}</span>}
      </span>
      {tarea.fecha && (
        <span style={{ fontSize: 13, fontWeight: atrasada ? 700 : 400, color: atrasada ? "#b91c1c" : "#334155" }}>{formatoSeguimiento(tarea.fecha, tarea.hora)}</span>
      )}
      {manual ? (
        <select
          value={tarea.asignadaA ?? ""}
          disabled={pendiente}
          aria-label={`Responsable de: ${tarea.titulo}`}
          onChange={(e) => ejecutar(() => reasignarTareaAction(slug, tarea.tareaId!, e.target.value))}
          style={{ fontSize: 13, padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 6 }}
        >
          <option value="">Sin asignar</option>
          {usuarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      ) : (
        <span style={{ fontSize: 13, color: "#64748b" }}>{responsable ?? "Sin asignar"}</span>
      )}
      {error && <span role="alert" style={{ flexBasis: "100%", fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </li>
  );
}
