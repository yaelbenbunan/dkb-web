"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { sendContactEmail } from "@/lib/contact-action";
import { SOURCE_OPTIONS, CONTACT_INFO } from "@/lib/contact-info";

interface Props {
  services: { slug: string; title: string }[];
}

export function ContactForm({ services }: Props) {
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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f2331] via-[#181b25] to-[#0f1218] p-8 ring-1 ring-[--color-accent]/30 shadow-[0_0_60px_-12px_rgba(24,123,239,0.35)] sm:p-10">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[--color-accent] to-transparent"
      />
      <form
        ref={formRef}
        action={(fd) => {
          fd.set("formLoadedAt", String(loadedAt.current));
          startTransition(async () => {
            const r = await sendContactEmail(fd);
            setResult(r);
            if (r.ok) formRef.current?.reset();
          });
        }}
        className="space-y-5"
      >
        <Field name="name" label="Nombre completo" required />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="phone" label="Teléfono" type="tel" required />
          <Field name="email" label="Email" type="email" required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="service"
            label="¿Qué servicio te interesa?"
            required
            placeholder="Selecciona un servicio"
            options={services.map((s) => ({ value: s.title, label: s.title }))}
          />
          <SelectField
            name="source"
            label="¿Cómo nos has conocido?"
            required
            placeholder="Selecciona una opción"
            options={SOURCE_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>

        <TextareaField name="message" label="Mensaje" rows={5} />

        <label className="flex cursor-pointer items-start gap-3 pt-2">
          <input
            type="checkbox"
            name="privacy"
            required
            className="mt-1 h-4 w-4 rounded border-[--color-border-strong] bg-[--color-bg] text-[--color-accent] focus:ring-[--color-accent]"
          />
          <span className="text-xs leading-relaxed text-[--color-fg-muted]">
            Al enviar este formulario aceptas nuestra{" "}
            <Link
              href="/privacidad"
              className="text-[--color-accent] hover:underline"
            >
              Política de privacidad
            </Link>
            . No compartimos tus datos con terceros.
          </span>
        </label>

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
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#187bef] px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:bg-[#3a90f2] hover:shadow-[0_12px_32px_-6px_rgba(24,123,239,0.7)] disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar mensaje"}
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
            className={`text-sm ${
              result.ok ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {result.ok
              ? "¡Enviado! Te respondemos en menos de 24h."
              : result.error}
          </p>
        )}
      </form>

      <p className="mt-6 border-t border-[--color-border] pt-6 text-sm text-[--color-fg-muted]">
        ¿Prefieres hablar directamente?{" "}
        <a
          href={CONTACT_INFO.calendly}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[--color-accent] hover:text-[--color-accent-hover]"
        >
          👉 Agenda una llamada
        </a>
      </p>
    </div>
  );
}

const inputClass =
  "mt-1.5 block w-full rounded-md bg-[#0a0c12] px-3 py-2.5 text-sm text-[--color-fg] placeholder:text-[--color-fg-dim] ring-1 ring-white/[0.06] transition-shadow focus:outline-none focus:ring-2 focus:ring-[--color-accent]";

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
      <span className="text-xs font-medium uppercase tracking-wider text-[--color-fg-muted]">
        {label} {required && <span className="text-[--color-accent]">*</span>}
      </span>
      <input name={name} type={type} required={required} className={inputClass} />
    </label>
  );
}

function TextareaField({
  name,
  label,
  rows = 5,
}: {
  name: string;
  label: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-[--color-fg-muted]">
        {label} <span className="text-[--color-accent]">*</span>
      </span>
      <textarea name={name} required rows={rows} className={inputClass} />
    </label>
  );
}

function SelectField({
  name,
  label,
  required,
  placeholder,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-[--color-fg-muted]">
        {label} {required && <span className="text-[--color-accent]">*</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className={inputClass}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
