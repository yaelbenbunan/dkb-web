"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { submitPromoQuestionnaire } from "@/lib/promo-questionnaire-action";

interface State {
  name: string; businessName: string; phone: string;
  activity: string; sector: string; services: string; need: string; currentWebsite: string;
  style: string; colors: string; typography: string; references: string; social: string; extra: string;
}

const EMPTY: State = {
  name: "", businessName: "", phone: "", activity: "", sector: "", services: "",
  need: "", currentWebsite: "", style: "", colors: "", typography: "", references: "",
  social: "", extra: "",
};

const SECTORS = ["Hostelería", "Salud", "Retail / Tienda", "Servicios", "Belleza", "Educación", "Otro"];
const NEEDS = ["Web", "Ecommerce", "No lo tengo claro"];
const STYLES = ["Moderno", "Minimalista", "Elegante", "Atrevido", "Cercano"];

interface WizardStep {
  label: string;
  field: keyof State | "logo";
  required: boolean;
  area?: boolean;
  options?: string[];
  file?: boolean;
}

export function PromoWizard({ token, leadId, email }: { token: string; leadId: string; email: string }) {
  const [state, setState] = useState<State>(EMPTY);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadedAt = useRef(Date.now());
  const logoRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof State) => (v: string) => setState((s) => ({ ...s, [k]: v }));

  // Definición de pasos (1 pregunta o grupo por paso).
  const steps = useMemo<WizardStep[]>(
    () => [
      { label: "¿Cómo te llamas?", field: "name", required: true },
      { label: "Nombre de tu negocio o marca", field: "businessName", required: true },
      { label: "Teléfono (opcional)", field: "phone", required: false },
      { label: "¿A qué se dedica tu negocio?", field: "activity", required: true, area: true },
      { label: "Sector", field: "sector", required: true, options: SECTORS },
      { label: "¿Qué servicios o productos ofreces?", field: "services", required: true, area: true },
      { label: "¿Qué necesitas?", field: "need", required: true, options: NEEDS },
      { label: "¿Tienes web actual? (URL, opcional)", field: "currentWebsite", required: false },
      { label: "Estilo gráfico", field: "style", required: true, options: STYLES },
      { label: "Colores de marca (o 'ayúdame')", field: "colors", required: true },
      { label: "Tipografía (o 'que la elijáis vosotros')", field: "typography", required: true },
      { label: "Sube tu logo (opcional)", field: "logo", required: false, file: true },
      { label: "Webs de referencia que te gusten (opcional)", field: "references", required: false, area: true },
      { label: "Redes / presencia actual (opcional)", field: "social", required: false },
      { label: "¿Algo más que debamos saber? (opcional)", field: "extra", required: false, area: true },
    ],
    [],
  );

  const isLast = step === steps.length - 1;
  const current = steps[step];
  const value = current.file ? "" : (state as unknown as Record<string, string>)[current.field] ?? "";
  const canAdvance = !current.required || current.file || Boolean(value.trim());

  const submit = (formData: FormData) => {
    setError(null);
    formData.set("formLoadedAt", String(loadedAt.current));
    startTransition(async () => {
      const res = await submitPromoQuestionnaire(formData);
      if (res.ok) setDone(true);
      else setError(res.error ?? "No se pudo enviar. Revisa los campos.");
    });
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="mt-3 text-2xl font-black text-fg">¡Gracias!</h1>
        <p className="mt-2 text-fg-muted">
          Hemos recibido tu información. Nuestro equipo se pondrá en contacto contigo muy pronto
          para arrancar tu web con el 50% de descuento.
        </p>
      </div>
    );
  }

  return (
    <form
      action={submit}
      data-testid="promo-wizard-form"
      encType="multipart/form-data"
      className="flex flex-col gap-6"
    >
      {/* Identidad del lead + anti-spam (ocultos) */}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="email" value={email} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {/* Todas las respuestas van como hidden para enviar el FormData completo */}
      {Object.entries(state).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {/* El logo es el único input real de tipo file */}
      <input ref={logoRef} type="file" name="logo" accept="image/*" className={current.file ? "" : "hidden"} />

      <div>
        <p className="text-xs font-semibold text-fg-muted">Paso {step + 1} de {steps.length}</p>
        <h1 className="mt-2 text-xl font-bold text-fg">{current.label}</h1>

        {!current.file && current.options && (
          <div className="mt-4 flex flex-wrap gap-2">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set(current.field as keyof State)(opt)}
                className={`h-10 rounded-lg border px-4 text-sm ${
                  (state as unknown as Record<string, string>)[current.field] === opt
                    ? "border-accent bg-accent text-white"
                    : "border-border-strong text-fg hover:bg-bg-subtle"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {!current.file && !current.options && current.area && (
          <textarea
            value={value}
            onChange={(e) => set(current.field as keyof State)(e.target.value)}
            rows={4}
            className="mt-4 w-full rounded-lg border border-border-strong bg-bg-subtle p-3 text-sm text-fg outline-none focus:border-accent"
          />
        )}

        {!current.file && !current.options && !current.area && (
          <input
            type="text"
            value={value}
            onChange={(e) => set(current.field as keyof State)(e.target.value)}
            className="mt-4 h-11 w-full rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent"
          />
        )}
      </div>

      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="h-11 rounded-lg border border-border-strong px-5 text-sm font-semibold text-fg disabled:opacity-40"
        >
          Atrás
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={pending || !canAdvance}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={!canAdvance}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Siguiente
          </button>
        )}
      </div>
    </form>
  );
}
