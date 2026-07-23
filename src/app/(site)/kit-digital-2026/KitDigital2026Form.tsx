"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { appendUtms } from "@/lib/utm";
import { requestKitDigital2026 } from "@/lib/kit-digital-2026-action";

const SERVICES = [
  "Web",
  "SEO",
  "Redes sociales",
  "Ordenador / puesto de trabajo",
  "No lo sé, asesoradme",
];

const SECTORS = [
  "Hostelería/restauración",
  "Comercio/retail",
  "Salud/clínicas",
  "Servicios profesionales",
  "Belleza/estética",
  "Deporte/fitness",
  "Construcción/reformas",
  "Inmobiliaria",
  "Educación/formación",
  "Otro",
];

const EMPLOYEE_RANGES = ["1-2", "3-9", "10-49", "50 o más"];

const inputClass =
  "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";
const labelClass = "text-xs font-bold uppercase tracking-wider text-accent";

/** Pill-style checkbox for multi-select groups (services, sectors). */
function CheckPill({ name, value }: { name: string; value: string }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <span className="inline-flex items-center rounded-full border border-border-strong bg-bg-subtle px-3.5 py-1.5 text-sm text-fg transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
        {value}
      </span>
    </label>
  );
}

export function KitDigital2026Form() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null,
  );
  const [businessType, setBusinessType] = useState<"pyme" | "autonomo" | "">("");
  const [consent, setConsent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  if (result?.ok) {
    return (
      <div className="surface-elevated rounded-3xl p-8 text-center">
        <p className="text-3xl">🎉</p>
        <h2 className="mt-3 text-2xl font-bold text-[#0c1c40]">¡Listo!</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Ya estás en la lista. Te avisaremos en cuanto el Kit Digital se
          reactive y nos encargaremos de tu tramitación.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("formLoadedAt", String(loadedAt.current));
        appendUtms(fd);
        startTransition(async () => {
          const r = await requestKitDigital2026(fd);
          setResult(r);
        });
      }}
      className="surface-elevated relative rounded-3xl p-7 sm:p-9"
    >
      <p className="text-2xl font-bold leading-tight text-[#0c1c40]">
        Apúntate a la lista
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Déjanos tus datos y te avisamos en cuanto el Kit Digital se reactive. Sin
        compromiso.
      </p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className={labelClass}>Nombre *</span>
          <input name="name" required placeholder="Tu nombre" className={inputClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Teléfono *</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="Tu mejor teléfono"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Email *</span>
            <input
              name="email"
              type="email"
              required
              placeholder="Tu mejor email"
              className={inputClass}
            />
          </label>
        </div>

        {/* Servicios de interés (multi) */}
        <fieldset>
          <legend className={labelClass}>¿Qué servicio te interesa? *</legend>
          <p className="mt-1 text-xs text-slate-500">Puedes elegir varios.</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <CheckPill key={s} name="services" value={s} />
            ))}
          </div>
        </fieldset>

        {/* Pyme o autónomo */}
        <fieldset>
          <legend className={labelClass}>¿Eres pyme o autónomo? *</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(["pyme", "autonomo"] as const).map((t) => (
              <label key={t} className="cursor-pointer">
                <input
                  type="radio"
                  name="businessType"
                  value={t}
                  required
                  checked={businessType === t}
                  onChange={() => setBusinessType(t)}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full border border-border-strong bg-bg-subtle px-4 py-1.5 text-sm text-fg transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white">
                  {t === "pyme" ? "Pyme" : "Autónomo"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Condicional: empleados (pyme) */}
        {businessType === "pyme" && (
          <label className="block">
            <span className={labelClass}>Número de empleados *</span>
            <select name="employees" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Elige un tramo
              </option>
              {EMPLOYEE_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Condicional: antigüedad (autónomo) */}
        {businessType === "autonomo" && (
          <fieldset>
            <legend className={labelClass}>¿Cuánto llevas dado de alta? *</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {["menos de 6 meses", "más de 6 meses"].map((s) => (
                <label key={s} className="cursor-pointer">
                  <input
                    type="radio"
                    name="seniority"
                    value={s}
                    required
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center rounded-full border border-border-strong bg-bg-subtle px-4 py-1.5 text-sm capitalize text-fg transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white">
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Sector (multi, opcional) */}
        <fieldset>
          <legend className={labelClass}>¿A qué sector te dedicas?</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <CheckPill key={s} name="sectors" value={s} />
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            He leído y acepto la{" "}
            <Link href="/privacidad" className="font-semibold text-accent hover:underline">
              política de privacidad
            </Link>{" "}
            y el envío de comunicaciones comerciales.
          </span>
        </label>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <button
        type="submit"
        disabled={pending || !consent}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_12px_32px_-6px_rgba(24,123,239,0.7)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Avísame cuando abra"}
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
        {result && !result.ok && (
          <p className="text-sm text-red-600">{result.error}</p>
        )}
      </div>
    </form>
  );
}
