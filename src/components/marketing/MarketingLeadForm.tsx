"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { appendUtms } from "@/lib/utm";
import { sendMarketingLead } from "@/lib/marketing-lead-action";
import { track, pushUserData } from "@/lib/gtm";
import {
  BUDGET_LABEL,
  BUDGET_OPTIONS,
  type MarketingLanding,
} from "@/lib/marketing-landings";

interface Props {
  landing: MarketingLanding;
  /** Identificador del punto del embudo donde está el form (hero, cta_final…). */
  formLocation: string;
}

const inputClass =
  "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";

export function MarketingLeadForm({ landing, formLocation }: Props) {
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
        appendUtms(fd);
        fd.set("origin", landing.origin);
        startTransition(async () => {
          const r = await sendMarketingLead(fd);
          setResult(r);
          if (r.ok) {
            pushUserData({
              phone: String(fd.get("phone") ?? ""),
              email: String(fd.get("email") ?? ""),
            });
            track("generate_lead", {
              form_location: formLocation,
              landing: landing.key,
              business_type: String(fd.get("businessType") ?? ""),
              budget: String(fd.get("budget") ?? ""),
            });
            formRef.current?.reset();
          }
        });
      }}
      className="surface-elevated relative rounded-2xl p-6 sm:p-7"
    >
      <p className="text-xl font-bold leading-tight text-[#0c1c40]">
        {landing.formTitle}
      </p>
      <p className="mt-2 text-sm text-slate-700">{landing.formSubtitle}</p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Nombre <span aria-hidden>*</span>
          </span>
          <input
            name="name"
            type="text"
            required
            placeholder="Tu nombre"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Teléfono <span aria-hidden>*</span>
          </span>
          <input
            name="phone"
            type="tel"
            required
            placeholder="+34 600 000 000"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            {landing.typeLabel} <span aria-hidden>*</span>
          </span>
          <select name="businessType" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              {landing.typePlaceholder}
            </option>
            {landing.typeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-wider text-accent">
            {BUDGET_LABEL} <span aria-hidden>*</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {BUDGET_OPTIONS.map((opt, i) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center justify-center rounded-md border border-slate-300 px-3 py-2.5 text-center text-[13px] font-medium leading-tight text-slate-700 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-semibold has-[:checked]:text-accent-hover"
              >
                <input
                  type="radio"
                  name="budget"
                  value={opt}
                  required={i === 0}
                  className="sr-only"
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Email <span className="font-medium normal-case tracking-normal">(opcional)</span>
          </span>
          <input
            name="email"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            className={inputClass}
          />
        </label>
      </div>

      {/* Honeypot antispam — invisible para usuarios reales. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_12px_32px_-6px_rgba(24,123,239,0.7)] disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Quiero más información"}
        {!pending && (
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
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

      <p className="mt-3 text-center text-xs text-slate-500">
        Sin compromiso. Te llamamos en menos de 24h.
      </p>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-2 min-h-[1.25rem]"
      >
        {result && (
          <p
            className={`text-sm ${
              result.ok ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {result.ok
              ? "¡Recibido! Te llamamos en menos de 24h."
              : result.error}
          </p>
        )}
      </div>
    </form>
  );
}
