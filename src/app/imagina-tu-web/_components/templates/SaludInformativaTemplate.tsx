"use client";

import { useEffect, useMemo, useState, type CSSProperties, type SVGProps } from "react";
import { motion, type Variants } from "motion/react";
import { getPalette, getTypography } from "@/lib/preview-themes";
import type { SaludCopyResponse } from "@/lib/preview-validation";

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

export interface SaludInformativaData {
  businessName: string;
  offerings: string[];
  palette: string;
  typography: string;
  valueProp: string;
  logoDataUrl?: string;
  address?: string;
  city?: string;
}

interface Props {
  data: SaludInformativaData;
  copy: SaludCopyResponse | null;
}

// Photos that fill the hero background AND the "Por qué elegirnos" image.
// Live under /img/imagina/<sector>/valor-agregado/foto-N.jpg.
const SALUD_PHOTOS = [
  "/img/imagina/salud/valor-agregado/foto-1.jpg",
  "/img/imagina/salud/valor-agregado/foto-2.jpg",
  "/img/imagina/salud/valor-agregado/foto-3.jpg",
  "/img/imagina/salud/valor-agregado/foto-4.jpg",
];

// Team carousel photos — separated by gender so the AI-generated team
// member name gets a matching portrait.
const TEAM_PHOTOS_FEMALE = [
  "/img/imagina/salud/equipo/profesional-1.jpg",
  "/img/imagina/salud/equipo/profesional-4.jpg",
  "/img/imagina/salud/equipo/profesional-6.jpg",
];
const TEAM_PHOTOS_MALE = [
  "/img/imagina/salud/equipo/profesional-2.jpg",
  "/img/imagina/salud/equipo/profesional-3.jpg",
  "/img/imagina/salud/equipo/profesional-5.jpg",
];

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

const IconStethoscope = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M6 3v6a4 4 0 0 0 8 0V3" />
    <path d="M10 13v3a5 5 0 0 0 10 0v-2" />
    <circle cx="20" cy="11" r="2" />
  </svg>
);
const IconTooth = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 21c-1-3-2-5-2-9 0-1.7-1.6-3-3.5-3S3 10.3 3 12c0-4 3-9 9-9s9 5 9 9c0 1.7-1.6 3-3.5 3S14 13.7 14 12c0 4-1 6-2 9z" />
  </svg>
);
const IconEye = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconSyringe = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M18 2l4 4" />
    <path d="M15 5l4 4-9 9H6v-4z" />
    <path d="M9 11l4 4" />
    <path d="M16 4l3 3" />
  </svg>
);
const IconHeartPulse = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M20.8 11.5a5.5 5.5 0 0 0-9.3-3.9 5.5 5.5 0 0 0-9.3 3.9c0 4.6 5.7 8 9.3 10.5 3.6-2.5 9.3-5.9 9.3-10.5z" />
    <path d="M3 12h4l2-3 3 6 2-3h7" />
  </svg>
);
const IconActivity = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M2 12h4l3-9 6 18 3-9h4" />
  </svg>
);
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

const SERVICE_ICONS = [
  IconStethoscope,
  IconTooth,
  IconEye,
  IconSyringe,
  IconHeartPulse,
  IconActivity,
];
const BULLET_ICONS = [
  IconCheck,
  IconClock,
  IconHandshake,
  IconShield,
  IconBuilding,
  IconSparkles,
];

// --- Template -----------------------------------------------------------------

export function SaludInformativaTemplate({ data, copy }: Props) {
  const palette = getPalette(data.palette);
  const typo = getTypography(data.typography);

  const [heroBgImg, valorAgregadoImg] = useMemo(() => {
    const shuffled = [...SALUD_PHOTOS].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1] ?? shuffled[0]];
  }, []);

  if (!palette || !typo) return null;

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

  const headline =
    copy?.heroHeadline ?? `Tu salud, en manos de ${data.businessName}`;
  const tagline =
    copy?.heroTagline ??
    data.valueProp ??
    "Atención cercana, profesional y a tu medida.";
  const ctaText = copy?.ctaText ?? "Pide tu cita";
  const servicesTitle = copy?.sectionTitle ?? "Nuestros tratamientos";
  const services =
    copy?.offerings ?? data.offerings.map((name) => ({ name, blurb: "" }));

  const valorAgregadoTitle = copy?.valorAgregadoTitle ?? "Por qué elegirnos";
  const valorAgregadoIntro =
    copy?.valorAgregadoIntro ??
    "Cuidamos de ti con un equipo humano, instalaciones modernas y atención personalizada.";

  // Bullets must be even (4 or 6). If AI returns 5, drop the last to make it 4.
  // If less than 4 (fallback), pad to 4 with safe defaults.
  const rawBullets = copy?.bullets ?? [
    { title: "Atención personalizada", text: "Te dedicamos el tiempo que necesitas." },
    { title: "Equipo profesional", text: "Especialistas con experiencia en tu cuidado." },
    { title: "Instalaciones modernas", text: "Espacios pensados para tu comodidad." },
    { title: "Cita rápida", text: "Reserva online o por teléfono en minutos." },
  ];
  const bullets =
    rawBullets.length >= 6
      ? rawBullets.slice(0, 6)
      : rawBullets.slice(0, 4);

  const team =
    copy?.team ??
    [
      { name: "Dra. Marta Rivas", role: "Directora médica", gender: "female" as const },
      { name: "Javier Soler", role: "Profesional clínico", gender: "male" as const },
      { name: "Lucía Méndez", role: "Atención al paciente", gender: "female" as const },
      { name: "Pablo Iglesias", role: "Especialista", gender: "male" as const },
    ];

  const testimonials =
    copy?.testimonials ?? [
      {
        name: "María G.",
        text: `Salí encantada de ${data.businessName}. Me explicaron todo con paciencia y el trato fue exquisito.`,
      },
      { name: "Andrés L.", text: "Profesionalidad y cercanía. Volveré sin duda." },
      { name: "Sofía P.", text: "La atención fue rápida y el equipo me hizo sentir muy cómoda." },
    ];

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
        {/* Color overlay — strong on the left for text legibility, fades to
            (almost) transparent on the right so the photo shows clearly. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(105deg, ${palette.bg}f0 0%, ${palette.bg}d0 25%, ${palette.bg}80 55%, ${palette.bg}20 80%, transparent 100%)`,
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
            <span>Tratamientos</span>
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
                <span>Atención 5★ verificada</span>
              </div>
              <h1
                style={display}
                className="mt-5 text-6xl font-bold leading-[1.02] tracking-tight"
              >
                {headline}
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed opacity-90">
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
                <span style={{ color: fgOnSurface }}>Reserva tu cita</span>
              </p>
              <p className="mt-1 text-xs" style={{ color: fgOnSurface + "99" }}>
                Te confirmamos en menos de 24h.
              </p>
              <div className="mt-5 space-y-3">
                <FormField label="Nombre" placeholder="Tu nombre" palette={palette} />
                <FormField label="Teléfono" placeholder="+34 600 000 000" palette={palette} />
                <FormField label="Email" placeholder="tu@email.com" palette={palette} />
                <FormField
                  label="Fecha preferida"
                  placeholder="Selecciona una fecha"
                  palette={palette}
                  icon={<IconCalendar className="size-4" />}
                />
                <button
                  type="button"
                  style={accentBtn}
                  className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
                >
                  Solicitar cita
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
                className="block aspect-[4/5] w-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const fb = el.parentElement?.querySelector("[data-fallback]") as HTMLElement | null;
                  if (fb) fb.style.display = "block";
                }}
              />
              <div
                data-fallback
                className="aspect-[4/5] w-full"
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
            <p className="mt-4 max-w-lg leading-relaxed opacity-90">
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
                      <p style={display} className="font-semibold">
                        {b.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed opacity-75">
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

      {/* EQUIPO — flat accent-tinted section (clearly a colored "blue room")
          so it's unmistakably different from VA (pure white) and from
          Servicios (palette heroGradient diagonal). */}
      <section
        className="relative overflow-hidden px-12 py-28"
        style={{
          backgroundColor: palette.accent + "1f",
        }}
      >
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
            <h2 style={display} className="mt-4 text-5xl font-bold tracking-tight">
              Profesionales que te cuidan
            </h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">
              Un equipo humano con experiencia, cercanía y un trato de verdad.
            </p>
          </motion.div>
          <TeamCarousel team={team} palette={palette} display={display} />
        </div>
      </section>

      {/* SERVICIOS — uses palette.heroGradient (the palette's signature
          diagonal gradient) so it's clearly different from Equipo's flat
          accent tint. Each palette has its own heroGradient, keeping brand
          coherence while breaking the rhythm. */}
      <section
        className="relative overflow-hidden px-12 py-28"
        style={{
          background: palette.heroGradient,
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
                Tratamientos
              </span>
              <h2 style={display} className="mt-4 text-5xl font-bold tracking-tight">
                {servicesTitle}
              </h2>
            </div>
            <p className="max-w-sm text-right opacity-80">
              Tratamientos diseñados para tu bienestar, ejecutados con un
              estándar clínico riguroso.
            </p>
          </motion.div>
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
                    {s.name}
                  </h3>
                  <p
                    className="relative mt-2 text-sm leading-relaxed"
                    style={{ color: fgOnSurface + "cc" }}
                  >
                    {s.blurb || "Tratamiento especializado para tus necesidades."}
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
                style={{
                  borderColor: palette.accent,
                  color: palette.accent,
                }}
                className="inline-flex h-12 items-center gap-2 rounded-full border-2 px-7 text-sm font-semibold transition hover:scale-105"
              >
                Ver todos los tratamientos
                <IconArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </section>

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
              Reserva tu primera consulta hoy mismo
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
              Pide tu cita o resuelve tus dudas. Estamos aquí para ayudarte.
            </p>
            <button
              type="button"
              style={accentBtn}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold"
            >
              {ctaText}
              <IconArrowRight className="size-4" />
            </button>
            <dl className="mt-10 space-y-4 text-sm">
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
}: {
  team: { name: string; role: string; gender?: "male" | "female" }[];
  palette: { text: string; accent: string; surface: string };
  display: CSSProperties;
}) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset((o) => (o + 1) % team.length), 3500);
    return () => clearInterval(id);
  }, [team.length]);

  // Per-member photo: pick by gender from the right pool, cycle by member index
  // so a member always keeps the same photo across rotations.
  const photoFor = useMemo(() => {
    const malePtr: number[] = [];
    const femalePtr: number[] = [];
    let mIdx = 0;
    let fIdx = 0;
    return team.map((m) => {
      const g = m.gender ?? guessGender(m.name);
      if (g === "female") {
        const idx = fIdx++ % TEAM_PHOTOS_FEMALE.length;
        femalePtr.push(idx);
        return TEAM_PHOTOS_FEMALE[idx];
      }
      const idx = mIdx++ % TEAM_PHOTOS_MALE.length;
      malePtr.push(idx);
      return TEAM_PHOTOS_MALE[idx];
    });
  }, [team]);

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
}: {
  testimonials: { name: string; text: string }[];
  palette: { text: string; accent: string; surface: string };
  display: CSSProperties;
  fg: string;
  fgOnAccent: string;
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
                  Paciente verificado
                </p>
              </div>
            </footer>
          </blockquote>
        );
      })}
    </div>
  );
}
