"use client";

import type { PreviewStyle } from "@/lib/preview-validation";

interface Props {
  value: PreviewStyle | "";
  onChange: (style: PreviewStyle) => void;
}

interface StyleOption {
  slug: PreviewStyle;
  name: string;
  tagline: string;
  description: string;
  preview: React.ReactNode;
}

const OPTIONS: StyleOption[] = [
  {
    slug: "moderno",
    name: "Moderno dinámico",
    tagline: "Energía visual, foto a pantalla, secciones con vida",
    description:
      "Hero a doble columna con foto al lado, bullets vivos, equipo en carrusel y testimonios destacados. Ideal si quieres impactar de primeras.",
    preview: <ModernoMini />,
  },
  {
    slug: "editorial",
    name: "Editorial limpio",
    tagline: "Aire, tipografía protagonista, foco en el mensaje",
    description:
      "Hero centrado con mucho aire, números grandes en valor añadido, equipo en cuadrícula y testimonios en bloque. Ideal si tu sector pide calma y autoridad.",
    preview: <EditorialMini />,
  },
];

export function StepStyle({ value, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Elige el estilo de tu web</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Misma información, dos maneras de enseñarla. Puedes cambiarlo más
          tarde con tu equipo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.slug;
          return (
            <button
              key={opt.slug}
              type="button"
              onClick={() => onChange(opt.slug)}
              className={`group overflow-hidden rounded-xl border-2 text-left transition ${
                selected
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-bg-subtle">
                {opt.preview}
              </div>
              <div className="space-y-1 p-4">
                <p className="font-semibold">{opt.name}</p>
                <p className="text-xs uppercase tracking-wider text-accent">
                  {opt.tagline}
                </p>
                <p className="pt-1 text-sm text-fg-muted">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModernoMini() {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <rect width="200" height="150" fill="#fef9f4" />
      {/* nav */}
      <rect x="10" y="8" width="40" height="4" rx="1" fill="#0c1e3a" />
      <rect x="160" y="6" width="28" height="8" rx="2" fill="#c46a3a" />
      {/* hero left col */}
      <rect x="10" y="32" width="80" height="6" rx="1" fill="#0c1e3a" />
      <rect x="10" y="42" width="68" height="4" rx="1" fill="#0c1e3a" opacity="0.6" />
      <rect x="10" y="50" width="56" height="4" rx="1" fill="#0c1e3a" opacity="0.6" />
      <rect x="10" y="64" width="32" height="9" rx="2" fill="#c46a3a" />
      {/* hero right photo */}
      <rect x="105" y="28" width="85" height="62" rx="4" fill="#c46a3a" opacity="0.25" />
      <circle cx="125" cy="55" r="12" fill="#c46a3a" opacity="0.55" />
      <rect x="142" y="46" width="40" height="3" fill="#c46a3a" opacity="0.6" />
      <rect x="142" y="54" width="32" height="3" fill="#c46a3a" opacity="0.4" />
      <rect x="142" y="62" width="36" height="3" fill="#c46a3a" opacity="0.4" />
      {/* bullets row */}
      <rect x="10" y="100" width="36" height="36" rx="3" fill="#0c1e3a" opacity="0.08" />
      <rect x="56" y="100" width="36" height="36" rx="3" fill="#0c1e3a" opacity="0.08" />
      <rect x="102" y="100" width="36" height="36" rx="3" fill="#0c1e3a" opacity="0.08" />
      <rect x="148" y="100" width="36" height="36" rx="3" fill="#c46a3a" opacity="0.25" />
    </svg>
  );
}

function EditorialMini() {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <rect width="200" height="150" fill="#faf7f2" />
      {/* nav */}
      <rect x="10" y="8" width="36" height="4" rx="1" fill="#1a1a1a" />
      <rect x="120" y="8" width="14" height="3" rx="1" fill="#1a1a1a" opacity="0.5" />
      <rect x="140" y="8" width="14" height="3" rx="1" fill="#1a1a1a" opacity="0.5" />
      <rect x="160" y="8" width="28" height="3" rx="1" fill="#1a1a1a" />
      {/* hero centered */}
      <rect x="40" y="34" width="120" height="6" rx="1" fill="#1a1a1a" />
      <rect x="32" y="46" width="136" height="6" rx="1" fill="#1a1a1a" />
      <rect x="50" y="60" width="100" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
      <rect x="60" y="68" width="80" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
      <rect x="78" y="82" width="44" height="9" rx="1" fill="#1a1a1a" />
      {/* big numbers band */}
      <line x1="10" y1="102" x2="190" y2="102" stroke="#1a1a1a" strokeOpacity="0.15" />
      <text x="22" y="124" fontSize="14" fontWeight="700" fill="#1a1a1a">01</text>
      <rect x="40" y="118" width="32" height="2" fill="#1a1a1a" opacity="0.6" />
      <rect x="40" y="124" width="22" height="2" fill="#1a1a1a" opacity="0.4" />
      <text x="86" y="124" fontSize="14" fontWeight="700" fill="#1a1a1a">02</text>
      <rect x="104" y="118" width="32" height="2" fill="#1a1a1a" opacity="0.6" />
      <rect x="104" y="124" width="22" height="2" fill="#1a1a1a" opacity="0.4" />
      <text x="150" y="124" fontSize="14" fontWeight="700" fill="#1a1a1a">03</text>
      <rect x="168" y="118" width="20" height="2" fill="#1a1a1a" opacity="0.6" />
      <rect x="168" y="124" width="14" height="2" fill="#1a1a1a" opacity="0.4" />
    </svg>
  );
}
