"use client";

import { useRef, useState, useTransition } from "react";
import { submitPromoQuestionnaire } from "@/lib/promo-questionnaire-action";
import { PROMO } from "@/lib/promo-config";

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

// Paletas sugeridas: cada una guarda un descriptor legible en `colors`.
const PALETTES = [
  { id: "terracota", name: "Terracota cálida", colors: ["#C1654F", "#E8B796", "#F4EDE4", "#2E2A26"] },
  { id: "menta", name: "Menta fresca", colors: ["#2FA98C", "#A8E0D0", "#F2FBF8", "#163A33"] },
  { id: "marino", name: "Marino & oro", colors: ["#1B2A4A", "#C9A24B", "#F5F3EE", "#0E1626"] },
  { id: "minimal", name: "Blanco y negro", colors: ["#111111", "#6B6B6B", "#E5E5E5", "#FFFFFF"] },
];

// Tipografías con muestra visual (stacks web-safe para que se rendericen sin cargar fuentes).
const FONTS = [
  { id: "moderna", name: "Moderna", stack: "'Helvetica Neue', Arial, sans-serif" },
  { id: "elegante", name: "Elegante", stack: "Georgia, 'Times New Roman', serif" },
  { id: "amigable", name: "Amigable", stack: "'Trebuchet MS', Verdana, sans-serif" },
  { id: "caracter", name: "Con carácter", stack: "Impact, 'Arial Black', sans-serif" },
];

const LOGO_ACCEPT = ".ai,.psd,.pdf,.svg,.png,.jpg,.jpeg";

interface Group { key: string; title: string; short: string; fields: (keyof State | "logo")[] }

const GROUPS: Group[] = [
  { key: "contacto", title: "Datos de contacto", short: "Contacto", fields: ["name", "businessName", "phone"] },
  { key: "negocio", title: "Tu negocio", short: "Negocio", fields: ["activity", "sector", "services", "need", "currentWebsite"] },
  { key: "identidad", title: "Identidad visual", short: "Identidad", fields: ["style", "colors", "typography", "logo"] },
  { key: "extras", title: "Extras", short: "Extras", fields: ["references", "social", "extra"] },
];

// Campos obligatorios (el resto son opcionales, incluido el logo).
const REQUIRED: Partial<Record<keyof State, boolean>> = {
  name: true, businessName: true, phone: true, activity: true, sector: true,
  services: true, need: true, style: true, colors: true, typography: true,
};

const LABELS: Record<keyof State, string> = {
  name: "Nombre y apellidos",
  businessName: "Nombre del negocio o marca",
  phone: "Teléfono",
  activity: "¿A qué se dedica tu negocio?",
  sector: "Sector",
  services: "¿Qué servicios o productos ofreces?",
  need: "¿Qué necesitas?",
  currentWebsite: "¿Tienes web actual? (URL, opcional)",
  style: "Estilo gráfico",
  colors: "Colores de marca",
  typography: "Tipografía",
  references: "Webs de referencia que te gusten (opcional)",
  social: "Redes / presencia actual (opcional)",
  extra: "¿Algo más que debamos saber? (opcional)",
};

export function PromoWizard({ token, leadId, email }: { token: string; leadId: string; email: string }) {
  const [state, setState] = useState<State>(EMPTY);
  const [active, setActive] = useState(0);
  const [colorChoice, setColorChoice] = useState<string>("");
  const [fontChoice, setFontChoice] = useState<string>("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadedAt = useRef(Date.now());

  const set = (k: keyof State, v: string) => setState((s) => ({ ...s, [k]: v }));

  const groupComplete = (i: number) =>
    GROUPS[i].fields.every(
      (f) => f === "logo" || !REQUIRED[f as keyof State] || state[f as keyof State].trim() !== "",
    );

  const isLast = active === GROUPS.length - 1;

  const submit = (formData: FormData) => {
    setError(null);
    formData.set("formLoadedAt", String(loadedAt.current));
    startTransition(async () => {
      const res = await submitPromoQuestionnaire(formData);
      if (res.ok) setDone(true);
      else setError(res.error ?? "No se pudo enviar. Revisa los campos obligatorios.");
    });
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="mt-3 text-2xl font-black text-fg">¡Gracias!</h1>
        <p className="mt-2 text-fg-muted">
          Hemos recibido tu información. Nuestro equipo se pondrá en contacto contigo muy pronto
          para arrancar tu web con el {PROMO.discountPct}% de descuento.
        </p>
      </div>
    );
  }

  const inputCls =
    "mt-2 h-11 w-full rounded-lg border border-border-strong bg-bg-subtle px-4 text-sm text-fg outline-none focus:border-accent";
  const areaCls =
    "mt-2 w-full rounded-lg border border-border-strong bg-bg-subtle p-3 text-sm text-fg outline-none focus:border-accent";
  const chip = (selected: boolean) =>
    `h-10 rounded-lg border px-4 text-sm transition-colors ${
      selected ? "border-accent bg-accent text-white" : "border-border-strong text-fg hover:bg-bg-subtle"
    }`;

  function renderField(field: keyof State | "logo") {
    if (field === "logo") {
      return (
        <div key="logo">
          <p className="text-sm font-semibold text-fg">Sube tu logo (opcional)</p>
          <p className="mt-1 text-xs text-fg-muted">
            Preferiblemente en <strong>editable (AI o PSD)</strong>. También vale PDF, SVG, PNG o JPG.
          </p>
          <input
            type="file"
            name="logo"
            accept={LOGO_ACCEPT}
            className="mt-2 block w-full text-sm text-fg-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-hover"
          />
        </div>
      );
    }

    const label = LABELS[field];

    // Selects visuales (chips)
    if (field === "sector" || field === "need" || field === "style") {
      const opts = field === "sector" ? SECTORS : field === "need" ? NEEDS : STYLES;
      return (
        <div key={field}>
          <p className="text-sm font-semibold text-fg">{label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {opts.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set(field, opt)}
                className={chip(state[field] === opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Paleta de colores
    if (field === "colors") {
      return (
        <div key="colors">
          <p className="text-sm font-semibold text-fg">{label}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setColorChoice(p.id);
                  set("colors", `${p.name} — ${p.colors.join(" · ")}`);
                }}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  colorChoice === p.id ? "border-accent ring-2 ring-accent" : "border-border-strong hover:bg-bg-subtle"
                }`}
              >
                <div className="flex h-8 overflow-hidden rounded">
                  {p.colors.map((c) => (
                    <span key={c} style={{ backgroundColor: c }} className="flex-1" />
                  ))}
                </div>
                <span className="mt-1 block text-xs font-medium text-fg">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setColorChoice("custom"); set("colors", ""); }}
              className={chip(colorChoice === "custom")}
            >
              Personalizada
            </button>
            <button
              type="button"
              onClick={() => { setColorChoice("advice"); set("colors", "Quiero que me asesoréis"); }}
              className={chip(colorChoice === "advice")}
            >
              Quiero que me asesoréis
            </button>
          </div>
          {colorChoice === "custom" && (
            <input
              type="text"
              value={state.colors}
              onChange={(e) => set("colors", e.target.value)}
              placeholder="Escribe tus colores (p. ej. azul marino y dorado)"
              className={inputCls}
            />
          )}
        </div>
      );
    }

    // Tipografía con muestra visual
    if (field === "typography") {
      return (
        <div key="typography">
          <p className="text-sm font-semibold text-fg">{label}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFontChoice(f.id); set("typography", f.name); }}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  fontChoice === f.id ? "border-accent ring-2 ring-accent" : "border-border-strong hover:bg-bg-subtle"
                }`}
              >
                <span style={{ fontFamily: f.stack }} className="block text-lg leading-tight text-fg">
                  Tu negocio
                </span>
                <span className="mt-1 block text-xs text-fg-muted">{f.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setFontChoice("custom"); set("typography", ""); }}
            className={`mt-2 ${chip(fontChoice === "custom")}`}
          >
            Otra (escribe el nombre)
          </button>
          {fontChoice === "custom" && (
            <input
              type="text"
              value={state.typography}
              onChange={(e) => set("typography", e.target.value)}
              placeholder="Nombre de tu tipografía (p. ej. Montserrat)"
              className={inputCls}
            />
          )}
        </div>
      );
    }

    // Textareas
    if (field === "activity" || field === "services" || field === "references" || field === "extra") {
      return (
        <div key={field}>
          <p className="text-sm font-semibold text-fg">{label}</p>
          <textarea
            value={state[field]}
            onChange={(e) => set(field, e.target.value)}
            rows={3}
            className={areaCls}
          />
        </div>
      );
    }

    // Inputs de texto / teléfono
    return (
      <div key={field}>
        <p className="text-sm font-semibold text-fg">{label}</p>
        <input
          type={field === "phone" ? "tel" : "text"}
          value={state[field]}
          onChange={(e) => set(field, e.target.value)}
          className={inputCls}
        />
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
      {/* Espejos ocultos: todas las respuestas de texto viajan en el FormData
          aunque su grupo no sea el activo (las secciones siguen montadas). */}
      {Object.entries(state).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {GROUPS.map((g, i) => {
          const reached = i <= active;
          return (
            <li key={g.key} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => { if (i <= active) setActive(i); }}
                disabled={i > active}
                className={`flex items-center gap-2 ${i > active ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === active
                      ? "bg-accent text-white"
                      : reached
                        ? "bg-accent/20 text-accent"
                        : "bg-bg-subtle text-fg-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`hidden text-xs font-semibold sm:inline ${i === active ? "text-fg" : "text-fg-muted"}`}>
                  {g.short}
                </span>
              </button>
              {i < GROUPS.length - 1 && <span className="h-px flex-1 bg-border-strong" />}
            </li>
          );
        })}
      </ol>

      {/* Secciones (todas montadas; se muestra solo la activa) */}
      {GROUPS.map((g, i) => (
        <section key={g.key} className={i === active ? "flex flex-col gap-5" : "hidden"}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Paso {i + 1} de {GROUPS.length}</p>
            <h1 className="mt-1 text-xl font-bold text-fg">{g.title}</h1>
            {i === 0 && email && (
              <p className="mt-1 text-xs text-fg-muted">Te escribiremos a: {email}</p>
            )}
          </div>
          {g.fields.map(renderField)}
        </section>
      ))}

      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActive((s) => Math.max(0, s - 1))}
          disabled={active === 0}
          className="h-11 rounded-lg border border-border-strong px-5 text-sm font-semibold text-fg disabled:opacity-40"
        >
          Atrás
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={pending || !groupComplete(active)}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { if (groupComplete(active)) setActive((s) => Math.min(GROUPS.length - 1, s + 1)); }}
            disabled={!groupComplete(active)}
            className="h-11 rounded-lg bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Siguiente
          </button>
        )}
      </div>
    </form>
  );
}
