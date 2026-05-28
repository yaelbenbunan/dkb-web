"use client";

import { PALETTES } from "@/lib/preview-themes";

interface Props {
  value: string;
  onChange: (slug: string) => void;
}

export function StepPalette({ value, onChange }: Props) {
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
      </div>
    </div>
  );
}
