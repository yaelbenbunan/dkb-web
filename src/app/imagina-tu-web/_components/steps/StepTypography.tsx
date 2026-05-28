"use client";

import { TYPOGRAPHIES } from "@/lib/preview-themes";

interface Props {
  value: string;
  onChange: (slug: string) => void;
}

export function StepTypography({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Elige una tipografía</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {TYPOGRAPHIES.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => onChange(t.slug)}
            className={`rounded-xl border-2 p-6 text-left transition ${
              value === t.slug
                ? "border-accent ring-2 ring-accent/30"
                : "border-border hover:border-accent/50"
            }`}
          >
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: `var(${t.displayVar}), system-ui, sans-serif` }}
            >
              Tu marca
            </p>
            <p className="mt-2 text-sm text-fg-muted">{t.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
