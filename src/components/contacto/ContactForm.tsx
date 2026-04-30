"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendContactEmail } from "@/lib/contact-action";

export function ContactForm() {
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
          const r = await sendContactEmail(fd);
          setResult(r);
          if (r.ok) formRef.current?.reset();
        });
      }}
      className="space-y-4"
    >
      <Field name="name" label="Nombre" required />
      <Field name="email" label="Email" type="email" required />
      <Field name="company" label="Empresa (opcional)" />
      <Field name="message" label="Mensaje" textarea required />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Enviando…" : "Enviar"}
      </Button>
      {result && (
        <p className={result.ok ? "text-emerald-700" : "text-red-700"}>
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
  textarea,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <Tag
        name={name}
        type={textarea ? undefined : type}
        required={required}
        rows={textarea ? 5 : undefined}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
      />
    </label>
  );
}
