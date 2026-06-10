"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Eligiendo la paleta perfecta…",
  "Maquetando el hero…",
  "Generando la imagen…",
  "Puliendo los textos…",
  "Casi listo, prometido…",
];

export function PreviewLoading() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border bg-bg-elevated p-10 text-center"
    >
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
        </div>
      </div>
      <p className="text-base font-semibold">Creando tu preview…</p>
      <p
        key={idx}
        className="mt-2 text-sm text-fg-muted transition-opacity duration-300"
      >
        {MESSAGES[idx]}
      </p>
      <p className="mt-6 text-xs text-fg-muted">
        Esto suele tardar entre 10 y 15 segundos.
      </p>
    </div>
  );
}
