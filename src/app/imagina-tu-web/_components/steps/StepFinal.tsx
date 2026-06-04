"use client";

import { isValidContactEmail, isValidContactPhone } from "@/lib/preview-validation";

interface Value {
  valueProp: string;
  name: string;
  email: string;
  phone: string;
  privacy: boolean;
  website: string; // honeypot
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
}

export function StepFinal({ value, onChange }: Props) {
  const set = <K extends keyof Value>(k: K, v: Value[K]) =>
    onChange({ ...value, [k]: v });

  // Live validation — show error only after the user has typed something.
  const phoneError =
    value.phone.length > 0 && !isValidContactPhone(value.phone)
      ? "Introduce un teléfono válido (9 dígitos para España, hasta 15 internacional)."
      : null;
  const emailError =
    value.email.length > 0 && !isValidContactEmail(value.email)
      ? "Introduce un email válido (ej. tu@email.com)."
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Toque personal y tus datos</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Te enviamos el preview y nos lo guardamos para hablar contigo.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
        <span aria-hidden className="text-base leading-tight">📞</span>
        <p className="text-fg-muted">
          <strong className="text-fg">Te llamamos en menos de 24h</strong> para
          enseñarte la propuesta completa y darte ideas para mejorar tu web —
          gratis y sin compromiso. Asegúrate de poner un{" "}
          <strong className="text-fg">teléfono y email correctos</strong>: te
          enviamos ahí el enlace al preview.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          ¿Por qué eres bueno en lo que haces? *
        </span>
        <textarea
          value={value.valueProp}
          onChange={(e) => set("valueProp", e.target.value)}
          rows={5}
          maxLength={800}
          placeholder="Ej. Hacemos asesoría fiscal personalizada con respuesta en 24h y precios cerrados desde el primer día."
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        />
        <span className="mt-1 block text-xs text-fg-muted">
          {value.valueProp.length}/800
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Nombre *
          </span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Teléfono *
          </span>
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+34 600 000 000"
            inputMode="tel"
            autoComplete="tel"
            className={`surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm ${
              phoneError ? "border-red-500/60" : ""
            }`}
          />
          {phoneError && (
            <span className="mt-1 block text-xs text-red-500">{phoneError}</span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Email *
        </span>
        <input
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="tu@email.com"
          inputMode="email"
          autoComplete="email"
          className={`surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm ${
            emailError ? "border-red-500/60" : ""
          }`}
        />
        {emailError && (
          <span className="mt-1 block text-xs text-red-500">{emailError}</span>
        )}
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.privacy}
          onChange={(e) => set("privacy", e.target.checked)}
          className="mt-1"
        />
        <span>
          He leído y acepto la{" "}
          <a href="/privacidad" target="_blank" className="text-accent underline">
            política de privacidad
          </a>
          .
        </span>
      </label>

      {/* Honeypot — must remain empty. Off-screen + obscure name so
          browsers and password managers don't autofill it. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Si eres humano, deja este campo vacío
          <input
            type="text"
            name="contact_url_2"
            tabIndex={-1}
            autoComplete="off"
            value={value.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
