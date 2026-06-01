"use client";

import { useEffect, useMemo, useState, type CSSProperties, type SVGProps } from "react";
import { motion, type Variants } from "motion/react";
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
  type FeaturedMenu,
  type SupportedSector,
} from "./sector-assets";

// --- Scroll animation presets -----------------------------------------------
// Single source of truth for entrance animations so every section feels
// consistent. Sections use `whileInView` so they animate when scrolled to.

const VIEWPORT = { once: true, margin: "-80px" } as const;

const fadeUpProps = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: 0.6, ease: [0.21, 1, 0.34, 1] as [number, number, number, number] },
};

const fadeInProps = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: VIEWPORT,
  transition: { duration: 0.7 },
};

const staggerParentVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const staggerChildVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 1, 0.34, 1] },
  },
};

export interface InformativaSectorData {
  businessName: string;
  /** Sector slug — must be one of `SupportedSector` for the template to render */
  sector: string;
  offerings: string[];
  /** Only when sector === "restauracion" */
  cuisine?: Cuisine | "";
  palette: string;
  /** Present only when palette === CUSTOM_PALETTE_SLUG */
  customColors?: CustomPaletteColors;
  typography: string;
  valueProp: string;
  logoDataUrl?: string;
  address?: string;
  city?: string;
  /** Real image scraped from the user's current website (hero background). */
  sourceImageUrl?: string;
}

interface Props {
  data: InformativaSectorData;
  copy: SectorInformativaCopyResponse | null;
}

// --- Spanish name → gender heuristic (fallback if AI didn't supply gender) ----
const NAMES_FEMALE = new Set([
  "ana", "andrea", "antonia", "beatriz", "blanca", "carla", "carmen", "carolina",
  "cecilia", "clara", "claudia", "cristina", "daniela", "diana", "dolores", "elena",
  "elisa", "emilia", "eva", "fátima", "fatima", "gabriela", "gloria", "inés", "ines",
  "irene", "isabel", "julia", "laura", "leticia", "lidia", "lola", "lucía", "lucia",
  "luisa", "maite", "manuela", "mar", "marina", "marta", "maría", "maria", "mercedes",
  "miriam", "mónica", "monica", "nerea", "noelia", "nuria", "olga", "paloma", "patricia",
  "paula", "pilar", "raquel", "rocío", "rocio", "rosa", "sandra", "sara", "silvia",
  "sofía", "sofia", "soledad", "susana", "teresa", "verónica", "veronica", "victoria",
  "violeta", "virginia", "yolanda",
]);
const NAMES_MALE = new Set([
  "alberto", "alejandro", "alfonso", "alfredo", "álvaro", "alvaro", "andrés", "andres",
  "ángel", "angel", "antonio", "arturo", "borja", "carlos", "cristian", "cristóbal",
  "cristobal", "daniel", "david", "diego", "domingo", "eduardo", "emilio", "enrique",
  "ernesto", "esteban", "fabián", "fabian", "felipe", "fernando", "francisco", "gabriel",
  "germán", "german", "gonzalo", "guillermo", "héctor", "hector", "ignacio", "iván",
  "ivan", "jaime", "javier", "jesús", "jesus", "joaquín", "joaquin", "joel", "jorge",
  "josé", "jose", "juan", "julio", "leandro", "leonardo", "leopoldo", "lorenzo", "luis",
  "manuel", "marcelo", "marco", "marcos", "mario", "martín", "martin", "mateo", "miguel",
  "moisés", "moises", "néstor", "nestor", "nicolás", "nicolas", "óscar", "oscar", "pablo",
  "pedro", "rafael", "ramón", "ramon", "raúl", "raul", "ricardo", "roberto", "rodrigo",
  "rubén", "ruben", "salvador", "samuel", "santiago", "sergio", "sebastián", "sebastian",
  "tomás", "tomas", "vicente", "víctor", "victor",
]);

function guessGender(fullName: string): "male" | "female" {
  // Strip Dr./Dra. prefix to get the actual first name
  const cleaned = fullName.replace(/^d(r|ra)\.\s*/i, "").trim();
  const first = cleaned.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (NAMES_FEMALE.has(first)) return "female";
  if (NAMES_MALE.has(first)) return "male";
  // Suffix rule fallback
  return first.endsWith("a") ? "female" : "male";
}

// --- Flat SVG icons -----------------------------------------------------------

type IconProps = SVGProps<SVGSVGElement>;
const baseSvg = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Sector-specific icons (stethoscope, book, code, etc.) live in
// `./sector-assets`. The template only keeps inline the icons used in
// bullets, contact rows, form fields and decorations — all sector-neutral.
const IconCheck = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </svg>
);
const IconClock = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IconHandshake = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M11 17l-3 3-5-5 6-6 4 4" />
    <path d="M13 11l4-4 4 4-3 3-3-3" />
    <path d="M13 13l3 3" />
    <path d="M9 15l3 3" />
  </svg>
);
const IconShield = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />
    <path d="M9 12.5l2 2 4-4" />
  </svg>
);
const IconBuilding = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M4 21V5l8-3 8 3v16" />
    <path d="M9 21v-6h6v6" />
    <path d="M8 9h1M11 9h2M15 9h1M8 12h1M11 12h2M15 12h1" />
  </svg>
);
const IconSparkles = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
  </svg>
);
const IconMapPin = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const IconPhone = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);
const IconMail = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
const IconFacebook = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v8h3v-8h2.5l.5-3H14V8.5c0-.3.2-.5.5-.5z" />
  </svg>
);
const IconInstagram = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
  </svg>
);
const IconCalendar = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
const IconArrowRight = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconQuote = (p: IconProps) => (
  <svg {...baseSvg} {...p} fill="currentColor" stroke="none">
    <path d="M9 7H5v6c0 2 1 4 3 4v-2c-1 0-2-1-2-2v-1h3V7zm10 0h-4v6c0 2 1 4 3 4v-2c-1 0-2-1-2-2v-1h3V7z" />
  </svg>
);
const IconStar = (p: IconProps) => (
  <svg {...baseSvg} {...p} fill="currentColor" stroke="none">
    <path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7-6.2-3.5L5.8 21l1.4-7L2 9.4l7-.9L12 2z" />
  </svg>
);

const BULLET_ICONS = [
  IconCheck,
  IconClock,
  IconHandshake,
  IconShield,
  IconBuilding,
  IconSparkles,
];

// --- Template -----------------------------------------------------------------

export function InformativaSectorTemplate({ data, copy }: Props) {
  const palette = resolvePalette(data.palette, data.customColors);
  const typo = getTypography(data.typography);
  const assets = isSupportedSector(data.sector) ? SECTOR_ASSETS[data.sector] : null;

  const [heroBgImg, valorAgregadoImg] = useMemo(() => {
    const pool = assets?.photosAmbient ?? [];
    const shuffled =
      pool.length > 0 ? [...pool].sort(() => Math.random() - 0.5) : [];
    // Prefer the user's real website image for the hero when available.
    const hero = data.sourceImageUrl || shuffled[0];
    const valor = shuffled[1] ?? shuffled[0];
    return [hero, valor];
  }, [assets, data.sourceImageUrl]);

  if (!palette || !typo || !assets) return null;
  const SERVICE_ICONS = assets.serviceIcons;

  const wrapper: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.text,
    fontFamily: `var(${typo.bodyVar}), system-ui, sans-serif`,
  };
  const display: CSSProperties = {
    fontFamily: `var(${typo.displayVar}), system-ui, sans-serif`,
  };
  // Foreground colors derived per background to never end up light-on-light or
  // dark-on-dark, regardless of the chosen palette.
  const fgOnAccent = readableOn(palette.accent);
  const fgOnSurface = palette.text; // surface is always paired with text in palettes
  const fgOnInvert = readableOn(palette.text); // for the dark testimonials section
  const accentBtn: CSSProperties = {
    background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accent}dd 100%)`,
    color: fgOnAccent,
    boxShadow: `0 10px 25px -10px ${palette.accent}77`,
  };
  const accentText: CSSProperties = { color: palette.accent };
  const accentSoft: CSSProperties = {
    backgroundColor: palette.accent + "14",
    color: palette.accent,
  };

  // Capitalize first letter of any user-supplied offering so the cards never
  // show inconsistent casing (e.g. "implantes dentales" vs "Ortodoncia").
  const titleize = (s: string) => {
    const trimmed = s.trim().replace(/\s+/g, " ");
    if (!trimmed) return trimmed;
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  // All fallbacks come from the sector assets so a non-salud preview never
  // accidentally shows "Pide tu cita" or "Nuestros tratamientos" if the AI
  // call fails. CRITICAL: never paste `data.valueProp` (the user's raw text)
  // into the design — that text is rewriter input for the AI, not display
  // copy. Use the sector default instead.
  const headline = copy?.heroHeadline ?? `Bienvenidos a ${data.businessName}`;
  const tagline = copy?.heroTagline ?? assets.labels.defaultHeroTagline;
  const ctaText = copy?.ctaText ?? assets.labels.defaultCtaText;
  const servicesTitle = copy?.sectionTitle ?? assets.labels.defaultServicesTitle;
  const services =
    copy?.offerings ??
    data.offerings.map((name) => ({ name: titleize(name), blurb: "" }));

  const valorAgregadoTitle =
    copy?.valorAgregadoTitle ?? assets.labels.defaultValorAgregadoTitle;
  const valorAgregadoIntro =
    copy?.valorAgregadoIntro ?? assets.labels.defaultValorAgregadoIntro;

  // Bullets always render as 3 columns × 2 rows = 6. Schema enforces 6; if
  // the AI somehow returned fewer, pad with generic fallbacks so the grid
  // never has a hole.
  const FALLBACK_BULLETS = [
    { title: "Atención personalizada", text: "Te dedicamos el tiempo que necesitas." },
    { title: "Equipo profesional", text: "Especialistas con experiencia en tu sector." },
    { title: "Instalaciones modernas", text: "Espacios pensados para tu comodidad." },
    { title: "Respuesta rápida", text: "Contacto y seguimiento sin demoras." },
    { title: "Trato cercano", text: "Cuidamos cada detalle para que la experiencia importe." },
    { title: "Compromiso real", text: "Hacemos lo que decimos, no inflamos promesas." },
  ];
  const rawBullets = copy?.bullets ?? FALLBACK_BULLETS;
  const bullets = Array.from({ length: 6 }, (_, i) =>
    rawBullets[i] ?? FALLBACK_BULLETS[i]
  );

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

  return (
    <div style={wrapper}>
      {/* HERO with header absolute on top (so the photo bleeds under it) */}
      <section className="relative isolate overflow-hidden">
        {/* Background image — visible across the whole hero with a soft Ken
            Burns effect to add subtle life. */}
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url('${heroBgImg}')` }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: "easeOut" }}
        />
        {/* Color overlay — VERY strong on the left so headline + tagline read
            on any photo regardless of the user's chosen palette. Fades to
            (almost) transparent on the right so the photo shows clearly. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(105deg, ${palette.bg} 0%, ${palette.bg}f5 35%, ${palette.bg}cc 55%, ${palette.bg}55 75%, transparent 100%)`,
          }}
        />
        {/* Subtle accent veil on the photo side */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 -z-10 w-1/2"
          style={{
            background: `linear-gradient(135deg, transparent 0%, ${palette.accent}1a 100%)`,
          }}
        />
        {/* Decorative accent blob */}
        <div
          aria-hidden
          className="absolute -right-20 -top-20 -z-10 size-96 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "33" }}
        />

        {/* Floating header (semi-transparent, photo shows through) */}
        <header
          className="relative z-10 flex items-center justify-between px-12 py-5 backdrop-blur-md"
          style={{
            backgroundColor: palette.bg + "66",
            borderBottom: `1px solid ${palette.accent}1f`,
          }}
        >
          <div className="flex items-center gap-3">
            {data.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoDataUrl}
                alt={data.businessName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span style={display} className="text-lg font-bold tracking-tight">
                {data.businessName}
              </span>
            )}
          </div>
          <nav className="flex gap-7 text-sm font-medium opacity-90" style={display}>
            <span>Inicio</span>
            <span>{assets.labels.navServicesLabel}</span>
            <span>Equipo</span>
            <span>Contacto</span>
          </nav>
          <button
            type="button"
            style={accentBtn}
            className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-xs font-semibold"
          >
            {ctaText}
            <IconArrowRight className="size-4" />
          </button>
        </header>

        {/* Hero content */}
        <div className="relative px-12 pb-24 pt-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 grid-cols-[1.1fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.21, 1, 0.34, 1] }}
            >
              <div
                style={accentSoft}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              >
                <span className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <IconStar key={i} className="size-3" />
                  ))}
                </span>
                <span>{assets.labels.ratingText}</span>
              </div>
              <h1
                style={{
                  ...display,
                  // Soft halo behind the text — works for dark or light
                  // palette.text without looking like a "shadow effect".
                  // Critical for hero legibility on busy photos.
                  textShadow: `0 1px 0 ${palette.bg}, 0 0 18px ${palette.bg}80`,
                }}
                className="mt-5 text-6xl font-bold leading-[1.02] tracking-tight"
              >
                {headline}
              </h1>
              <p
                className="mt-6 max-w-lg text-lg leading-relaxed sm:text-xl"
                style={{
                  color: palette.text,
                  textShadow: `0 0 14px ${palette.bg}cc`,
                }}
              >
                {tagline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  style={accentBtn}
                  className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition hover:scale-[1.03]"
                >
                  {ctaText}
                  <IconArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  style={{
                    borderColor: palette.accent,
                    color: palette.accent,
                    backgroundColor: palette.bg + "cc",
                  }}
                  className="inline-flex h-12 items-center rounded-full border px-6 text-sm font-semibold backdrop-blur-sm"
                >
                  Conoce al equipo
                </button>
              </div>
            </motion.div>

            {/* Appointment form (glassy) */}
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 1, 0.34, 1] }}
              className="rounded-3xl border p-7 shadow-2xl backdrop-blur-xl"
              style={{
                borderColor: palette.accent + "33",
                backgroundColor: palette.surface + "eb",
                color: fgOnSurface,
              }}
            >
              <p style={display} className="text-xl font-bold">
                <span style={{ color: fgOnSurface }}>{assets.labels.formTitle}</span>
              </p>
              <p className="mt-1 text-xs" style={{ color: fgOnSurface + "99" }}>
                Te confirmamos en menos de 24h.
              </p>
              <div className="mt-5 space-y-3">
                <FormField label="Nombre" placeholder="Tu nombre" palette={palette} />
                <FormField label="Teléfono" placeholder="+34 600 000 000" palette={palette} />
                <FormField label="Email" placeholder="tu@email.com" palette={palette} />
                {data.sector === "salud" && (
                  <FormField
                    label="Fecha preferida"
                    placeholder="Selecciona una fecha"
                    palette={palette}
                    icon={<IconCalendar className="size-4" />}
                  />
                )}
                <button
                  type="button"
                  style={accentBtn}
                  className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
                >
                  {assets.labels.formSubmitText}
                  <IconArrowRight className="size-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* VALOR AGREGADO — clean surface with photo overflowing the section
          top edge to bridge with the Hero. Big decorative number "01". */}
      <section
        className="relative overflow-hidden px-12 py-24"
        style={{ backgroundColor: palette.surface }}
      >
        <div
          aria-hidden
          className="absolute -left-32 top-32 size-80 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "1a" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 grid-cols-2">
          <motion.div className="relative" {...fadeUpProps}>
            <div
              aria-hidden
              className="absolute -bottom-5 -left-5 h-3/4 w-3/4 rounded-3xl"
              style={{ backgroundColor: palette.accent + "26" }}
            />
            <div
              className="relative overflow-hidden rounded-3xl shadow-2xl"
              style={{ boxShadow: `0 25px 60px -20px ${palette.accent}44` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={valorAgregadoImg}
                alt=""
                className="block aspect-square w-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const fb = el.parentElement?.querySelector("[data-fallback]") as HTMLElement | null;
                  if (fb) fb.style.display = "block";
                }}
              />
              <div
                data-fallback
                className="aspect-square w-full"
                style={{ background: palette.heroGradient, display: "none" }}
                aria-hidden
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, transparent 50%, ${palette.text}33 100%)`,
                }}
              />
            </div>
            {/* Floating accent badge */}
            <div
              className="absolute -right-4 -top-4 rounded-2xl px-5 py-3 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)`,
                color: fgOnAccent,
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
                Atención
              </p>
              <p style={display} className="text-xl font-bold leading-tight">
                cercana
              </p>
            </div>
          </motion.div>
          <motion.div {...fadeUpProps} transition={{ ...fadeUpProps.transition, delay: 0.1 }}>
            <span
              style={accentSoft}
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            >
              ¿Por qué {data.businessName}?
            </span>
            <h2 style={display} className="mt-4 text-4xl font-bold tracking-tight">
              {valorAgregadoTitle}
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed opacity-90">
              {valorAgregadoIntro}
            </p>
            <motion.ul
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
              variants={staggerParentVariants}
              className="mt-8 grid gap-5 grid-cols-2"
            >
              {bullets.map((b, i) => {
                const Icon = BULLET_ICONS[i % BULLET_ICONS.length];
                return (
                  <motion.li
                    key={i}
                    variants={staggerChildVariants}
                    className="flex gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      backgroundColor: palette.surface,
                      borderColor: palette.accent + "1a",
                    }}
                  >
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${palette.accent}22, ${palette.accent}11)`,
                        color: palette.accent,
                      }}
                      aria-hidden
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p style={display} className="text-lg font-bold">
                        {b.title}
                      </p>
                      <p className="mt-1.5 text-base leading-relaxed opacity-85">
                        {b.text}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* EQUIPO — accent-tinted section with a subtle dotted-noise texture
          overlay so it never reads as flat. Two blurred accent blobs add
          depth without dominating. */}
      <section
        className="relative overflow-hidden px-12 py-28"
        style={{
          backgroundColor: palette.accent + "1f",
        }}
      >
        {/* Subtle dot pattern overlay — low opacity, color derived from text
            so it adapts to both light and dark palettes. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${palette.text}26 1px, transparent 1.5px)`,
            backgroundSize: "22px 22px",
            opacity: 0.55,
          }}
        />
        <div
          aria-hidden
          className="absolute -left-24 top-20 size-72 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "26" }}
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-10 size-80 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "1f" }}
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div className="mb-12 text-center" {...fadeUpProps}>
            <span
              style={accentSoft}
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            >
              Equipo
            </span>
            <h2
              style={{
                ...display,
                color: palette.text,
                textShadow: `0 0 14px ${palette.bg}cc`,
              }}
              className="mt-4 text-5xl font-bold tracking-tight"
            >
              {assets.labels.teamSectionTitle}
            </h2>
            <p
              className="mx-auto mt-5 max-w-xl text-lg leading-relaxed"
              style={{
                color: palette.text,
                opacity: 0.85,
                textShadow: `0 0 10px ${palette.bg}99`,
              }}
            >
              {assets.labels.teamSectionSubtitle}
            </p>
          </motion.div>
          <TeamCarousel
            team={team}
            palette={palette}
            display={display}
            photosMale={assets.photosMale}
            photosFemale={assets.photosFemale}
            sector={data.sector}
          />
        </div>
      </section>

      {/* SERVICIOS — soft 2-stop gradient (surface → accent 10%) so the
          section reads as "tinted" without the harsh 3-color heroGradient
          that some palettes had. Cards keep their solid surface fill, so
          they always stand out cleanly. */}
      <section
        className="relative overflow-hidden px-12 py-28"
        style={{
          background: `linear-gradient(135deg, ${palette.surface} 0%, ${palette.accent}1a 100%)`,
        }}
      >
        <div
          aria-hidden
          className="absolute right-0 top-0 size-96 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "1f" }}
        />
        <div className="relative mx-auto max-w-6xl">
          <motion.div className="mb-12 flex items-end justify-between gap-8" {...fadeUpProps}>
            <div>
              <span
                style={accentSoft}
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              >
                {assets.labels.servicesSectionPill}
              </span>
              <h2 style={display} className="mt-4 text-5xl font-bold tracking-tight">
                {servicesTitle}
              </h2>
            </div>
            <p className="max-w-sm text-right text-lg leading-relaxed opacity-85">
              {assets.labels.servicesSectionSubtitle}
            </p>
          </motion.div>
          {data.sector === "restauracion" ? (
            <DishesGrid
              dishes={services}
              cuisine={data.cuisine || "fusion"}
              palette={palette}
              display={display}
              fgOnSurface={fgOnSurface}
              accentBtn={accentBtn}
            />
          ) : (
            <>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={VIEWPORT}
                variants={staggerParentVariants}
                className="grid gap-6 grid-cols-4"
              >
                {services.slice(0, 4).map((s, i) => {
                  const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                  return (
                    <motion.article
                      key={i}
                      variants={staggerChildVariants}
                      className="group relative overflow-hidden rounded-3xl border p-6 shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
                      style={{
                        backgroundColor: palette.surface,
                        color: fgOnSurface,
                        borderColor: palette.accent + "1f",
                      }}
                    >
                      <div
                        aria-hidden
                        className="absolute right-0 top-0 size-32 -translate-y-1/2 translate-x-1/2 rounded-full transition group-hover:scale-150"
                        style={{ backgroundColor: palette.accent + "12" }}
                      />
                      <span
                        className="relative grid size-14 place-items-center rounded-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${palette.accent}22, ${palette.accent}11)`,
                          color: palette.accent,
                        }}
                        aria-hidden
                      >
                        <Icon className="size-7" />
                      </span>
                      <h3
                        style={{ ...display, color: fgOnSurface }}
                        className="relative mt-5 text-lg font-bold"
                      >
                        {titleize(s.name)}
                      </h3>
                      <p
                        className="relative mt-2 text-base leading-relaxed"
                        style={{ color: fgOnSurface + "cc" }}
                      >
                        {s.blurb ||
                          `${assets.labels.defaultServicesTitle.replace(
                            "Nuestros ",
                            "",
                          )} adaptados a tus necesidades.`}
                      </p>
                      <button
                        type="button"
                        style={accentText}
                        className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                      >
                        Ver más
                        <IconArrowRight className="size-4" />
                      </button>
                    </motion.article>
                  );
                })}
              </motion.div>
              {services.length > 4 && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    style={accentBtn}
                    className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition hover:scale-[1.03]"
                  >
                    Ver todos los {servicesTitle.replace(/^Nuestros?\s+/i, "").toLowerCase()}
                    <IconArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* FEATURED MENU — magazine-style menu shown only for restauración,
          right after the "Especialidades de la casa" dish grid. Items and
          prices are 100% fabricated per cuisine (zero AI dependency). */}
      {data.sector === "restauracion" && (
        <FeaturedMenuSection
          cuisine={data.cuisine || "fusion"}
          menu={copy?.menu}
          palette={palette}
          display={display}
          fgOnSurface={fgOnSurface}
        />
      )}

      {/* CTA BRIDGE — floating banner that connects Servicios and Testimonios,
          adding visual continuity (no two consecutive sections feel detached). */}
      <div className="relative z-30 -my-14 px-12">
        <motion.div
          {...fadeUpProps}
          className="mx-auto flex max-w-5xl items-center justify-between gap-8 rounded-3xl px-10 py-7 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${palette.accent} 0%, ${shadeColor(palette.accent, -15)} 100%)`,
            color: fgOnAccent,
            boxShadow: `0 30px 60px -25px ${palette.accent}88`,
          }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
              ¿Qué esperas?
            </p>
            <h3 style={display} className="mt-1 text-2xl font-bold">
              {assets.labels.bridgeHeadline}
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:scale-105"
            style={{ backgroundColor: palette.surface, color: palette.accent }}
          >
            {ctaText}
            <IconArrowRight className="size-4" />
          </button>
        </motion.div>
      </div>

      {/* TESTIMONIOS — high-contrast section using the inverse of palette.text
          (works for both light and dark palettes). */}
      <section
        className="relative overflow-hidden px-12 pb-24 pt-32"
        style={{
          background: `linear-gradient(135deg, ${palette.text} 0%, ${shadeColor(palette.text, -10)} 50%, ${palette.accent} 200%)`,
          color: fgOnInvert,
        }}
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="absolute -right-32 -top-32 size-96 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "55" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 size-96 rounded-full blur-3xl"
          style={{ backgroundColor: palette.accent + "33" }}
        />
        {/* Massive decorative quote in background */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 text-[20rem] font-serif leading-none opacity-[0.05]"
          style={{ color: palette.accent, ...display }}
        >
          “
        </div>

        <div className="relative mx-auto max-w-6xl">
          <motion.div className="mb-14 text-center" {...fadeUpProps}>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: palette.accent + "33", color: fgOnInvert }}
            >
              Testimonios
            </span>
            <h2
              style={display}
              className="mx-auto mt-4 max-w-3xl text-5xl font-bold tracking-tight"
            >
              Lo que dicen quienes ya{" "}
              <span style={{ color: palette.accent }}>confían en nosotros</span>
            </h2>
          </motion.div>
          <TestimonialsCarousel
            testimonials={testimonials}
            palette={palette}
            display={display}
            fg={fgOnInvert}
            fgOnAccent={fgOnAccent}
            authorLabel={assets.labels.testimonialAuthorLabel}
          />
        </div>
      </section>

      {/* CONTACTO — surface coming UP from the dark testimonials section,
          with a diagonal accent fade ending in palette.bg so the footer
          (which sits on palette.bg) joins seamlessly. */}
      <section
        className="relative overflow-hidden px-12 py-24"
        style={{
          background: `linear-gradient(160deg, ${palette.surface} 0%, ${palette.accent}1a 55%, ${palette.bg} 100%)`,
        }}
      >
        <div className="relative mx-auto grid max-w-6xl items-start gap-10 grid-cols-2">
          <motion.div
            {...fadeInProps}
            className="overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              borderColor: palette.accent + "33",
              boxShadow: `0 25px 60px -20px ${palette.accent}33`,
            }}
          >
            <iframe
              src={mapEmbedUrl}
              title={`Mapa de ${data.businessName}`}
              className="block aspect-[4/3] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </motion.div>
          <motion.div {...fadeUpProps} transition={{ ...fadeUpProps.transition, delay: 0.1 }}>
            <span
              style={accentSoft}
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            >
              Contacto
            </span>
            <h2 style={display} className="mt-4 text-5xl font-bold tracking-tight">
              ¿Hablamos?
            </h2>
            <p className="mt-3 opacity-80">
              {assets.labels.contactSectionSubtitle}
            </p>
            <button
              type="button"
              style={accentBtn}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold"
            >
              {ctaText}
              <IconArrowRight className="size-4" />
            </button>
            <dl className="mt-10 space-y-5 text-base">
              <ContactRow
                label="Ubicación"
                value={fullAddress || "Calle Ejemplo 123, Madrid"}
                icon={<IconMapPin className="size-4" />}
                palette={palette}
              />
              <ContactRow
                label="Teléfono"
                value="+34 900 000 000"
                icon={<IconPhone className="size-4" />}
                palette={palette}
              />
              <ContactRow
                label="Email"
                value={`hola@${data.businessName.toLowerCase().replace(/\s+/g, "")}.es`}
                icon={<IconMail className="size-4" />}
                palette={palette}
              />
              <ContactRow
                label="Facebook"
                value={`/${data.businessName.toLowerCase().replace(/\s+/g, "")}`}
                icon={<IconFacebook className="size-4" />}
                palette={palette}
              />
              <ContactRow
                label="Instagram"
                value={`@${data.businessName.toLowerCase().replace(/\s+/g, "")}`}
                icon={<IconInstagram className="size-4" />}
                palette={palette}
              />
            </dl>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-12 py-6 text-xs opacity-70"
        style={{ borderColor: palette.accent + "22" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>© {new Date().getFullYear()} {data.businessName}</span>
          <span className="flex gap-4">
            <span>Aviso legal</span>
            <span>Privacidad</span>
            <span>Cookies</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

// --- Contrast helpers --------------------------------------------------------
// CORE RULE: never hardcode bg-white / text-white. Always pair surface↔text
// from the palette, OR derive a readable foreground for any custom background
// with `readableOn(bg)`. This guarantees contrast across all 4 palettes
// (including the dark "oscuro-moderno" one).

function luminance(hex: string): number {
  const m = hex.replace("#", "").slice(0, 6);
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Returns "#ffffff" or "#0a0a0f" — whichever contrasts best with the given bg.
function readableOn(bg: string): string {
  return luminance(bg) > 0.55 ? "#0a0a0f" : "#ffffff";
}

// Shade a hex color by a percentage (-100..100). Negative = darker, positive = lighter.
function shadeColor(hex: string, percent: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  const adjust = (c: number) => {
    const v = c + Math.round((255 * percent) / 100);
    return Math.max(0, Math.min(255, v));
  };
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(adjust(r))}${to(adjust(g))}${to(adjust(b))}`;
}

function FormField({
  label,
  placeholder,
  palette,
  icon,
}: {
  label: string;
  placeholder: string;
  palette: { text: string; accent: string; surface: string };
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: palette.text + "99" }}
      >
        {label}
      </span>
      <div className="relative mt-1">
        <input
          type="text"
          placeholder={placeholder}
          readOnly
          className={`block w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
            icon ? "pl-9" : ""
          }`}
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.accent + "33",
            color: palette.text,
          }}
        />
        {icon && (
          <span
            aria-hidden
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: palette.accent }}
          >
            {icon}
          </span>
        )}
      </div>
    </label>
  );
}

function ContactRow({
  label,
  value,
  icon,
  palette,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  palette: { text: string; accent: string };
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full"
        style={{
          background: `linear-gradient(135deg, ${palette.accent}22, ${palette.accent}11)`,
          color: palette.accent,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <dt
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: palette.text + "99" }}
        >
          {label}
        </dt>
        <dd className="mt-0.5" style={{ color: palette.text }}>
          {value}
        </dd>
      </div>
    </div>
  );
}

function TeamCarousel({
  team,
  palette,
  display,
  photosMale,
  photosFemale,
  sector,
}: {
  team: { name: string; role: string; gender?: "male" | "female" }[];
  palette: { text: string; accent: string; surface: string };
  display: CSSProperties;
  photosMale: string[];
  photosFemale: string[];
  sector: string;
}) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset((o) => (o + 1) % team.length), 3500);
    return () => clearInterval(id);
  }, [team.length]);

  // Per-member photo. For restauración, role keywords get priority over
  // sequential gender-pool order so the chef-hat photo always lands on
  // the chef role (and never on the sumiller / sala roles).
  const photoFor = useMemo(() => {
    const taken = new Set<string>();
    let mIdx = 0;
    let fIdx = 0;
    return team.map((m) => {
      const g = m.gender ?? guessGender(m.name);
      // Sector-specific role-coded override (chef-hat photo → chef role).
      if (sector === "restauracion") {
        const override = getRestauracionRolePhoto(m.role, g);
        if (override && !taken.has(override)) {
          taken.add(override);
          return override;
        }
      }
      // Default: pick from gender pool in member order, skipping any photo
      // already claimed by a role-keyword override.
      const pool = g === "female" ? photosFemale : photosMale;
      const ptr = g === "female" ? () => fIdx++ : () => mIdx++;
      for (let attempts = 0; attempts < pool.length; attempts++) {
        const idx = ptr() % pool.length;
        const candidate = pool[idx];
        if (candidate && !taken.has(candidate)) {
          taken.add(candidate);
          return candidate;
        }
      }
      // Last resort: cycle without dedup.
      const fallbackIdx =
        (g === "female" ? fIdx : mIdx) % Math.max(pool.length, 1);
      return pool[fallbackIdx] ?? photosMale[0] ?? photosFemale[0] ?? "";
    });
  }, [team, photosMale, photosFemale, sector]);

  const visible = useMemo(() => {
    const arr: { member: typeof team[number]; photo: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const absoluteIdx = (offset + i) % team.length;
      arr.push({ member: team[absoluteIdx], photo: photoFor[absoluteIdx] });
    }
    return arr;
  }, [team, offset, photoFor]);

  return (
    <div className="grid gap-6 grid-cols-4">
      {visible.map(({ member, photo }, i) => (
        <article
          key={`${member.name}-${i}-${offset}`}
          className="group overflow-hidden rounded-3xl border text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          style={{
            backgroundColor: palette.surface,
            color: palette.text,
            borderColor: palette.accent + "1f",
          }}
        >
          <div
            className="relative aspect-square overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${palette.accent}1f, ${palette.accent}44)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={member.name}
              className="absolute inset-0 size-full object-cover transition group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${palette.text}44 100%)`,
              }}
            />
          </div>
          <div className="p-4">
            <p style={{ ...display, color: palette.text }} className="font-bold">
              {member.name}
            </p>
            <p
              className="mt-1 text-xs font-semibold uppercase tracking-wider"
              style={{ color: palette.accent }}
            >
              {member.role}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function TestimonialsCarousel({
  testimonials,
  palette,
  display,
  fg,
  fgOnAccent,
  authorLabel,
}: {
  testimonials: { name: string; text: string }[];
  palette: { text: string; accent: string; surface: string };
  display: CSSProperties;
  fg: string;
  fgOnAccent: string;
  authorLabel: string;
}) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset((o) => (o + 1) % testimonials.length), 5000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  const visible = useMemo(() => {
    const arr: typeof testimonials = [];
    const count = Math.min(2, testimonials.length);
    for (let i = 0; i < count; i++) {
      arr.push(testimonials[(offset + i) % testimonials.length]);
    }
    return arr;
  }, [testimonials, offset]);

  // Card background: a translucent layer derived from the section's
  // foreground color, so it's a tinted veil whether the section is dark
  // (white veil) or light (dark veil). Either way, `fg` is the readable
  // text color for that section.
  const cardBg = fg + "14";
  const cardBorder = fg + "22";

  return (
    <div className="grid gap-6 grid-cols-2">
      {visible.map((t, i) => {
        const initial = t.name.charAt(0).toUpperCase();
        return (
          <blockquote
            key={`${t.name}-${i}-${offset}`}
            className="relative overflow-hidden rounded-3xl p-8 backdrop-blur-xl"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              color: fg,
              boxShadow: `0 25px 60px -20px ${palette.accent}55`,
            }}
          >
            <span
              aria-hidden
              className="absolute -right-2 -top-6 text-[8rem] font-serif leading-none opacity-20"
              style={{ color: palette.accent, ...display }}
            >
              “
            </span>
            <div className="flex gap-1" style={{ color: "#fbbf24" }}>
              {[0, 1, 2, 3, 4].map((s) => (
                <IconStar key={s} className="size-4" />
              ))}
            </div>
            <p
              className="relative mt-5 text-lg leading-relaxed"
              style={{ color: fg }}
            >
              {t.text}
            </p>
            <footer className="relative mt-6 flex items-center gap-3">
              <div
                className="grid size-11 place-items-center rounded-full font-bold"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}aa)`,
                  color: fgOnAccent,
                  ...display,
                }}
              >
                {initial}
              </div>
              <div>
                <p
                  style={{ ...display, color: fg }}
                  className="text-sm font-bold"
                >
                  {t.name}
                </p>
                <p className="text-xs opacity-70" style={{ color: fg }}>
                  {authorLabel}
                </p>
              </div>
            </footer>
          </blockquote>
        );
      })}
    </div>
  );
}

/** "Especialidades de la casa" — grid of dish cards used in the restauración
 *  branch of the services section. Each card shows a real photo from the
 *  selected cuisine bucket, plus the AI-generated dish name and blurb. */
function DishesGrid({
  dishes,
  cuisine,
  palette,
  display,
  fgOnSurface,
  accentBtn,
}: {
  dishes: { name: string; blurb: string; tagline?: string }[];
  cuisine: Cuisine;
  palette: { surface: string; accent: string; text: string };
  display: CSSProperties;
  fgOnSurface: string;
  accentBtn: CSSProperties;
}) {
  const photos = getCuisinePhotos(cuisine);
  // Always render ONE card per uploaded photo (capped at 6 for grid balance).
  const count = Math.min(photos.length, 6);
  // A "good" AI payload looks like {name: "Spaghetti...", blurb: "..."}.
  // The cuisine fallback uses real Italian / Mexican / Japanese / etc. dish
  // names so the cards NEVER show the cuisine slug itself (e.g. "Italiana")
  // when the AI failed and the wizard's `offerings` was only the cuisine
  // label.
  const looksLikeAiResponse =
    dishes.length >= 3 &&
    dishes.some((d) => d.blurb && d.blurb.length > 10);
  const dishesPool = looksLikeAiResponse ? dishes : getFallbackDishes(cuisine);
  const visible = Array.from({ length: count }, (_, i) => ({
    ...dishesPool[i % dishesPool.length],
    photo: photos[i],
  }));
  // Use 4 columns when there are 4 cards (clean row), 3 columns otherwise
  // (5/6 cards lay out cleanly as 3+2 or 3+3).
  const gridColsClass = count === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        variants={staggerParentVariants}
        className={`grid gap-6 ${gridColsClass}`}
      >
        {visible.map((d, i) => (
          <motion.article
            key={i}
            variants={staggerChildVariants}
            className="group overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.accent + "1f",
            }}
          >
            <div className="aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.photo}
                alt={d.name}
                className="size-full object-cover transition group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="p-5">
              <h3
                style={{ ...display, color: fgOnSurface }}
                className="text-lg font-bold"
              >
                {d.name}
              </h3>
              {d.tagline && (
                <p
                  className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: palette.accent }}
                >
                  {d.tagline}
                </p>
              )}
              <p
                className="mt-2 text-base leading-relaxed"
                style={{ color: fgOnSurface + "cc" }}
              >
                {d.blurb}
              </p>
            </div>
          </motion.article>
        ))}
      </motion.div>
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          style={accentBtn}
          className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition hover:scale-[1.03]"
        >
          Ver carta completa
          <IconArrowRight className="size-4" />
        </button>
      </div>
    </>
  );
}

/** Magazine-style featured menu (Antipasti / Entrantes on the left, mains on
 *  the right, a centered cuisine photo in between). Used only by the
 *  restauración branch right after "Especialidades de la casa". */
function FeaturedMenuSection({
  cuisine,
  menu: aiMenu,
  palette,
  display,
  fgOnSurface,
}: {
  cuisine: Cuisine;
  /** AI-generated carta (includes the user's featured dishes + invented ones).
   *  Falls back to the static per-cuisine menu when absent. */
  menu?: FeaturedMenu | null;
  palette: { bg: string; surface: string; accent: string; text: string };
  display: CSSProperties;
  fgOnSurface: string;
}) {
  // Prefer the AI carta, but only if it actually has items in both columns;
  // otherwise use the curated static menu for this cuisine.
  const menu =
    aiMenu && aiMenu.leftItems?.length && aiMenu.rightItems?.length
      ? aiMenu
      : getFeaturedMenu(cuisine);
  const photos = getCuisinePhotos(cuisine);
  // Pick a centered photo. Stable per render (same on hover/scroll).
  const heroPhoto = useMemo(
    () => photos[Math.floor(Math.random() * Math.max(photos.length, 1))],
    [photos],
  );

  return (
    <section
      className="relative overflow-hidden px-12 py-28"
      style={{
        background: `linear-gradient(180deg, ${palette.surface} 0%, ${palette.accent}0d 100%)`,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          {...fadeUpProps}
          style={{ ...display, color: fgOnSurface }}
          className="text-center text-5xl font-bold tracking-[0.04em]"
        >
          Carta destacada
        </motion.h2>
        <motion.p
          {...fadeUpProps}
          transition={{ ...fadeUpProps.transition, delay: 0.1 }}
          className="mx-auto mt-3 max-w-xl text-center opacity-70"
          style={{ color: fgOnSurface }}
        >
          Una selección de platos que define nuestra cocina y la mesa que ofrecemos.
        </motion.p>

        <div className="mt-16 grid items-start gap-12 grid-cols-[1fr_auto_1fr]">
          <MenuColumn
            title={menu.leftTitle}
            items={menu.leftItems}
            palette={palette}
            display={display}
            fg={fgOnSurface}
          />

          {/* Centered photo in an oval frame with accent border */}
          <div className="relative w-[280px]">
            <div
              aria-hidden
              className="absolute inset-0 -m-2 rounded-[9999px]"
              style={{
                background: `linear-gradient(135deg, ${palette.accent}66, transparent)`,
                filter: "blur(20px)",
              }}
            />
            <div
              className="relative overflow-hidden border-2 shadow-2xl"
              style={{
                borderColor: palette.accent + "55",
                borderRadius: "50% / 38%",
                aspectRatio: "3 / 4",
              }}
            >
              {heroPhoto && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={heroPhoto}
                  alt=""
                  className="block size-full object-cover"
                />
              )}
            </div>
          </div>

          <MenuColumn
            title={menu.rightTitle}
            items={menu.rightItems}
            palette={palette}
            display={display}
            fg={fgOnSurface}
          />
        </div>
      </div>
    </section>
  );
}

function MenuColumn({
  title,
  items,
  palette,
  display,
  fg,
}: {
  title: string;
  items: { name: string; desc: string; price: string }[];
  palette: { accent: string };
  display: CSSProperties;
  fg: string;
}) {
  return (
    <div>
      <h3
        style={{ ...display, color: fg }}
        className="text-center text-xs font-bold uppercase tracking-[0.36em]"
      >
        {title}
      </h3>
      <div
        aria-hidden
        className="mx-auto mt-3 h-px w-16"
        style={{ backgroundColor: palette.accent + "66" }}
      />
      <ul className="mt-10 space-y-7">
        {items.map((it, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-4">
              <p
                style={{ ...display, color: fg }}
                className="text-base font-semibold uppercase tracking-[0.08em]"
              >
                {it.name}
              </p>
              <span
                style={{ ...display, color: palette.accent }}
                className="text-sm font-semibold whitespace-nowrap"
              >
                {it.price}
              </span>
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed opacity-75" style={{ color: fg }}>
              {it.desc}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
