"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { subscribePromo } from "@/lib/promo-subscribe-action";
import { appendUtms } from "@/lib/utm";

/**
 * Formulario de captación de email de la promo (email + consentimiento +
 * honeypot). Reutilizado por el popup (PromoPopup) y por la landing
 * `/promo-verano`. Al enviarse con éxito muestra su propio estado de "listo" y
 * avisa al contenedor vía `onSuccess` (el popup lo usa para marcar frecuencia).
 */
export function PromoEmailForm({
  onSuccess,
  submitLabel = "Quiero mi 50% de descuento",
}: {
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  // El formulario se considera "cargado" al montarse: alimenta el time-trap.
  const loadedAt = useRef(Date.now());

  const onSubmit = (formData: FormData) => {
    setError(null);
    formData.set("formLoadedAt", String(loadedAt.current));
    appendUtms(formData);
    startTransition(async () => {
      const res = await subscribePromo(formData);
      if (res.ok) {
        setDone(true);
        onSuccess?.();
      } else {
        setError(res.error ?? "No se pudo completar. Inténtalo de nuevo.");
      }
    });
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-2xl">📩</p>
        <h2 className="mt-2 text-xl font-bold text-fg">¡Listo!</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Revisa tu correo: te hemos enviado los detalles de la promoción de verano.
        </p>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {/* Honeypot: invisible para humanos */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <input
        type="text"
        name="name"
        required
        autoComplete="given-name"
        placeholder="Tu nombre"
        aria-label="Tu nombre"
        className="h-11 rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
      />

      <input
        type="email"
        name="email"
        required
        placeholder="Tu email"
        aria-label="Tu email"
        className="h-11 rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
      />

      <input
        type="tel"
        name="phone"
        inputMode="tel"
        autoComplete="tel"
        placeholder="Tu teléfono (opcional)"
        aria-label="Tu teléfono (opcional)"
        className="h-11 rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
      />

      <label className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
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

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!consent || pending}
        className="h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Enviando…" : submitLabel}
      </button>
    </form>
  );
}
