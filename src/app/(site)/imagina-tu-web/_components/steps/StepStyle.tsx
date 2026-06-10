"use client";

import type { PreviewStyle } from "@/lib/preview-validation";

interface Props {
  value: PreviewStyle | "";
  /** Current sector slug — drives which option shows the
   *  "Recomendado para tu sector" badge. Optional: badge hides if missing. */
  sector?: string;
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
    name: "Visual e impactante",
    tagline: "Foto grande, energía y movimiento",
    description:
      "Hero con foto a media página, bullets vivos, equipo en carrusel y testimonios destacados. Ideal si quieres entrar fuerte.",
    preview: <ModernoMini />,
  },
  {
    slug: "editorial",
    name: "Sobrio y editorial",
    tagline: "Mucho aire, tipografía protagonista",
    description:
      "Hero centrado, numeración 01/02/03 con líneas finas, equipo en cuadrícula y testimonio en bloque. Ideal para sectores que piden calma.",
    preview: <EditorialMini />,
  },
  {
    slug: "compacto",
    name: "Compacto y directo",
    tagline: "Todo a la vista, scroll corto",
    description:
      "Mismo aire editorial pero con secciones más densas, sin hero de foto y bloques pegados. Ideal si tu negocio es directo o tienes poca info.",
    preview: <CompactoMini />,
  },
];

// Per-sector recommendation. Heuristics, not gospel — show the badge as a
// hint but never force the choice.
const SECTOR_RECOMMENDATIONS: Record<string, PreviewStyle> = {
  salud: "editorial",
  educacion: "moderno",
  moda: "moderno",
  tecnologia: "compacto",
  servicios: "editorial",
  restauracion: "moderno",
};

export function StepStyle({ value, sector, onChange }: Props) {
  const recommended = sector ? SECTOR_RECOMMENDATIONS[sector] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Elige el estilo de tu web</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Tres maneras de enseñar la misma información. Si dudas, mira el badge
          ✨ — te marcamos la que mejor encaja con tu sector.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.slug;
          const isRecommended = recommended === opt.slug;
          return (
            <button
              key={opt.slug}
              type="button"
              onClick={() => onChange(opt.slug)}
              className={`group relative overflow-hidden rounded-xl border-2 text-left transition ${
                selected
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50"
              }`}
            >
              {isRecommended && (
                <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                  ✨ Recomendado
                </span>
              )}
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
      <rect x="10" y="8" width="40" height="4" rx="1" fill="#0c1e3a" />
      <rect x="160" y="6" width="28" height="8" rx="2" fill="#c46a3a" />
      <rect x="10" y="32" width="80" height="6" rx="1" fill="#0c1e3a" />
      <rect x="10" y="42" width="68" height="4" rx="1" fill="#0c1e3a" opacity="0.6" />
      <rect x="10" y="50" width="56" height="4" rx="1" fill="#0c1e3a" opacity="0.6" />
      <rect x="10" y="64" width="32" height="9" rx="2" fill="#c46a3a" />
      <rect x="105" y="28" width="85" height="62" rx="4" fill="#c46a3a" opacity="0.25" />
      <circle cx="125" cy="55" r="12" fill="#c46a3a" opacity="0.55" />
      <rect x="142" y="46" width="40" height="3" fill="#c46a3a" opacity="0.6" />
      <rect x="142" y="54" width="32" height="3" fill="#c46a3a" opacity="0.4" />
      <rect x="142" y="62" width="36" height="3" fill="#c46a3a" opacity="0.4" />
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
      <rect x="10" y="8" width="36" height="4" rx="1" fill="#1a1a1a" />
      <rect x="120" y="8" width="14" height="3" rx="1" fill="#1a1a1a" opacity="0.5" />
      <rect x="140" y="8" width="14" height="3" rx="1" fill="#1a1a1a" opacity="0.5" />
      <rect x="160" y="8" width="28" height="3" rx="1" fill="#1a1a1a" />
      <rect x="40" y="34" width="120" height="6" rx="1" fill="#1a1a1a" />
      <rect x="32" y="46" width="136" height="6" rx="1" fill="#1a1a1a" />
      <rect x="50" y="60" width="100" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
      <rect x="60" y="68" width="80" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
      <rect x="78" y="82" width="44" height="9" rx="1" fill="#1a1a1a" />
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

function CompactoMini() {
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <rect width="200" height="150" fill="#f5f5f0" />
      {/* nav (thin, full bleed) */}
      <rect x="10" y="6" width="28" height="3" rx="1" fill="#1a1a1a" />
      <rect x="120" y="6" width="10" height="3" rx="1" fill="#1a1a1a" opacity="0.5" />
      <rect x="136" y="6" width="10" height="3" rx="1" fill="#1a1a1a" opacity="0.5" />
      <rect x="166" y="5" width="22" height="6" rx="2" fill="#1a1a1a" />
      <line x1="0" y1="14" x2="200" y2="14" stroke="#1a1a1a" strokeOpacity="0.12" />
      {/* hero — no photo, tight */}
      <rect x="10" y="22" width="140" height="5" rx="1" fill="#1a1a1a" />
      <rect x="10" y="32" width="110" height="5" rx="1" fill="#1a1a1a" />
      <rect x="10" y="42" width="100" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
      <rect x="10" y="48" width="80" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
      <rect x="10" y="58" width="32" height="7" rx="1" fill="#1a1a1a" />
      <line x1="0" y1="74" x2="200" y2="74" stroke="#1a1a1a" strokeOpacity="0.12" />
      {/* bullets — tight 3 cols, 2 rows */}
      <text x="14" y="89" fontSize="9" fontWeight="700" fill="#1a1a1a">01</text>
      <rect x="14" y="93" width="42" height="2" fill="#1a1a1a" opacity="0.6" />
      <rect x="14" y="98" width="28" height="2" fill="#1a1a1a" opacity="0.4" />
      <text x="74" y="89" fontSize="9" fontWeight="700" fill="#1a1a1a">02</text>
      <rect x="74" y="93" width="42" height="2" fill="#1a1a1a" opacity="0.6" />
      <rect x="74" y="98" width="28" height="2" fill="#1a1a1a" opacity="0.4" />
      <text x="134" y="89" fontSize="9" fontWeight="700" fill="#1a1a1a">03</text>
      <rect x="134" y="93" width="42" height="2" fill="#1a1a1a" opacity="0.6" />
      <rect x="134" y="98" width="28" height="2" fill="#1a1a1a" opacity="0.4" />
      <text x="14" y="115" fontSize="9" fontWeight="700" fill="#1a1a1a">04</text>
      <rect x="14" y="119" width="42" height="2" fill="#1a1a1a" opacity="0.6" />
      <text x="74" y="115" fontSize="9" fontWeight="700" fill="#1a1a1a">05</text>
      <rect x="74" y="119" width="42" height="2" fill="#1a1a1a" opacity="0.6" />
      <text x="134" y="115" fontSize="9" fontWeight="700" fill="#1a1a1a">06</text>
      <rect x="134" y="119" width="42" height="2" fill="#1a1a1a" opacity="0.6" />
      <line x1="0" y1="135" x2="200" y2="135" stroke="#1a1a1a" strokeOpacity="0.12" />
      <rect x="10" y="140" width="60" height="3" rx="1" fill="#1a1a1a" opacity="0.55" />
    </svg>
  );
}
