"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { requestKitDigital } from "@/lib/kit-digital-action";

interface Props {
  deviceOptions: string[];
  /** Modelo preseleccionado (desde la ficha de un equipo). */
  defaultDevice?: string;
}

const inputClass =
  "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";
const labelClass =
  "text-xs font-bold uppercase tracking-wider text-accent";

export function KitDigitalForm({ deviceOptions, defaultDevice }: Props) {
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
          const r = await requestKitDigital(fd);
          setResult(r);
          if (r.ok) formRef.current?.reset();
        });
      }}
      className="surface-elevated relative rounded-3xl p-7 sm:p-9"
    >
      <p className="text-2xl font-bold leading-tight text-[#0c1c40]">
        Solicita tu ordenador
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Completa el formulario y te ayudamos a tramitar tu Bono del Kit Digital.
        Sin compromiso.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className={labelClass}>Nombre completo *</span>
          <input name="name" required placeholder="Tu nombre" className={inputClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Email *</span>
            <input
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Teléfono *</span>
            <input
              name="phone"
              type="tel"
              required
              placeholder="+34 600 000 000"
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Modelo de ordenador *</span>
          <select
            name="device"
            required
            defaultValue={
              defaultDevice && deviceOptions.includes(defaultDevice)
                ? defaultDevice
                : ""
            }
            className={inputClass}
          >
            <option value="" disabled>
              Elige un modelo
            </option>
            {deviceOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Honeypot */}
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
        {pending ? "Enviando…" : "Solicitar mi ordenador"}
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

      <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 min-h-[1.25rem]">
        {result && (
          <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
            {result.ok
              ? "¡Recibido! Te contactamos en menos de 24h para tramitar tu bono."
              : result.error}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Al enviar aceptas nuestra{" "}
        <a href="/privacidad" className="font-semibold text-accent hover:underline">
          Política de privacidad
        </a>
        .
      </p>
    </form>
  );
}
