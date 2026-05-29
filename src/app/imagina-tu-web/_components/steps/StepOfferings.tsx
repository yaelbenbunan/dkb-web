"use client";

import { useState } from "react";
import {
  CUISINES,
  type Cuisine,
} from "../templates/sector-assets";

interface Props {
  /** Free-text offerings list (used by every sector EXCEPT restauración) */
  value: string[];
  /** Sector slug — picks which UI to show */
  sector: string;
  /** Selected cuisine, only meaningful when sector === "restauracion" */
  cuisine: Cuisine | "";
  /** Optional signature dishes, only meaningful when sector === "restauracion" */
  featuredDishes: string[];
  onChange: (next: {
    offerings: string[];
    cuisine: Cuisine | "";
    featuredDishes: string[];
  }) => void;
}

export function StepOfferings({
  value,
  sector,
  cuisine,
  featuredDishes,
  onChange,
}: Props) {
  if (sector === "restauracion") {
    return (
      <CuisinePicker
        cuisine={cuisine}
        featuredDishes={featuredDishes}
        onChange={(next) => {
          const label =
            CUISINES.find((x) => x.slug === next.cuisine)?.label ?? "";
          // Mirror the cuisine label into `offerings` so the schema (which
          // still requires at least 1 item) is happy. The template ignores
          // this field for restauración and uses cuisine + (optional) featured
          // dishes + AI-generated dishes instead.
          onChange({
            offerings: label ? [label] : [],
            cuisine: next.cuisine,
            featuredDishes: next.featuredDishes,
          });
        }}
      />
    );
  }
  return (
    <FreeTextOfferings
      value={value}
      onChange={(next) =>
        onChange({ offerings: next, cuisine: "", featuredDishes: [] })
      }
    />
  );
}

function CuisinePicker({
  cuisine,
  featuredDishes,
  onChange,
}: {
  cuisine: Cuisine | "";
  featuredDishes: string[];
  onChange: (next: { cuisine: Cuisine | ""; featuredDishes: string[] }) => void;
}) {
  const [draft, setDraft] = useState("");

  const addDish = () => {
    const item = draft.trim();
    if (!item || featuredDishes.length >= 6) return;
    onChange({ cuisine, featuredDishes: [...featuredDishes, item.slice(0, 80)] });
    setDraft("");
  };
  const removeDish = (i: number) =>
    onChange({
      cuisine,
      featuredDishes: featuredDishes.filter((_, idx) => idx !== i),
    });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">¿Qué tipo de cocina hacéis?</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Elige la que mejor encaje. Con tu elección mostraremos platos del
          estilo que cocinas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CUISINES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => onChange({ cuisine: c.slug, featuredDishes })}
            className={`rounded-xl border-2 p-4 text-left transition ${
              cuisine === c.slug
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
          >
            <p className="text-base font-semibold">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Optional signature dishes — we keep these real in the menu and invent
          the rest around them. */}
      <div className="space-y-3 border-t border-border pt-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Platos destacados (opcional)
          </span>
          <p className="mt-1 text-sm text-fg-muted">
            Añade hasta 6 platos tuyos y completamos la carta con platos del
            estilo elegido.
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
                addDish();
              }
            }}
            placeholder="Ej. Tartar de atún rojo"
            className="surface-input block w-full rounded-md px-3.5 py-2.5 text-sm"
            maxLength={80}
          />
          <button
            type="button"
            onClick={addDish}
            disabled={!draft.trim() || featuredDishes.length >= 6}
            className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
        {featuredDishes.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {featuredDishes.map((item, i) => (
              <li
                key={i}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-sm"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeDish(i)}
                  aria-label={`Quitar ${item}`}
                  className="text-fg-muted hover:text-fg"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FreeTextOfferings({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
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
