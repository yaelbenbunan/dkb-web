"use client";

import { SECTORS } from "@/lib/preview-themes";

interface Value {
  businessName: string;
  sector: string;
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function StepIdentity({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tu negocio</h2>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Nombre del negocio *
        </span>
        <input
          type="text"
          value={value.businessName}
          onChange={(e) =>
            onChange({ ...value, businessName: e.target.value })
          }
          placeholder="Ej. Tienda Tati"
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          maxLength={60}
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Sector *
        </span>
        <select
          value={value.sector}
          onChange={(e) => onChange({ ...value, sector: e.target.value })}
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        >
          <option value="" disabled>
            Selecciona un sector
          </option>
          {SECTORS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
