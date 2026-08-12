"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { appendUtms } from "@/lib/utm";
import { track, pushUserData } from "@/lib/gtm";
import { requestWebExpress } from "@/lib/web-express-action";
import { ConsentCheckbox } from "@/components/forms/ConsentCheckbox";
import { CONTACT_INFO } from "@/lib/contact-info";
import {
  CONTACT_METHODS,
  TIME_SLOTS,
  DECISION_MAKER,
  URGENCY,
  GOALS,
  PRACTICE_STAGE,
  type WebExpressLanding,
} from "@/lib/web-express-landings";

const input =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-accent";
const legend = "text-xs font-bold uppercase tracking-wider text-accent";

/** Opción tipo pastilla: la casilla real queda oculta y la etiqueta es el botón. */
function Pill({
  name,
  value,
  type,
  checked,
}: {
  name: string;
  value: string;
  type: "radio" | "checkbox";
  checked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2.5 text-center text-[13px] font-medium leading-tight text-slate-700 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-semibold has-[:checked]:text-accent-hover">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={checked}
        required={type === "radio" && !checked ? undefined : undefined}
        className="sr-only"
      />
      {value}
    </label>
  );
}

/**
 * Al terminar, el botón que se ofrece es el del canal que la propia persona
 * eligió: si dijo WhatsApp le damos WhatsApp, no un teléfono que no va a usar.
 */
function successCta(method: string): { label: string; href: string } {
  if (method === "Llamada telefónica") {
    return { label: `Llamar ahora: ${CONTACT_INFO.phone}`, href: `tel:${CONTACT_INFO.phoneE164}` };
  }
  if (method === "Email") {
    return { label: "Escribirnos un correo", href: `mailto:${CONTACT_INFO.email}` };
  }
  return { label: "Escribirnos por WhatsApp", href: CONTACT_INFO.socials.whatsapp };
}

export function WebExpressForm({ landing }: { landing: WebExpressLanding }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ method: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  if (done) {
    const cta = successCta(done.method);
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl">
          ✅
        </div>
        <p className="mt-4 text-xl font-bold text-slate-900">¡Solicitud recibida!</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Te contactamos por <strong>{done.method.toLowerCase()}</strong> en menos de 24 horas
          laborables. Mientras tanto, te hemos enviado un correo con los siguientes pasos.
        </p>
        <p className="mt-5 text-sm font-semibold text-slate-900">
          ¿Prefieres no esperar?
        </p>
        <a
          href={cta.href}
          className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {cta.label}
        </a>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("formLoadedAt", String(loadedAt.current));
        fd.set("origin", landing.origin);
        fd.set("campaign", landing.campaign);
        appendUtms(fd);
        setError(null);
        startTransition(async () => {
          const res = await requestWebExpress(fd);
          if (!res.ok) {
            setError(res.error ?? "No se pudo enviar. Inténtalo de nuevo.");
            return;
          }
          pushUserData({
            email: String(fd.get("email") ?? ""),
            phone: String(fd.get("phone") ?? ""),
          });
          track("generate_lead", { form_location: landing.key });
          setDone({ method: String(fd.get("contactMethod") ?? "WhatsApp") });
        });
      }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
    >
      <p className="text-lg font-bold text-slate-900">{landing.formTitle}</p>
      <p className="mt-1 text-sm text-slate-600">{landing.formSubtitle}</p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className={legend}>Nombre y apellidos *</span>
          <input name="name" required placeholder="Tu nombre y apellidos" className={input} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={legend}>Teléfono *</span>
            <input
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              // Mismo criterio que valida el servidor: avisa antes de enviar.
              pattern="^(?:\+34[\s.\-]?)?[6-9](?:[\s.\-]?\d){8}$"
              title="Escribe un teléfono español de 9 dígitos"
              placeholder="600 000 000"
              className={input}
            />
          </label>
          <label className="block">
            <span className={legend}>Tu mejor correo *</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className={input}
            />
          </label>
        </div>

        <fieldset>
          <legend className={legend}>¿Cómo prefieres que te contactemos? *</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CONTACT_METHODS.map((m, i) => (
              <Pill key={m} name="contactMethod" value={m} type="radio" checked={i === 0} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>¿En qué franja horaria? *</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((t, i) => (
              <Pill key={t} name="timeSlot" value={t} type="radio" checked={i === 0} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>¿Decides tú sobre la web? *</legend>
          <div className="mt-2 grid gap-2">
            {DECISION_MAKER.map((d, i) => (
              <Pill key={d} name="decisionMaker" value={d} type="radio" checked={i === 0} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>¿Para cuándo la necesitas? *</legend>
          <div className="mt-2 grid gap-2">
            {URGENCY.map((u, i) => (
              <Pill key={u} name="urgency" value={u} type="radio" checked={i === 0} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>{landing.goalsLabel} *</legend>
          <div className="mt-2 grid gap-2">
            {GOALS.map((g, i) => (
              <Pill key={g} name="goals" value={g} type="checkbox" checked={i === 1} />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>{landing.stageLabel}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PRACTICE_STAGE.map((s) => (
              <Pill key={s} name="stage" value={s} type="radio" />
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className={legend}>¿Tienes web actual? (opcional)</span>
          <input
            name="currentWebsite"
            placeholder="www.tuconsulta.es — déjalo vacío si no tienes"
            className={input}
          />
        </label>
      </div>

      <ConsentCheckbox className="mt-5" />

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent px-6 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Quiero mi web"}
      </button>

      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="mt-3 text-center text-xs text-slate-500">
        Sin compromiso. Te contactamos solo por donde nos digas.
      </p>
    </form>
  );
}
