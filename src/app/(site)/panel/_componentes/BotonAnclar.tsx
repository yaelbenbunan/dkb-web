"use client";

import { useState, useTransition } from "react";
import { alternarAncladoAction } from "../acciones-marcas";

/** Anclar el cliente en el menú lateral de quien lo mira (o soltarlo). */
export function BotonAnclar({ marcaId, anclado }: { marcaId: string; anclado: boolean }) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={pendiente}
        aria-pressed={anclado}
        onClick={() =>
          empezar(async () => {
            const r = await alternarAncladoAction(marcaId);
            setError(r.ok ? null : (r.error ?? "No se pudo guardar."));
          })
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          padding: "6px 12px",
          borderRadius: 999,
          cursor: "pointer",
          border: `1px solid ${anclado ? "#0f172a" : "#cbd5e1"}`,
          background: anclado ? "#0f172a" : "#fff",
          color: anclado ? "#fff" : "#334155",
          opacity: pendiente ? 0.6 : 1,
        }}
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 17v5" />
          <path d="M9 10.76V6h6v4.76a2 2 0 0 0 1.11 1.79l1.78.9A2 2 0 0 1 19 15.24V17H5v-1.76a2 2 0 0 1 1.11-1.79l1.78-.9A2 2 0 0 0 9 10.76Z" />
          <path d="M8 2h8" />
        </svg>
        {anclado ? "Anclado en mi menú" : "Anclar en mi menú"}
      </button>
      {error && <span role="alert" style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </span>
  );
}
