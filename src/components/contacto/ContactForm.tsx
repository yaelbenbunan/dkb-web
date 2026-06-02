"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { sendContactEmail } from "@/lib/contact-action";
import { SOURCE_OPTIONS, CONTACT_INFO } from "@/lib/contact-info";
import { track, pushUserData } from "@/lib/gtm";
import type {
  ContactActionResult,
  ContactFieldErrors,
  ContactFieldName,
} from "@/lib/validation";

interface Props {
  services: { slug: string; title: string }[];
}

export function ContactForm({ services }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ContactActionResult | null>(null);
  const [touched, setTouched] = useState<Set<ContactFieldName>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  const fieldErrors: ContactFieldErrors = result?.fieldErrors ?? {};
  const errorFor = (name: ContactFieldName) =>
    touched.has(name) ? undefined : fieldErrors[name];

  const handleFieldChange = (name: ContactFieldName) => {
    if (fieldErrors[name] && !touched.has(name)) {
      setTouched((prev) => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });
    }
  };

  return (
    <div className="surface-elevated relative rounded-3xl p-8 sm:p-10">
      <form
        ref={formRef}
        noValidate
        action={(fd) => {
          fd.set("formLoadedAt", String(loadedAt.current));
          setTouched(new Set());
          startTransition(async () => {
            const r = await sendContactEmail(fd);
            setResult(r);
            if (r.ok) {
              pushUserData({
                email: String(fd.get("email") ?? ""),
                phone: String(fd.get("phone") ?? ""),
              });
              track("generate_lead", { form_location: "contact_long" });
              formRef.current?.reset();
            }
          });
        }}
        className="space-y-5"
      >
        <Field
          name="name"
          label="Nombre completo"
          placeholder="Tu nombre"
          required
          error={errorFor("name")}
          onChange={() => handleFieldChange("name")}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="phone"
            label="Teléfono"
            type="tel"
            placeholder="+34 600 000 000"
            required
            error={errorFor("phone")}
            onChange={() => handleFieldChange("phone")}
          />
          <Field
            name="email"
            label="Email"
            type="email"
            placeholder="tu@email.com"
            required
            error={errorFor("email")}
            onChange={() => handleFieldChange("email")}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="service"
            label="¿Qué servicio te interesa?"
            required
            placeholder="Selecciona un servicio"
            error={errorFor("service")}
            onChange={() => handleFieldChange("service")}
            options={[
              ...services.map((s) => ({ value: s.title, label: s.title })),
              { value: "Varios servicios", label: "Varios servicios" },
              { value: "Busco recomendaciones", label: "Busco recomendaciones" },
            ]}
          />
          <SelectField
            name="source"
            label="¿Cómo nos has conocido?"
            required
            placeholder="Selecciona una opción"
            error={errorFor("source")}
            onChange={() => handleFieldChange("source")}
            options={SOURCE_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>

        <TextareaField
          name="message"
          label="Mensaje"
          rows={5}
          error={errorFor("message")}
          onChange={() => handleFieldChange("message")}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-3 pt-2">
            <input
              type="checkbox"
              name="privacy"
              required
              aria-invalid={errorFor("privacy") ? true : undefined}
              aria-describedby={
                errorFor("privacy") ? "privacy-error" : undefined
              }
              onChange={() => handleFieldChange("privacy")}
              className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-accent focus:ring-accent"
            />
            <span className="text-xs leading-relaxed text-slate-800">
              Al enviar este formulario aceptas nuestra{" "}
              <Link
                href="/privacidad"
                className="font-semibold text-accent hover:underline"
              >
                Política de privacidad
              </Link>
              . No compartimos tus datos con terceros.
            </span>
          </label>
          {errorFor("privacy") && (
            <p
              id="privacy-error"
              className="mt-1.5 text-xs font-medium text-red-600"
            >
              {errorFor("privacy")}
            </p>
          )}
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
          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_12px_32px_-6px_rgba(24,123,239,0.7)] disabled:opacity-60"
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

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="min-h-[1.25rem]"
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

      <p className="mt-6 border-t border-accent/20 pt-6 text-sm text-slate-800">
        ¿Prefieres hablar directamente?{" "}
        <a
          href={CONTACT_INFO.calendly}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent hover:text-accent-hover"
        >
          👉 Agenda una llamada
        </a>
      </p>
    </div>
  );
}

const inputBase =
  "surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm";
const inputError = "ring-2 ring-red-500 focus:ring-red-500";

function fieldClass(error?: string) {
  return error ? `${inputBase} ${inputError}` : inputBase;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  error,
  onChange,
}: {
  name: ContactFieldName;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  onChange?: () => void;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
        className={fieldClass(error)}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function TextareaField({
  name,
  label,
  rows = 5,
  error,
  onChange,
}: {
  name: ContactFieldName;
  label: string;
  rows?: number;
  error?: string;
  onChange?: () => void;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        {label} <span className="text-accent">*</span>
      </span>
      <textarea
        name={name}
        required
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
        className={fieldClass(error)}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function SelectField({
  name,
  label,
  required,
  placeholder,
  options,
  error,
  onChange,
}: {
  name: ContactFieldName;
  label: string;
  required?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
  error?: string;
  onChange?: () => void;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
        className={fieldClass(error)}
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
      <FieldError id={errorId} message={error} />
    </label>
  );
}
