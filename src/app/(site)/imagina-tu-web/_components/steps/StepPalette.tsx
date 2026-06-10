"use client";

import {
  CUSTOM_PALETTE_SLUG,
  PALETTES,
  buildCustomPalette,
  type CustomPaletteColors,
} from "@/lib/preview-themes";

interface Props {
  value: string;
  customColors: CustomPaletteColors | null;
  onChange: (slug: string, customColors?: CustomPaletteColors | null) => void;
}

const DEFAULT_CUSTOM_COLORS: CustomPaletteColors = {
  text: "#102744",
  accent: "#2563eb",
  tint: "#e0f2fe",
};

export function StepPalette({ value, customColors, onChange }: Props) {
  const effectiveCustom = customColors ?? DEFAULT_CUSTOM_COLORS;
  const isCustom = value === CUSTOM_PALETTE_SLUG;
  const previewPalette = buildCustomPalette(effectiveCustom);

  const updateColor = (key: keyof CustomPaletteColors, hex: string) => {
    const next = { ...effectiveCustom, [key]: hex };
    onChange(CUSTOM_PALETTE_SLUG, next);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Elige una paleta</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PALETTES.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => onChange(p.slug)}
            className={`overflow-hidden rounded-xl border-2 text-left transition ${
              value === p.slug
                ? "border-accent ring-2 ring-accent/30"
                : "border-border hover:border-accent/50"
            }`}
          >
            <div
              className="h-24"
              style={{ background: p.heroGradient }}
              aria-hidden
            />
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="font-semibold">{p.name}</span>
              <span className="flex gap-1">
                <span
                  className="size-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: p.bg }}
                  aria-hidden
                />
                <span
                  className="size-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: p.text }}
                  aria-hidden
                />
                <span
                  className="size-5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: p.accent }}
                  aria-hidden
                />
              </span>
            </div>
          </button>
        ))}

        {/* Personalizada — opens 3 color pickers */}
        <button
          type="button"
          onClick={() => onChange(CUSTOM_PALETTE_SLUG, effectiveCustom)}
          className={`overflow-hidden rounded-xl border-2 border-dashed text-left transition sm:col-span-2 ${
            isCustom
              ? "border-accent ring-2 ring-accent/30"
              : "border-border hover:border-accent/50"
          }`}
        >
          <div
            className="h-24"
            style={{ background: previewPalette.heroGradient }}
            aria-hidden
          />
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">Personalizada</p>
              <p className="text-xs text-fg-muted">
                Pinta tu propia paleta con 3 colores
              </p>
            </div>
            <span className="flex gap-1">
              <span
                className="size-5 rounded-full ring-1 ring-border"
                style={{ backgroundColor: effectiveCustom.tint }}
                aria-hidden
              />
              <span
                className="size-5 rounded-full ring-1 ring-border"
                style={{ backgroundColor: effectiveCustom.text }}
                aria-hidden
              />
              <span
                className="size-5 rounded-full ring-1 ring-border"
                style={{ backgroundColor: effectiveCustom.accent }}
                aria-hidden
              />
            </span>
          </div>
        </button>
      </div>

      {isCustom && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-subtle p-4">
          <p className="text-sm font-semibold">Define tus colores</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorField
              label="Color principal"
              hint="Texto y fondos oscuros"
              value={effectiveCustom.text}
              onChange={(hex) => updateColor("text", hex)}
            />
            <ColorField
              label="Color de marca"
              hint="Botones y acentos"
              value={effectiveCustom.accent}
              onChange={(hex) => updateColor("accent", hex)}
            />
            <ColorField
              label="Color claro"
              hint="Fondos suaves / gradientes"
              value={effectiveCustom.tint}
              onChange={(hex) => updateColor("tint", hex)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        {label}
      </span>
      <span className="mt-0.5 block text-[11px] text-fg-muted">{hint}</span>
      <span className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-border bg-bg p-1"
          aria-label={`Selector de ${label}`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#([0-9a-fA-F]{0,6})$/.test(v) || v === "") onChange(v);
          }}
          maxLength={7}
          className="surface-input h-10 w-full rounded-md px-2 font-mono text-xs uppercase"
        />
      </span>
    </label>
  );
}
