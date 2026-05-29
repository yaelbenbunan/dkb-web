"use client";

import { SECTORS } from "@/lib/preview-themes";

interface Value {
  businessName: string;
  sector: string;
  currentWebsite: string;
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
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Web actual (opcional)
        </span>
        <input
          type="url"
          inputMode="url"
          value={value.currentWebsite}
          onChange={(e) =>
            onChange({ ...value, currentWebsite: e.target.value })
          }
          placeholder="Ej. www.tunegocio.com"
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          maxLength={300}
        />
        <span className="mt-1 block text-xs text-fg-muted">
          Si ya tienes web, la usamos para que la propuesta sea lo más fiel
          posible a tu negocio real.
        </span>
      </label>
    </div>
  );
}
