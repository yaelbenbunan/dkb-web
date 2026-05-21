"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendCallRequest } from "@/lib/call-request-action";
import { track } from "@/lib/gtm";

interface Props {
  serviceTitle: string;
}

const inputClass =
  "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";

export function ServiceCtaForm({ serviceTitle }: Props) {
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
        fd.set("service", serviceTitle);
        startTransition(async () => {
          const r = await sendCallRequest(fd);
          setResult(r);
          if (r.ok) {
            track("generate_lead", {
              form_location: "service_sidebar",
              service: serviceTitle,
            });
            formRef.current?.reset();
          }
        });
      }}
      className="surface-elevated relative rounded-2xl p-7"
    >
      <p className="text-xl font-bold leading-tight text-[#0c1c40]">
        ¿Hablamos de tu proyecto?
      </p>
      <p className="mt-2 text-sm text-slate-800">
        Déjanos tus datos y te llamamos en menos de 24h.
      </p>

      <div className="mt-6 space-y-4">
        <Field name="name" label="Nombre" placeholder="Tu nombre" required />
        <Field
          name="phone"
          label="Teléfono"
          type="tel"
          placeholder="+34 600 000 000"
          required
        />
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
        {pending ? "Enviando…" : "Solicitar llamada"}
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
              ? "¡Recibido! Te llamamos en menos de 24h."
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
