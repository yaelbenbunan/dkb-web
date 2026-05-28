"use client";

import { useRef, useState } from "react";

interface Value {
  logoDataUrl: string;
  address: string;
  city: string;
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB
const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export function StepBranding({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Value>(k: K, v: Value[K]) =>
    onChange({ ...value, [k]: v });

  const onFile = (file: File | null) => {
    setError(null);
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Formato no válido. Usa PNG, JPG, WebP o SVG.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("La imagen pesa más de 500 KB. Súbela más ligera.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      set("logoDataUrl", result);
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tu marca y ubicación</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Opcional. Si nos das tu logo y dirección, la web simulada se verá más
          tuya.
        </p>
      </div>

      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Logo (opcional)
        </span>
        <div className="mt-1.5 flex items-center gap-4">
          {value.logoDataUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-subtle p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.logoDataUrl}
                alt="Logo"
                className="size-14 rounded object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  set("logoDataUrl", "");
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="text-xs font-semibold text-fg-muted hover:text-fg"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="surface-input flex h-14 items-center gap-3 rounded-md px-4 text-sm hover:border-accent"
            >
              <span aria-hidden>📷</span>
              <span>Subir logo (PNG, JPG, WebP o SVG · máx 500 KB)</span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Dirección (opcional)
          </span>
          <input
            type="text"
            value={value.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Ej. Calle Mayor 12"
            maxLength={120}
            className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Ciudad (opcional)
          </span>
          <input
            type="text"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Ej. Madrid"
            maxLength={60}
            className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          />
        </label>
      </div>
    </div>
  );
}
