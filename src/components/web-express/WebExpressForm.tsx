"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { appendUtms } from "@/lib/utm";
import { track, pushUserData } from "@/lib/gtm";
import { requestWebExpress } from "@/lib/web-express-action";
import { CONTACT_INFO } from "@/lib/contact-info";
import {
  CONTACT_METHODS,
  TIME_SLOTS,
  DECISION_MAKER,
  URGENCY,
  GOALS,
  PRACTICE_STAGE,
  shortLabel,
  WEB_EXPRESS_TERMS_PATH,
  WEB_EXPRESS_PRICE,
  type WebExpressLanding,
} from "@/lib/web-express-landings";

/**
 * Colores fijos, no tokens del tema. La landing tiene su propia paleta para que
 * no dependa del modo claro/oscuro del visitante: con tokens, este formulario
 * blanco acababa con texto casi blanco encima.
 */
const INK = "#0B1020";
const ACCENT = "#187bef";
const MUTED = "#5A6178";

const inputClass =
  "mt-1.5 block w-full rounded-xl border px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#187bef]";
const inputStyle = { borderColor: "rgba(11,16,32,.16)", color: INK, background: "#fff" } as const;
const legendClass = "text-[13px] font-bold uppercase tracking-[0.08em]";
const legendStyle = { color: MUTED } as const;

/**
 * Opción tipo pastilla. La casilla real queda oculta y la etiqueta hace de
 * botón.
 *
 * Ancho de contenido, no de rejilla: en rejilla todas se estiraban al mismo
 * ancho y cada grupo ocupaba varias filas aunque las etiquetas fueran cortas.
 * Así la mayoría de grupos entra en una sola línea.
 *
 * Al marcarla, tinta oscura sobre tinte del acento. Una versión anterior
 * pintaba claro sobre claro y la opción elegida era la menos legible de todas.
 */
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
    <label
      className={
        "inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-[rgba(11,16,32,.14)] bg-white px-4 py-2 " +
        "text-center text-[14px] font-semibold leading-tight text-[#5A6178] transition-all " +
        "has-[:checked]:border-[#187bef] has-[:checked]:bg-[#E7F1FE] has-[:checked]:font-bold has-[:checked]:text-[#0B1020]"
      }
    >
      <input type={type} name={name} value={value} defaultChecked={checked} className="sr-only" />
      {shortLabel(value)}
    </label>
  );
}

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
        className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center"
        style={{ border: "1px solid rgba(11,16,32,.09)", boxShadow: "0 20px 50px -30px rgba(11,16,32,.5)" }}
        role="status"
        aria-live="polite"
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "rgba(24,123,239,.12)" }}
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M4 12.5l5.5 5.5L20 7" stroke={ACCENT} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-5 text-2xl font-black" style={{ color: INK }}>
          ¡Solicitud recibida!
        </p>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Te contactamos por <strong style={{ color: INK }}>{done.method.toLowerCase()}</strong> en
          menos de 24 horas laborables. Mientras tanto, te hemos enviado un correo con los
          siguientes pasos.
        </p>
        <p className="mt-6 text-sm font-bold" style={{ color: INK }}>
          ¿Prefieres no esperar?
        </p>
        <a
          href={cta.href}
          className="mt-3 inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-bold transition-transform hover:-translate-y-0.5"
          style={{ background: ACCENT, color: "#fff" }}
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
      className="rounded-3xl bg-white p-7 sm:p-10"
      style={{ border: "1px solid rgba(11,16,32,.09)", boxShadow: "0 24px 60px -40px rgba(11,16,32,.55)" }}
    >
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: INK }}>
          {landing.formTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px]" style={{ color: MUTED }}>
          {landing.formSubtitle}
        </p>
      </div>

      {/* Dos columnas: el formulario tiene 8 preguntas y en una sola columna
          quedaba interminable. Repartido, entra casi entero en pantalla. */}
      <div className="mt-9 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <label className="block">
            <span className={legendClass} style={legendStyle}>
              Nombre y apellidos *
            </span>
            <input
              name="name"
              required
              placeholder="Tu nombre y apellidos"
              className={inputClass}
              style={inputStyle}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={legendClass} style={legendStyle}>
                Teléfono *
              </span>
              <input
                name="phone"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                pattern="^(?:\+34[\s.\-]?)?[6-9](?:[\s.\-]?\d){8}$"
                title="Escribe un teléfono español de 9 dígitos"
                placeholder="600 000 000"
                className={inputClass}
                style={inputStyle}
              />
            </label>
            <label className="block">
              <span className={legendClass} style={legendStyle}>
                Tu mejor correo *
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                className={inputClass}
                style={inputStyle}
              />
            </label>
          </div>

          <fieldset>
            <legend className={legendClass} style={legendStyle}>
              ¿Cómo prefieres que te contactemos? *
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONTACT_METHODS.map((m, i) => (
                <Pill key={m} name="contactMethod" value={m} type="radio" checked={i === 0} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass} style={legendStyle}>
              ¿En qué franja horaria? *
            </legend>
            <p className="mt-1.5 text-[13px]" style={{ color: MUTED }}>
              Mañanas 9-14h · Mediodía 14-16h · Tardes desde las 16h
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_SLOTS.map((t, i) => (
                <Pill key={t} name="timeSlot" value={t} type="radio" checked={i === 0} />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className={legendClass} style={legendStyle}>
              ¿Decides tú sobre la web? *
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DECISION_MAKER.map((d, i) => (
                <Pill key={d} name="decisionMaker" value={d} type="radio" checked={i === 0} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass} style={legendStyle}>
              ¿Para cuándo la necesitas? *
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {URGENCY.map((u, i) => (
                <Pill key={u} name="urgency" value={u} type="radio" checked={i === 0} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass} style={legendStyle}>
              {landing.goalsLabel} *
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOALS.map((g, i) => (
                <Pill key={g} name="goals" value={g} type="checkbox" checked={i === 1} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass} style={legendStyle}>
              {landing.stageLabel}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRACTICE_STAGE.map((s) => (
                <Pill key={s} name="stage" value={s} type="radio" />
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className={legendClass} style={legendStyle}>
              ¿Tienes web actual?
            </span>
            <input
              name="currentWebsite"
              placeholder="www.tuconsulta.es"
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      <label
        className="mt-8 flex items-start gap-2.5 text-[13px] leading-relaxed"
        style={{ color: MUTED }}
      >
        <input
          type="checkbox"
          name="consent"
          value="on"
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ accentColor: ACCENT }}
        />
        <span>Acepto recibir comunicaciones comerciales de dinkbit.</span>
      </label>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

      <button
        type="submit"
        disabled={pending}
        className="mt-7 inline-flex items-center justify-center rounded-xl px-10 py-3.5 text-base font-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: ACCENT, color: "#fff", boxShadow: "0 12px 28px -14px rgba(24,123,239,.9)" }}
      >
        {pending ? "Enviando…" : `Quiero mi web por ${WEB_EXPRESS_PRICE}`}
      </button>

      {error && (
        <p className="mt-3 text-center text-sm font-bold text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="mt-3 text-center text-[13px]" style={{ color: MUTED }}>
        Sin compromiso. Te contactamos solo por donde nos digas. Consulta las{" "}
        <a href={WEB_EXPRESS_TERMS_PATH} className="underline underline-offset-2">
          condiciones del servicio
        </a>
        .
      </p>
    </form>
  );
}
