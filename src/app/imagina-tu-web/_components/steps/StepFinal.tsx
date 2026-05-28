"use client";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Toque personal y tus datos</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Te enviamos el preview y nos lo guardamos para hablar contigo.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          ¿Por qué eres bueno en lo que haces? *
        </span>
        <textarea
          value={value.valueProp}
          onChange={(e) => set("valueProp", e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Ej. Hacemos asesoría fiscal personalizada con respuesta en 24h y precios cerrados desde el primer día."
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        />
        <span className="mt-1 block text-xs text-fg-muted">
          {value.valueProp.length}/500
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
            className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
          />
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
          className="surface-input mt-1.5 block w-full rounded-md px-3.5 py-2.5 text-sm"
        />
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
