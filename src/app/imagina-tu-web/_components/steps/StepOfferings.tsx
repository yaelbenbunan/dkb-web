"use client";

import { useState } from "react";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
}

export function StepOfferings({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const item = draft.trim();
    if (!item || value.length >= 6) return;
    onChange([...value, item.slice(0, 80)]);
    setDraft("");
  };
  const remove = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">¿Qué vendes u ofreces?</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Añade entre 1 y 6. Pulsa Enter o el botón.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ej. Asesoría fiscal"
          className="surface-input block w-full rounded-md px-3.5 py-2.5 text-sm"
          maxLength={80}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || value.length >= 6}
          className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Añadir
        </button>
      </div>

      <ul className="flex flex-wrap gap-2">
        {value.map((item, i) => (
          <li
            key={i}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-sm"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar ${item}`}
              className="text-fg-muted hover:text-fg"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
