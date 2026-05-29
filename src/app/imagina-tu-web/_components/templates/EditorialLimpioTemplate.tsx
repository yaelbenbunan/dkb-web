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
  getRestauracionRolePhoto,
  isSupportedSector,
  type Cuisine,
} from "./sector-assets";

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
    if (pool.length === 0) return [undefined, undefined];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1] ?? shuffled[0]];
  }, [assets]);

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
          className="hidden gap-8 text-xs uppercase tracking-[0.18em] opacity-75 sm:flex"
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

      {/* HERO — centered editorial */}
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

        {/* Hero image — wide rounded, sits below the headline. Hidden in
            compact mode so the page starts straight into content. */}
        {heroImg && !isCompact && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.9, ease: [0.21, 1, 0.34, 1] }}
            className="relative mx-auto mt-16 aspect-[16/7] w-full max-w-5xl overflow-hidden rounded-3xl"
            style={{ boxShadow: `0 30px 60px -30px ${palette.text}33` }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${heroImg}')` }}
              aria-hidden
            />
            {/* Soft bottom gradient so the section flows back into the page */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3"
              style={{
                background: `linear-gradient(to top, ${palette.bg}66, transparent)`,
              }}
            />
          </motion.div>
        )}
      </section>

      {/* NUMBERED EDITORIAL BULLETS — 6 items in 3 cols */}
      <section
        className={`border-y ${padX} ${padY}`}
        style={{ ...hairline, backgroundColor: palette.surface }}
      >
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="grid gap-10 sm:grid-cols-[1fr_2fr]">
            <div>
              <span
                style={{ color: palette.accent }}
                className="text-[11px] font-bold uppercase tracking-[0.32em]"
              >
                Cómo trabajamos
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                {valorTitle}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed opacity-75">
                {valorIntro}
              </p>
            </div>
            {valorImg && !isCompact && (
              <div
                className="aspect-[5/4] overflow-hidden rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url('${valorImg}')` }}
                aria-hidden
              />
            )}
          </motion.div>

          <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {bullets.map((b, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: 0.05 * i }}
                className="border-t pt-6"
                style={hairline}
              >
                <div
                  style={{ ...display, color: palette.accent }}
                  className="text-3xl font-bold leading-none"
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 style={display} className="mt-4 text-xl font-semibold">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed opacity-75">{b.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES — asymmetric list */}
      <section className={`${padX} ${padY}`}>
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="grid gap-10 sm:grid-cols-[1fr_2fr]">
            <div>
              <span
                style={{ color: palette.accent }}
                className="text-[11px] font-bold uppercase tracking-[0.32em]"
              >
                {assets.labels.servicesSectionPill}
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                {servicesTitle}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed opacity-75">
                {assets.labels.servicesSectionSubtitle}
              </p>
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
                        <p className="mt-2 text-sm leading-relaxed opacity-75">
                          {s.blurb}
                        </p>
                      )}
                      {tagline && (
                        <p
                          style={{ color: palette.accent }}
                          className="mt-1 text-xs font-semibold uppercase tracking-wider"
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

      {/* RESTAURACION — minimal dish strip when sector matches and photos exist */}
      {isRestauracion && dishPhotos.length > 0 && (
        <section
          className={`border-y ${padX} ${padY}`}
          style={{ ...hairline, backgroundColor: palette.surface }}
        >
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp} className="mb-12 max-w-2xl">
              <span
                style={{ color: palette.accent }}
                className="text-[11px] font-bold uppercase tracking-[0.32em]"
              >
                Especialidades
              </span>
              <h2
                style={display}
                className={`mt-4 ${titleSize} font-bold leading-[1.05]`}
              >
                Los platos que nos dan nombre
              </h2>
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
                    <h3 style={display} className="mt-4 text-lg font-semibold">
                      {dish?.name ?? "Plato del día"}
                    </h3>
                    {dish?.tagline && (
                      <p
                        style={{ color: palette.accent }}
                        className="mt-1 text-xs font-semibold uppercase tracking-wider"
                      >
                        {dish.tagline}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TEAM — 4-up portrait grid (no carousel) */}
      <section className={`${padX} ${padY}`}>
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-12 grid gap-10 sm:grid-cols-[1fr_2fr]">
            <div>
              <span
                style={{ color: palette.accent }}
                className="text-[11px] font-bold uppercase tracking-[0.32em]"
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
            <p className="max-w-md text-base leading-relaxed opacity-75">
              Cada proyecto pasa por manos con nombre y apellido. Aquí los tienes.
            </p>
          </motion.div>

          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
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
                  <h3 style={display} className="mt-5 text-lg font-semibold">
                    {member.name}
                  </h3>
                  <p
                    style={{ color: palette.accent }}
                    className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]"
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
                    <p className="text-base leading-relaxed opacity-85">«{t.text}»</p>
                    <p
                      style={{ ...display, color: palette.accent }}
                      className="mt-4 text-sm font-semibold uppercase tracking-[0.18em]"
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
      <section className={`${padX} ${padY}`}>
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="grid gap-12 sm:grid-cols-[1fr_1fr]">
            <div>
              <span
                style={{ color: palette.accent }}
                className="text-[11px] font-bold uppercase tracking-[0.32em]"
              >
                Contacto
              </span>
              <h2
                style={display}
                className={`mt-4 text-balance ${titleSize} font-bold leading-[1.1]`}
              >
                {assets.labels.bridgeHeadline}
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed opacity-75">
                {assets.labels.contactSectionSubtitle}
              </p>

              <ul className="mt-10 space-y-5">
                <li className="flex items-start gap-4">
                  <IconMapPin
                    className="mt-0.5 size-5 shrink-0"
                    style={{ color: palette.accent }}
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                      Dirección
                    </p>
                    <p className="text-base font-medium">{fullAddress || "Madrid, España"}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <IconPhone
                    className="mt-0.5 size-5 shrink-0"
                    style={{ color: palette.accent }}
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                      Teléfono
                    </p>
                    <p className="text-base font-medium">+34 900 000 000</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <IconMail
                    className="mt-0.5 size-5 shrink-0"
                    style={{ color: palette.accent }}
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-60">
                      Email
                    </p>
                    <p className="text-base font-medium">
                      hola@{data.businessName.toLowerCase().replace(/\s+/g, "")}.es
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div
              className="overflow-hidden rounded-2xl border"
              style={hairline}
            >
              <iframe
                src={mapEmbedUrl}
                className="h-full min-h-[360px] w-full"
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
