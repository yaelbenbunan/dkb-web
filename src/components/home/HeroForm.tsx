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
  "mt-1.5 block w-full rounded-md bg-[#f5f6f9] px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 transition-shadow focus:outline-none focus:ring-2 focus:ring-[--color-accent] focus:bg-white";

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
      className="relative rounded-2xl bg-white p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),0_0_60px_-10px_rgba(24,123,239,0.4)]"
    >
      <p className="text-lg font-bold text-slate-900">
        Déjanos ayudarte a crear algo increíble
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Te contestamos en menos de 24 horas.
      </p>

      <div className="mt-6 space-y-4">
        <Field name="name" label="Nombre" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="phone" label="Teléfono" type="tel" required />

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Servicio de interés <span className="text-[--color-accent]">*</span>
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
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[--color-accent] px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:bg-[--color-accent-hover] hover:shadow-[0_12px_32px_-6px_rgba(24,123,239,0.7)] disabled:opacity-60"
      >
        {pending ? "Enviando…" : "¡Quiero hacer algo increíble!"}
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

      {result && (
        <p
          className={`mt-3 text-sm ${
            result.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {result.ok
            ? "¡Enviado! Te respondemos en menos de 24h."
            : result.error}
        </p>
      )}
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label} {required && <span className="text-[--color-accent]">*</span>}
      </span>
      <input name={name} type={type} required={required} className={inputClass} />
    </label>
  );
}
