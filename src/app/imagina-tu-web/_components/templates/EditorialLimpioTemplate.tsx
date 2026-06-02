"use client";

import { useMemo, type CSSProperties, type SVGProps } from "react";
import { motion } from "motion/react";
import {
  getTypography,
  resolvePalette,
  type CustomPaletteColors,
} from "@/lib/preview-themes";
import type { SectorInformativaCopyResponse } from "@/lib/preview-validation";
import {
  SECTOR_ASSETS,
  getCuisinePhotos,
  getFallbackDishes,
  getFeaturedMenu,
  getRestauracionRolePhoto,
  isSupportedSector,
  type Cuisine,
} from "./sector-assets";
import { FeaturedMenu } from "./FeaturedMenu";

const VIEWPORT = { once: true, margin: "-80px" } as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.7, ease: [0.21, 1, 0.34, 1] as [number, number, number, number] },
};

// --- Contrast helpers (inline copy of the ones in InformativaSectorTemplate) ---
function luminance(hex: string): number {
  const m = hex.replace("#", "").slice(0, 6);
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function readableOn(bg: string): string {
  return luminance(bg) > 0.55 ? "#0a0a0f" : "#ffffff";
}

// Spanish gender guess for portrait selection
const NAMES_FEMALE = new Set([
  "ana", "andrea", "blanca", "carla", "carmen", "carolina", "clara", "claudia",
  "cristina", "daniela", "diana", "elena", "emilia", "eva", "gabriela", "irene",
  "isabel", "julia", "laura", "lidia", "lucía", "lucia", "maite", "manuela",
  "marina", "marta", "maría", "maria", "miriam", "nerea", "noelia", "nuria",
  "paloma", "patricia", "paula", "pilar", "raquel", "rocío", "rocio", "rosa",
  "sandra", "sara", "silvia", "sofía", "sofia", "teresa", "victoria",
]);
function guessGender(fullName: string): "male" | "female" {
  const cleaned = fullName.replace(/^d(r|ra)\.\s*/i, "").trim();
  const first = cleaned.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (NAMES_FEMALE.has(first)) return "female";
  return first.endsWith("a") ? "female" : "male";
}

const titleize = (s: string) => {
  const trimmed = s.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// --- Minimal icons ----------------------------------------------------------
type IconProps = SVGProps<SVGSVGElement>;
const baseSvg = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const IconArrowRight = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconMail = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
const IconPhone = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);
const IconMapPin = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const IconQuoteMark = (p: IconProps) => (
  <svg {...baseSvg} {...p} fill="currentColor" stroke="none">
    <path d="M9 7H5v6c0 2 1 4 3 4v-2c-1 0-2-1-2-2v-1h3V7zm10 0h-4v6c0 2 1 4 3 4v-2c-1 0-2-1-2-2v-1h3V7z" />
  </svg>
);

// Generic "value" icons for the valor-agregado bullets (the number already
// shows as the card's ghost watermark, so the badge carries an icon instead).
const IconCheck = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconBolt = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  </svg>
);
const IconShield = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconClock = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IconHeart = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
  </svg>
);
const IconSpark = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
  </svg>
);
const VALUE_ICONS = [
  IconCheck,
  IconBolt,
  IconShield,
  IconClock,
  IconHeart,
  IconSpark,
];

export interface EditorialLimpioData {
  businessName: string;
  sector: string;
  offerings: string[];
  cuisine?: Cuisine | "";
  palette: string;
  customColors?: CustomPaletteColors;
  typography: string;
  valueProp: string;
  logoDataUrl?: string;
  address?: string;
  city?: string;
  /** Real image scraped from the user's current website (hero background). */
  sourceImageUrl?: string;
}

/** Visual density for Editorial. "spacious" is the default (generous aire,
 *  large hero, big numbers). "compact" keeps the editorial style but
 *  removes the hero photo and tightens padding/typography so the whole
 *  page fits more info in less scroll. */
export type EditorialDensity = "spacious" | "compact";

interface Props {
  data: EditorialLimpioData;
  copy: SectorInformativaCopyResponse | null;
  /** Visual density. Defaults to "spacious" so existing callers keep
   *  their look. The "compacto" wizard style sets this to "compact". */
  density?: EditorialDensity;
}

export function EditorialLimpioTemplate({ data, copy, density = "spacious" }: Props) {
  const isCompact = density === "compact";
  // Section padding tokens — every section uses these so density changes
  // ripple through the whole template without per-section edits.
  const padX = "px-12";
  const padY = isCompact ? "py-14" : "py-24";
  const padYHero = isCompact ? "pt-14 pb-12" : "pt-24 pb-20";
  const padYDark = isCompact ? "py-16" : "py-28";
  const titleSize = isCompact
    ? "text-3xl sm:text-5xl"
    : "text-4xl sm:text-5xl";
  const heroTitleSize = isCompact
    ? "text-4xl sm:text-6xl"
    : "text-5xl sm:text-7xl";
  const palette = resolvePalette(data.palette, data.customColors);
  const typo = getTypography(data.typography);
  const assets = isSupportedSector(data.sector) ? SECTOR_ASSETS[data.sector] : null;

  const [heroImg, valorImg] = useMemo(() => {
    const pool = assets?.photosAmbient ?? [];
    const shuffled =
      pool.length > 0 ? [...pool].sort(() => Math.random() - 0.5) : [];
    // Prefer the user's real website image for the hero when available.
    const hero = data.sourceImageUrl || shuffled[0];
    const valor = shuffled[1] ?? shuffled[0];
    return [hero, valor];
  }, [assets, data.sourceImageUrl]);

  if (!palette || !typo || !assets) return null;

  const cuisine = data.cuisine || undefined;
  const isRestauracion = data.sector === "restauracion";
  const dishPhotos = isRestauracion && cuisine ? getCuisinePhotos(cuisine) : [];
  const fallbackDishes = isRestauracion && cuisine ? getFallbackDishes(cuisine) : [];
  const SERVICE_ICONS = assets.serviceIcons;

  const wrapper: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const display: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  const fgOnAccent = readableOn(palette.accent);
  const fgOnInvert = readableOn(palette.text);
  const accentBtn: CSSProperties = {
    backgroundColor: palette.text,
    color: fgOnInvert,
  };
  const ghostBtn: CSSProperties = {
    backgroundColor: "transparent",
    color: palette.text,
    border: `1px solid ${palette.text}40`,
  };
  const accentChip: CSSProperties = {
    backgroundColor: palette.accent,
    color: fgOnAccent,
  };
  const hairline: CSSProperties = {
    borderColor: `${palette.text}1a`,
  };

  // Copy fallbacks — same rule: never use data.valueProp verbatim.
  const headline = copy?.heroHeadline ?? `Bienvenidos a ${data.businessName}`;
  const tagline = copy?.heroTagline ?? assets.labels.defaultHeroTagline;
  const ctaText = copy?.ctaText ?? assets.labels.defaultCtaText;
  const servicesTitle = copy?.sectionTitle ?? assets.labels.defaultServicesTitle;
  const services =
    copy?.offerings ??
    data.offerings.map((name) => ({ name: titleize(name), blurb: "" }));

  const valorTitle =
    copy?.valorAgregadoTitle ?? assets.labels.defaultValorAgregadoTitle;
  const valorIntro =
    copy?.valorAgregadoIntro ?? assets.labels.defaultValorAgregadoIntro;

  const FALLBACK_BULLETS = [
    { title: "Atención personalizada", text: "Te dedicamos el tiempo que necesitas." },
    { title: "Equipo profesional", text: "Especialistas con experiencia en tu sector." },
    { title: "Instalaciones modernas", text: "Espacios pensados para tu comodidad." },
    { title: "Respuesta rápida", text: "Contacto y seguimiento sin demoras." },
    { title: "Trato cercano", text: "Cuidamos cada detalle para que la experiencia importe." },
    { title: "Compromiso real", text: "Hacemos lo que decimos, no inflamos promesas." },
  ];
  const rawBullets = copy?.bullets ?? FALLBACK_BULLETS;
  const bullets = Array.from({ length: 6 }, (_, i) => rawBullets[i] ?? FALLBACK_BULLETS[i]);

  const team = copy?.team ?? assets.fallbackTeam;
  const testimonials =
    copy?.testimonials ??
    assets.fallbackTestimonials.map((t) => ({
      name: t.name,
      text: t.text.replace("{businessName}", data.businessName),
    }));

  const fullAddress = [data.address, data.city].filter(Boolean).join(", ");
  const mapAddress = fullAddress || "Madrid, España";
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    mapAddress,
  )}&output=embed`;

  // Portrait picker for team — restauracion uses role-keyword override
  const pickPortrait = (member: { name: string; role: string; gender?: "male" | "female" }, idx: number) => {
    if (isRestauracion) {
      const g = member.gender ?? guessGender(member.name);
      const override = getRestauracionRolePhoto(member.role, g);
      if (override) return override;
    }
    const gender = member.gender ?? guessGender(member.name);
    const pool = gender === "female" ? assets.photosFemale : assets.photosMale;
    if (pool.length === 0) return undefined;
    return pool[idx % pool.length];
  };

  return (
    <div style={wrapper}>
      {/* HEADER — minimal, hairline border underneath */}
      <header
        className="flex items-center justify-between border-b px-12 py-5"
        style={hairline}
      >
        <div className="flex items-center gap-3">
          {data.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoDataUrl}
              alt={data.businessName}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <span style={display} className="text-base font-semibold tracking-tight">
              {data.businessName}
            </span>
          )}
        </div>
        <nav
          className="hidden gap-8 text-[13px] uppercase tracking-[0.18em] opacity-80 sm:flex"
          style={display}
        >
          <span>Inicio</span>
          <span>{assets.labels.navServicesLabel}</span>
          <span>Equipo</span>
          <span>Contacto</span>
        </nav>
        <button
          type="button"
          style={accentBtn}
          className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold"
        >
          {ctaText}
          <IconArrowRight className="size-3.5" />
        </button>
      </header>

      {/* HERO — full-bleed photo with the welcome copy overlaid on top.
          A dark scrim + palette tint keeps the text legible over any image
          (we always render white text here, regardless of the palette). When
          there's no sector photo we fall back to a clean editorial hero on the
          palette background. */}
      {!isCompact && heroImg ? (
        <section
          className={`relative isolate flex min-h-[88vh] items-center justify-center overflow-hidden ${padX} py-28`}
        >
          {/* Background image with a slow Ken Burns zoom */}
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url('${heroImg}')` }}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 9, ease: "easeOut" }}
          />
          {/* Legibility scrim: dark vertical gradient + a touch of palette
              colour so the hero still feels on-brand. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.7) 100%)`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 mix-blend-multiply"
            style={{
              background: `linear-gradient(135deg, ${palette.accent}40 0%, transparent 60%)`,
            }}
          />
          <div className="relative mx-auto max-w-3xl text-center text-white">
            <motion.span
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0 }}
              style={accentChip}
              className="mb-6 inline-block rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.32em]"
            >
              {assets.labels.servicesSectionPill}
            </motion.span>
            <motion.h1
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              style={{ ...display, textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}
              className={`text-balance ${heroTitleSize} font-bold leading-[1.05] tracking-tight`}
            >
              {headline}
            </motion.h1>
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.12 }}
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
              className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed opacity-95 sm:text-xl"
            >
              {tagline}
            </motion.p>
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.18 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                style={{ backgroundColor: palette.accent, color: fgOnAccent }}
                className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-xl"
              >
                {ctaText}
                <IconArrowRight className="size-4" />
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.55)",
                }}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium backdrop-blur-sm"
              >
                {assets.labels.navServicesLabel}
              </button>
            </motion.div>
          </div>
        </section>
      ) : isCompact ? (
        // COMPACT hero — no photo. Punchy "landing" feel: headline on the left,
        // a solid accent colour block with the CTA on the right. This is the main
        // visual differentiator from the photo-led Editorial hero.
        <section className={`relative ${padX} pb-12 pt-14`}>
          <div className="mx-auto grid max-w-6xl items-stretch gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <motion.div {...fadeUp} className="flex flex-col justify-center">
              <span
                style={{ color: palette.accent }}
                className="mb-4 inline-block text-[11px] font-bold uppercase tracking-[0.32em]"
              >
                {assets.labels.servicesSectionPill}
              </span>
              <h1
                style={display}
                className={`text-balance ${heroTitleSize} font-bold leading-[1.04] tracking-tight`}
              >
                {headline}
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed opacity-80">
                {tagline}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  style={accentBtn}
                  className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold"
                >
                  {ctaText}
                  <IconArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  style={ghostBtn}
                  className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium"
                >
                  {assets.labels.navServicesLabel}
                </button>
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
              style={{
                background: `linear-gradient(150deg, ${palette.accent}, ${palette.accent}cc)`,
                color: fgOnAccent,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 size-52 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">
                  {assets.labels.ratingText}
                </div>
                <p
                  style={display}
                  className="mt-5 text-balance text-2xl font-bold leading-snug sm:text-3xl"
                >
                  {assets.labels.bridgeHeadline}
                </p>
                <button
                  type="button"
                  style={{ backgroundColor: "#ffffff", color: palette.accent }}
                  className="mt-7 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-bold shadow-lg"
                >
                  {ctaText}
                  <IconArrowRight className="size-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      ) : (
        // Fallback hero (sectors with no photo pool).
        <section className={`relative ${padX} ${padYHero}`}>
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0 }}
              style={{ color: palette.accent }}
              className="mb-6 inline-block text-[11px] font-bold uppercase tracking-[0.32em]"
            >
              {assets.labels.servicesSectionPill}
            </motion.span>
            <motion.h1
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              style={display}
              className={`text-balance ${heroTitleSize} font-bold leading-[1.05] tracking-tight`}
            >
              {headline}
            </motion.h1>
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.12 }}
              className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed opacity-80 sm:text-xl"
            >
              {tagline}
            </motion.p>
            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.18 }}
              className="mt-10 flex items-center justify-center gap-3"
            >
              <button
                type="button"
                style={accentBtn}
                className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold"
              >
                {ctaText}
                <IconArrowRight className="size-4" />
              </button>
              <button
                type="button"
                style={ghostBtn}
                className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium"
              >
                {assets.labels.navServicesLabel}
              </button>
            </motion.div>
          </div>
        </section>
      )}

      {/* NUMBERED EDITORIAL BULLETS — 6 items in 3 cols */}
      <section
        className={`relative isolate overflow-hidden border-y ${padX} ${padY}`}
        style={{ ...hairline, backgroundColor: palette.surface }}
      >
        {/* Dot-grid texture so the section never reads as a flat surface */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${palette.text}1f 1px, transparent 1.5px)`,
            backgroundSize: "26px 26px",
            opacity: 0.55,
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            {...fadeUp}
            className="grid items-stretch gap-10 sm:grid-cols-2"
          >
            <div className="flex flex-col">
              <span
                style={{ color: palette.accent }}
                className="text-xs font-bold uppercase tracking-[0.32em]"
              >
                Cómo trabajamos
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                {valorTitle}
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed opacity-85">
                {valorIntro}
              </p>
              {/* Claim editorial — llena la altura de la columna y crea un
                  segundo punto visual frente a la foto. */}
              <div
                className="mt-auto flex items-end pt-10"
              >
                <div
                  className="border-l-2 pl-5"
                  style={{ borderColor: palette.accent }}
                >
                  <p
                    style={display}
                    className="text-balance text-xl font-medium leading-snug sm:text-2xl"
                  >
                    Cada decisión que tomamos pasa antes por una pregunta:
                    <span style={{ color: palette.accent }}> ¿le aporta esto al cliente?</span>
                  </p>
                </div>
              </div>
            </div>
            {valorImg && !isCompact ? (
              <div
                className="min-h-[360px] overflow-hidden rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url('${valorImg}')` }}
                aria-hidden
              />
            ) : (
              // Compact mode: no photo — replace with a 4-up stat block so
              // the row never reads as half-empty.
              <div className="grid grid-cols-2 gap-4 self-stretch">
                {[
                  { k: "+10", l: "Años acompañando proyectos" },
                  { k: "98%", l: "Clientes que repiten" },
                  { k: "24h", l: "Tiempo medio de respuesta" },
                  { k: "100%", l: "Atención personalizada" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-center rounded-2xl border p-6"
                    style={{ ...hairline, backgroundColor: `${palette.accent}0a` }}
                  >
                    <span
                      style={{ ...display, color: palette.accent }}
                      className="text-5xl font-black leading-none tracking-tight"
                    >
                      {s.k}
                    </span>
                    <span className="mt-3 text-sm leading-snug opacity-80">
                      {s.l}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {isCompact ? (
            // COMPACT — lighter, airier presentation (no boxes). Big accent icon
            // tile on top of each item so it reads visual without saturating.
            <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {bullets.map((b, i) => {
                const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
                return (
                  <motion.div
                    key={i}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                  >
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)`,
                        color: fgOnAccent,
                      }}
                      className="flex size-14 items-center justify-center rounded-2xl shadow-lg"
                    >
                      <Icon className="size-7" />
                    </div>
                    <h3
                      style={display}
                      className="mt-5 text-lg font-semibold sm:text-xl"
                    >
                      {b.title}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed opacity-85">
                      {b.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            // SPACIOUS — cards with an icon badge + a big ghost number for depth.
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bullets.map((b, i) => {
                const num = String(i + 1).padStart(2, "0");
                const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
                return (
                  <motion.div
                    key={i}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                    className="relative overflow-hidden rounded-2xl border p-6"
                    style={{ ...hairline, backgroundColor: `${palette.accent}0a` }}
                  >
                    <span
                      aria-hidden
                      style={{ ...display, color: palette.accent }}
                      className="pointer-events-none absolute -right-1 -top-4 select-none text-8xl font-black leading-none opacity-[0.08]"
                    >
                      {num}
                    </span>
                    <div
                      style={{ backgroundColor: palette.accent, color: fgOnAccent }}
                      className="relative flex size-12 items-center justify-center rounded-xl shadow-md"
                    >
                      <Icon className="size-6" />
                    </div>
                    <h3
                      style={display}
                      className="relative mt-5 text-xl font-semibold sm:text-[1.35rem]"
                    >
                      {b.title}
                    </h3>
                    <p className="relative mt-2 text-base leading-relaxed opacity-85">
                      {b.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES — asymmetric list. Hidden for restauración: the dish strip
          ("Los platos que nos dan nombre") + the Carta destacada already cover
          the food, and this list would otherwise just repeat the cuisine label
          (e.g. "Mexicana / latina") whenever the AI copy isn't available. */}
      {!isRestauracion &&
        (isCompact ? (
          // COMPACT services — a compact card grid (vs Editorial's airy list).
          <section
            className={`relative isolate overflow-hidden ${padX} ${padY}`}
            style={{ backgroundColor: palette.surface }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background: `linear-gradient(160deg, ${palette.accent}0a 0%, transparent 50%)`,
              }}
            />
            <div className="relative mx-auto max-w-6xl">
              <motion.div {...fadeUp} className="mb-10 max-w-2xl">
                <span
                  style={{ color: palette.accent }}
                  className="text-xs font-bold uppercase tracking-[0.32em]"
                >
                  {assets.labels.servicesSectionPill}
                </span>
                <h2
                  style={display}
                  className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
                >
                  {servicesTitle}
                </h2>
                <p className="mt-4 text-lg leading-relaxed opacity-85">
                  {assets.labels.servicesSectionSubtitle}
                </p>
              </motion.div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s, i) => {
                  const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                  const tg = (s as { tagline?: string }).tagline;
                  return (
                    <motion.div
                      key={i}
                      {...fadeUp}
                      transition={{ ...fadeUp.transition, delay: 0.04 * i }}
                      className="rounded-2xl border p-6"
                      style={{ ...hairline, backgroundColor: palette.bg }}
                    >
                      <div
                        style={{ backgroundColor: palette.accent, color: fgOnAccent }}
                        className="flex size-12 items-center justify-center rounded-xl shadow-md"
                      >
                        <Icon className="size-6" />
                      </div>
                      <h3
                        style={display}
                        className="mt-5 text-lg font-semibold sm:text-xl"
                      >
                        {s.name}
                      </h3>
                      {s.blurb && (
                        <p className="mt-2 text-base leading-relaxed opacity-85">
                          {s.blurb}
                        </p>
                      )}
                      {tg && (
                        <p
                          style={{ color: palette.accent }}
                          className="mt-3 text-[13px] font-semibold uppercase tracking-wider"
                        >
                          {tg}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
      <section className={`relative isolate overflow-hidden ${padX} ${padY}`}>
        {/* Soft accent veil — dynamism without overwhelming the type */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(160deg, ${palette.accent}0a 0%, transparent 45%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            {...fadeUp}
            className="grid items-stretch gap-12 sm:grid-cols-[2fr_3fr]"
          >
            <div className="flex flex-col">
              <span
                style={{ color: palette.accent }}
                className="text-xs font-bold uppercase tracking-[0.32em]"
              >
                {assets.labels.servicesSectionPill}
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                {servicesTitle}
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed opacity-85">
                {assets.labels.servicesSectionSubtitle}
              </p>
              {/* Bottom callout: rellena la altura de la columna y empuja al
                  usuario a contactar si no encuentra su caso en la lista. */}
              <div
                className="mt-auto rounded-2xl border p-6"
                style={{
                  ...hairline,
                  backgroundColor: `${palette.accent}0d`,
                }}
              >
                <p
                  style={display}
                  className="text-balance text-lg font-semibold leading-snug"
                >
                  ¿No ves tu caso aquí?
                </p>
                <p className="mt-2 text-base leading-relaxed opacity-85">
                  Cuéntanos qué necesitas y te decimos sin compromiso si encaja
                  con lo que hacemos.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
                  style={{ color: palette.accent }}
                >
                  Hablemos
                  <IconArrowRight className="size-4" />
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {services.map((s, i) => {
                const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                const tagline = (s as { tagline?: string }).tagline;
                return (
                  <motion.li
                    key={i}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.04 * i }}
                    className="group flex items-start gap-6 border-t py-6"
                    style={hairline}
                  >
                    <div
                      style={{ color: palette.accent }}
                      className="flex size-12 shrink-0 items-center justify-center rounded-full"
                    >
                      <Icon className="size-7" />
                    </div>
                    <div className="flex-1">
                      <h3
                        style={display}
                        className="text-xl font-semibold sm:text-2xl"
                      >
                        {s.name}
                      </h3>
                      {s.blurb && (
                        <p className="mt-2 text-base leading-relaxed opacity-85">
                          {s.blurb}
                        </p>
                      )}
                      {tagline && (
                        <p
                          style={{ color: palette.accent }}
                          className="mt-2 text-[13px] font-semibold uppercase tracking-wider"
                        >
                          {tagline}
                        </p>
                      )}
                    </div>
                    <IconArrowRight
                      className="mt-3 size-5 opacity-30 transition group-hover:translate-x-1 group-hover:opacity-100"
                      style={{ color: palette.accent }}
                    />
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </section>
        ))}

      {/* RESTAURACION — minimal dish strip when sector matches and photos exist */}
      {isRestauracion && dishPhotos.length > 0 && (
        <section
          className={`relative isolate overflow-hidden border-y ${padX} ${padY}`}
          style={{ ...hairline, backgroundColor: palette.surface }}
        >
          {/* Diagonal hairlines for visual variety vs. neighbouring sections */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: `repeating-linear-gradient(135deg, ${palette.text}0a 0 1px, transparent 1px 28px)`,
            }}
          />
          <div className="relative mx-auto max-w-6xl">
            <motion.div {...fadeUp} className="mb-14 max-w-2xl">
              <span
                style={{ color: palette.accent }}
                className="text-xs font-bold uppercase tracking-[0.32em]"
              >
                Especialidades
              </span>
              <h2
                style={display}
                className={`mt-4 ${titleSize} font-bold leading-[1.05]`}
              >
                Los platos que nos dan nombre
              </h2>
              <p className="mt-5 text-lg leading-relaxed opacity-85">
                Recetas que repetimos cada semana porque siguen sorprendiendo a
                quienes ya las conocen y enamorando a los que las prueban por
                primera vez.
              </p>
            </motion.div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {dishPhotos.slice(0, 4).map((photo, i) => {
                const dish = fallbackDishes[i] ?? fallbackDishes[i % fallbackDishes.length];
                return (
                  <motion.div
                    key={i}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                  >
                    <div
                      className="aspect-square overflow-hidden rounded-2xl bg-cover bg-center"
                      style={{ backgroundImage: `url('${photo}')` }}
                      aria-hidden
                    />
                    <h3 style={display} className="mt-5 text-xl font-semibold">
                      {dish?.name ?? "Plato del día"}
                    </h3>
                    {dish?.tagline && (
                      <p
                        style={{ color: palette.accent }}
                        className="mt-2 text-[13px] font-semibold uppercase tracking-wider"
                      >
                        {dish.tagline}
                      </p>
                    )}
                    {dish?.blurb && (
                      <p className="mt-2 text-base leading-relaxed opacity-85">
                        {dish.blurb}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CARTA DESTACADA — priced menu (includes the user's featured dishes +
          invented ones). Editorial uses the photo-aside layout (spacious) and
          Compacto drops the photo entirely. */}
      {isRestauracion && (
        <FeaturedMenu
          variant={isCompact ? "no-photo" : "photo-aside"}
          menu={
            copy?.menu &&
            copy.menu.leftItems?.length &&
            copy.menu.rightItems?.length
              ? copy.menu
              : getFeaturedMenu(cuisine ?? "fusion")
          }
          photo={dishPhotos[0] ?? valorImg}
          palette={palette}
          display={display}
          fg={readableOn(palette.surface)}
          density={density}
        />
      )}

      {/* TEAM — 4-up portrait grid (no carousel) */}
      <section className={`relative isolate overflow-hidden ${padX} ${padY}`}>
        {/* Radial accent blob — dynamism on what would otherwise be plain bg */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-1/3 -z-10 size-[640px] rounded-full opacity-50 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${palette.accent}33 0%, transparent 70%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            {...fadeUp}
            className="mb-14 grid items-end gap-10 sm:grid-cols-2"
          >
            <div>
              <span
                style={{ color: palette.accent }}
                className="text-xs font-bold uppercase tracking-[0.32em]"
              >
                Equipo
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                Las personas detrás de {data.businessName}
              </h2>
            </div>
            <p className="max-w-lg text-lg leading-relaxed opacity-85">
              Cada proyecto pasa por manos con nombre y apellido. Sin
              intermediarios, sin departamentos opacos: trabajas directamente
              con quien firma el trabajo y te explica cada paso.
            </p>
          </motion.div>

          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {team.slice(0, 4).map((member, i) => {
              const portrait = pickPortrait(member, i);
              return (
                <motion.div
                  key={i}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                >
                  <div
                    className="aspect-[4/5] overflow-hidden rounded-2xl bg-cover bg-center"
                    style={{
                      backgroundImage: portrait ? `url('${portrait}')` : undefined,
                      backgroundColor: portrait ? undefined : `${palette.accent}22`,
                    }}
                    aria-hidden
                  />
                  <h3 style={display} className="mt-5 text-xl font-semibold">
                    {member.name}
                  </h3>
                  <p
                    style={{ color: palette.accent }}
                    className="mt-2 text-[13px] font-semibold uppercase tracking-[0.18em]"
                  >
                    {member.role}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL — big editorial quote */}
      {testimonials.length > 0 && (
        <section
          className={`${padX} ${padYDark}`}
          style={{ backgroundColor: palette.text, color: fgOnInvert }}
        >
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeUp}>
              <IconQuoteMark
                className="size-12 opacity-40"
                style={{ color: palette.accent }}
              />
              <blockquote
                style={display}
                className="mt-6 text-balance text-3xl font-medium leading-[1.25] sm:text-4xl"
              >
                «{testimonials[0].text}»
              </blockquote>
              <footer className="mt-8 flex items-center gap-4">
                <span
                  style={accentChip}
                  className="inline-flex size-12 items-center justify-center rounded-full text-sm font-bold"
                >
                  {testimonials[0].name.charAt(0)}
                </span>
                <div>
                  <p style={display} className="font-semibold">
                    {testimonials[0].name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                    Cliente verificado
                  </p>
                </div>
              </footer>
            </motion.div>

            {testimonials.length > 1 && (
              <div className="mt-16 grid gap-8 border-t pt-12 sm:grid-cols-2" style={{ borderColor: `${fgOnInvert}1f` }}>
                {testimonials.slice(1, 3).map((t, i) => (
                  <motion.div
                    key={i}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                  >
                    <p className="text-lg leading-relaxed opacity-90">«{t.text}»</p>
                    <p
                      style={{ ...display, color: palette.accent }}
                      className="mt-5 text-[13px] font-semibold uppercase tracking-[0.18em]"
                    >
                      — {t.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CONTACTO — editorial split */}
      <section
        className={`relative isolate overflow-hidden border-t ${padX} ${padY}`}
        style={{ ...hairline, backgroundColor: palette.surface }}
      >
        {/* Soft vertical gradient veil — contact section reads warmer than the
            neighbouring team section despite using the same surface base. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${palette.accent}0d 100%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            {...fadeUp}
            className="grid items-stretch gap-12 sm:grid-cols-2"
          >
            <div className="flex flex-col">
              <span
                style={{ color: palette.accent }}
                className="text-xs font-bold uppercase tracking-[0.32em]"
              >
                Contacto
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                {assets.labels.bridgeHeadline}
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed opacity-85">
                {assets.labels.contactSectionSubtitle}
              </p>

              <ul className="mt-10 space-y-6">
                <li className="flex items-start gap-4">
                  <IconMapPin
                    className="mt-0.5 size-6 shrink-0"
                    style={{ color: palette.accent }}
                  />
                  <div>
                    <p className="text-[13px] uppercase tracking-[0.18em] opacity-70">
                      Dirección
                    </p>
                    <p className="text-base font-medium sm:text-lg">{fullAddress || "Madrid, España"}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <IconPhone
                    className="mt-0.5 size-6 shrink-0"
                    style={{ color: palette.accent }}
                  />
                  <div>
                    <p className="text-[13px] uppercase tracking-[0.18em] opacity-70">
                      Teléfono
                    </p>
                    <p className="text-base font-medium sm:text-lg">+34 900 000 000</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <IconMail
                    className="mt-0.5 size-6 shrink-0"
                    style={{ color: palette.accent }}
                  />
                  <div>
                    <p className="text-[13px] uppercase tracking-[0.18em] opacity-70">
                      Email
                    </p>
                    <p className="text-base font-medium sm:text-lg">
                      hola@{data.businessName.toLowerCase().replace(/\s+/g, "")}.es
                    </p>
                  </div>
                </li>
              </ul>

              {/* Schedule strip — llena el final de la columna para que el mapa
                  no quede más alto que el texto. */}
              <div
                className="mt-auto rounded-2xl border p-5"
                style={hairline}
              >
                <p className="text-[13px] uppercase tracking-[0.18em] opacity-70">
                  Horario
                </p>
                <p className="mt-2 text-base font-medium leading-relaxed">
                  Lun – Vie · 9:00 – 20:00
                  <br />
                  Sáb · 10:00 – 14:00
                </p>
              </div>
            </div>

            <div
              className="overflow-hidden rounded-2xl border"
              style={hairline}
            >
              <iframe
                src={mapEmbedUrl}
                className="h-full min-h-[420px] w-full"
                loading="lazy"
                title="Mapa de ubicación"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t px-12 py-10 text-sm"
        style={{ ...hairline, backgroundColor: palette.surface }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span style={display} className="font-semibold">
            {data.businessName}
          </span>
          <span className="opacity-60">
            © {new Date().getFullYear()} {data.businessName}. Todos los derechos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
