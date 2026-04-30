"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendLead } from "@/lib/lead-action";

interface ServiceOption {
  slug: string;
  title: string;
}

interface Props {
  services: ServiceOption[];
}

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
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f2331] via-[#181b25] to-[#0f1218] p-7 shadow-[0_0_60px_-12px_rgba(24,123,239,0.45),0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-[--color-accent]/30"
    >
      {/* Línea azul superior decorativa */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[--color-accent] to-transparent"
      />
      {/* Glow interno sutil */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(24,123,239,0.12), transparent 70%)",
        }}
      />
      <p className="text-lg font-semibold text-[--color-fg]">
        Déjanos ayudarte a crear algo increíble
      </p>
      <p className="mt-1 text-sm text-[--color-fg-muted]">
        Te contestamos en menos de 24 horas.
      </p>

      <div className="mt-6 space-y-4">
        <Field name="name" label="Nombre" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="phone" label="Teléfono" type="tel" required />

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-[--color-fg-muted]">
            Servicio de interés <span className="text-[--color-accent]">*</span>
          </span>
          <select
            name="service"
            required
            defaultValue=""
            className="mt-1.5 block w-full rounded-md border border-[--color-border-strong] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
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

      <Button type="submit" disabled={pending} size="lg" className="mt-6 w-full">
        {pending ? "Enviando…" : "Hablemos"}
      </Button>

      {result && (
        <p
          className={`mt-3 text-sm ${result.ok ? "text-emerald-400" : "text-red-400"}`}
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
      <span className="text-xs font-medium uppercase tracking-wider text-[--color-fg-muted]">
        {label} {required && <span className="text-[--color-accent]">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1.5 block w-full rounded-md border border-[--color-border-strong] bg-[--color-bg] px-3 py-2.5 text-sm text-[--color-fg] placeholder:text-[--color-fg-dim] focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
      />
    </label>
  );
}
