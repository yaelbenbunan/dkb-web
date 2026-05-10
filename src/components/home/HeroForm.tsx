"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendLead } from "@/lib/lead-action";

interface ServiceOption {
  slug: string;
  title: string;
}

interface Props {
  services: ServiceOption[];
}

const inputClass =
  "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";

export function HeroForm({ services }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("formLoadedAt", String(loadedAt.current));
        startTransition(async () => {
          const r = await sendLead(fd);
          setResult(r);
          if (r.ok) formRef.current?.reset();
        });
      }}
      className="surface-elevated relative rounded-2xl p-7"
    >
      <p className="text-lg font-bold text-[#0c1c40]">
        ¡Te ayudamos a crecer!
      </p>
      <p className="mt-1 text-sm text-slate-800">
        Una persona del equipo contactará contigo en menos de 24 horas.
      </p>

      <div className="mt-6 space-y-4">
        <Field name="name" label="Nombre" placeholder="Tu nombre" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="email"
            label="Email"
            type="email"
            placeholder="tu@email.com"
            required
          />
          <Field
            name="phone"
            label="Teléfono"
            type="tel"
            placeholder="+34 600 000 000"
            required
          />
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Servicio de interés <span className="text-accent">*</span>
          </span>
          <select
            name="service"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona un servicio
            </option>
            {services.map((s) => (
              <option key={s.slug} value={s.title}>
                {s.title}
              </option>
            ))}
            <option value="Varios servicios">Varios servicios</option>
            <option value="Busco recomendaciones">
              Busco recomendaciones
            </option>
          </select>
        </label>
      </div>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_12px_32px_-6px_rgba(24,123,239,0.7)] disabled:opacity-60"
      >
        {pending ? "Enviando…" : "¡Quiero crear algo increíble!"}
        {!pending && (
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7h8m0 0L7 3m4 4l-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-3 min-h-[1.25rem]"
      >
        {result && (
          <p
            className={`text-sm ${
              result.ok ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {result.ok
              ? "¡Enviado! Te respondemos en menos de 24h."
              : result.error}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        {label} {required && <span>*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}
