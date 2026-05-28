// Per-sector assets consumed by `InformativaSectorTemplate`. Each entry
// contains the photo pools (already present under public/img/imagina/),
// the icon set used in the "Servicios" cards, and a few labels that
// the design surfaces in the hero, equipo and testimonios sections.
//
// The template renders the SAME layout for every supported sector — only
// these assets vary. Sectors NOT listed here fall back to the generic
// `InformativaTemplate` (which uses AI-generated text and a single
// generated hero image).

import type { ComponentType, SVGProps } from "react";

// ---------------------------------------------------------------------------
// Icon primitives (shared stroke style)
// ---------------------------------------------------------------------------

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

// --- SALUD (medical) -------------------------------------------------------
export const IconStethoscope = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M6 3v6a4 4 0 0 0 8 0V3" />
    <path d="M10 13v3a5 5 0 0 0 10 0v-2" />
    <circle cx="20" cy="11" r="2" />
  </svg>
);
export const IconTooth = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 21c-1-3-2-5-2-9 0-1.7-1.6-3-3.5-3S3 10.3 3 12c0-4 3-9 9-9s9 5 9 9c0 1.7-1.6 3-3.5 3S14 13.7 14 12c0 4-1 6-2 9z" />
  </svg>
);
export const IconEye = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconSyringe = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M18 2l4 4" />
    <path d="M15 5l4 4-9 9H6v-4z" />
    <path d="M9 11l4 4" />
    <path d="M16 4l3 3" />
  </svg>
);
export const IconHeartPulse = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M20.8 11.5a5.5 5.5 0 0 0-9.3-3.9 5.5 5.5 0 0 0-9.3 3.9c0 4.6 5.7 8 9.3 10.5 3.6-2.5 9.3-5.9 9.3-10.5z" />
    <path d="M3 12h4l2-3 3 6 2-3h7" />
  </svg>
);
export const IconActivity = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M2 12h4l3-9 6 18 3-9h4" />
  </svg>
);

// --- EDUCACION -------------------------------------------------------------
export const IconBook = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2V5z" />
    <path d="M17 3v16" />
    <path d="M8 7h5M8 11h5" />
  </svg>
);
export const IconGraduationCap = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M2 9l10-4 10 4-10 4L2 9z" />
    <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    <path d="M22 9v5" />
  </svg>
);
export const IconPencil = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M3 21l3-1 12-12-2-2L4 18l-1 3z" />
    <path d="M14 6l4 4" />
  </svg>
);
export const IconLightbulb = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
  </svg>
);
export const IconTarget = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);
export const IconChart = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M3 21h18" />
    <path d="M6 17v-6" />
    <path d="M11 17v-9" />
    <path d="M16 17v-4" />
    <path d="M21 17V6" />
  </svg>
);

// --- MODA ------------------------------------------------------------------
export const IconHanger = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 7a2 2 0 1 1 2-2" />
    <path d="M12 7v3" />
    <path d="M2 17l10-6 10 6v3H2v-3z" />
  </svg>
);
export const IconScissors = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4L8.5 15.5" />
    <path d="M20 20L8.5 8.5" />
  </svg>
);
export const IconShirt = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M5 5l3-2 4 2 4-2 3 2-3 4v11H8V9L5 5z" />
  </svg>
);
export const IconGem = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M6 3h12l3 6-9 12L3 9l3-6z" />
    <path d="M3 9h18" />
    <path d="M9 3l3 6 3-6" />
    <path d="M12 21V9" />
  </svg>
);
export const IconPalette = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.8.7-1.3 1.5-1.3H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z" />
    <circle cx="7.5" cy="11" r="1" fill="currentColor" />
    <circle cx="11" cy="7" r="1" fill="currentColor" />
    <circle cx="16" cy="9" r="1" fill="currentColor" />
    <circle cx="17" cy="14" r="1" fill="currentColor" />
  </svg>
);

// --- TECNOLOGIA ------------------------------------------------------------
export const IconCode = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M9 7l-5 5 5 5" />
    <path d="M15 7l5 5-5 5" />
    <path d="M13 4l-2 16" />
  </svg>
);
export const IconLaptop = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="5" width="18" height="11" rx="2" />
    <path d="M2 19h20" />
  </svg>
);
export const IconServer = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="4" width="18" height="6" rx="1" />
    <rect x="3" y="14" width="18" height="6" rx="1" />
    <circle cx="7" cy="7" r="0.6" fill="currentColor" />
    <circle cx="7" cy="17" r="0.6" fill="currentColor" />
  </svg>
);
export const IconLock = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconChip = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M3 9v6M21 9v6M9 3h6M9 21h6" />
  </svg>
);
export const IconGear = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
  </svg>
);

// --- SERVICIOS -------------------------------------------------------------
export const IconBriefcase = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
  </svg>
);
export const IconDocument = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M6 3h8l4 4v14H6V3z" />
    <path d="M14 3v4h4" />
    <path d="M8 13h8M8 17h6" />
  </svg>
);
export const IconScale = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 3v18" />
    <path d="M5 7h14" />
    <path d="M5 7l-3 6h6l-3-6z" />
    <path d="M19 7l-3 6h6l-3-6z" />
    <path d="M8 21h8" />
  </svg>
);
export const IconHandshakeAlt = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M11 17l-3 3-5-5 6-6 4 4" />
    <path d="M13 11l4-4 4 4-3 3-3-3" />
    <path d="M13 13l3 3" />
    <path d="M9 15l3 3" />
  </svg>
);
export const IconShieldCheck = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />
    <path d="M9 12.5l2 2 4-4" />
  </svg>
);
export const IconUsers = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15 15h2a4 4 0 0 1 4 4v2" />
  </svg>
);

// ---------------------------------------------------------------------------
// Sector assets
// ---------------------------------------------------------------------------

export interface SectorLabels {
  /** Short text shown next to the 5★ rating in the hero pill */
  ratingText: string;
  /** Title of the team carousel section (centered above cards) */
  teamSectionTitle: string;
  /** One-line subtitle below the team section title */
  teamSectionSubtitle: string;
  /** Author qualifier shown under each testimonial card */
  testimonialAuthorLabel: string;
  /** Button text used everywhere the AI didn't provide a custom CTA */
  defaultCtaText: string;
  /** Heading above the services grid when the AI didn't provide one */
  defaultServicesTitle: string;
  /** Heading of the valor-agregado section */
  defaultValorAgregadoTitle: string;
  /** Intro paragraph of the valor-agregado section */
  defaultValorAgregadoIntro: string;
  /** Single-word nav item for the services section ("Tratamientos",
   *  "Programas", "Colecciones", "Servicios"…) */
  navServicesLabel: string;
  /** Small pill text rendered above the services section h2 */
  servicesSectionPill: string;
  /** One-line subtitle rendered below the services section h2 */
  servicesSectionSubtitle: string;
  /** Title of the inline contact / appointment form in the hero */
  formTitle: string;
  /** Submit button label of that form */
  formSubmitText: string;
  /** Subtitle rendered below "¿Hablamos?" in the contact section */
  contactSectionSubtitle: string;
  /** Headline of the CTA bridge banner between Servicios and Testimonios */
  bridgeHeadline: string;
}

export interface FallbackTeamMember {
  name: string;
  role: string;
  gender: "male" | "female";
}

export interface FallbackTestimonial {
  name: string;
  /** `{businessName}` token is replaced at render time */
  text: string;
}

export interface SectorAssets {
  photosAmbient: string[];
  photosMale: string[];
  photosFemale: string[];
  serviceIcons: ComponentType<IconProps>[];
  labels: SectorLabels;
  /** Team rendered when the AI didn't return a valid `team[]`. Roles must
   *  be coherent with the sector — never mix medical roles into tecnologia,
   *  nor teachers into moda, etc. */
  fallbackTeam: FallbackTeamMember[];
  /** Testimonials rendered when the AI didn't return a valid `testimonials[]`.
   *  Use `{businessName}` token to inject the actual business name. */
  fallbackTestimonials: FallbackTestimonial[];
}

// SectorSlug is duplicated here as a string literal union to avoid importing
// the runtime-only file from a template module.
export type SupportedSector =
  | "salud"
  | "educacion"
  | "moda"
  | "tecnologia"
  | "servicios";

export const SECTOR_ASSETS: Record<SupportedSector, SectorAssets> = {
  salud: {
    photosAmbient: [
      "/img/imagina/salud/valor-agregado/foto-1.jpg",
      "/img/imagina/salud/valor-agregado/foto-2.jpg",
      "/img/imagina/salud/valor-agregado/foto-3.jpg",
      "/img/imagina/salud/valor-agregado/foto-4.jpg",
    ],
    photosMale: [
      "/img/imagina/salud/equipo/profesional-1.png",
      "/img/imagina/salud/equipo/profesional-4.png",
      "/img/imagina/salud/equipo/profesional-5.png",
    ],
    photosFemale: [
      "/img/imagina/salud/equipo/profesional-2.png",
      "/img/imagina/salud/equipo/profesional-3.png",
    ],
    serviceIcons: [
      IconStethoscope,
      IconTooth,
      IconEye,
      IconSyringe,
      IconHeartPulse,
      IconActivity,
    ],
    labels: {
      ratingText: "Atención 5★ verificada",
      teamSectionTitle: "Profesionales que te cuidan",
      teamSectionSubtitle:
        "Un equipo humano con experiencia, cercanía y un trato de verdad.",
      testimonialAuthorLabel: "Paciente verificado",
      defaultCtaText: "Pide tu cita",
      defaultServicesTitle: "Nuestros tratamientos",
      defaultValorAgregadoTitle: "Por qué elegirnos",
      defaultValorAgregadoIntro:
        "Cuidamos de ti con un equipo humano, instalaciones modernas y atención personalizada.",
      navServicesLabel: "Tratamientos",
      servicesSectionPill: "Tratamientos",
      servicesSectionSubtitle:
        "Tratamientos diseñados para tu bienestar, con un estándar clínico riguroso.",
      formTitle: "Reserva tu cita",
      formSubmitText: "Solicitar cita",
      contactSectionSubtitle:
        "Pide tu cita o resuelve tus dudas. Estamos aquí para ayudarte.",
      bridgeHeadline: "Reserva tu primera consulta hoy mismo",
    },
    fallbackTeam: [
      { name: "Dra. Marta Rivas", role: "Directora médica", gender: "female" },
      { name: "Javier Soler", role: "Odontólogo", gender: "male" },
      { name: "Lucía Méndez", role: "Higienista dental", gender: "female" },
      { name: "Pablo Iglesias", role: "Especialista", gender: "male" },
    ],
    fallbackTestimonials: [
      {
        name: "María G.",
        text: "Salí encantada de {businessName}. Me explicaron todo con paciencia y el trato fue exquisito.",
      },
      { name: "Andrés L.", text: "Profesionalidad y cercanía. Volveré sin duda." },
      {
        name: "Sofía P.",
        text: "La atención fue rápida y el equipo me hizo sentir muy cómoda.",
      },
    ],
  },
  educacion: {
    photosAmbient: [
      "/img/imagina/educacion/valor-agregado/foto-1.png",
      "/img/imagina/educacion/valor-agregado/foto-2.png",
      "/img/imagina/educacion/valor-agregado/foto-3.png",
    ],
    photosMale: [
      "/img/imagina/educacion/equipo/profesional-2.png",
      "/img/imagina/educacion/equipo/profesional-3.png",
      "/img/imagina/educacion/equipo/profesional-5.png",
    ],
    photosFemale: [
      "/img/imagina/educacion/equipo/profesional-1.png",
      "/img/imagina/educacion/equipo/profesional-4.png",
    ],
    serviceIcons: [
      IconBook,
      IconGraduationCap,
      IconPencil,
      IconLightbulb,
      IconTarget,
      IconChart,
    ],
    labels: {
      ratingText: "Familias y alumnos satisfechos",
      teamSectionTitle: "Profesores que marcan la diferencia",
      teamSectionSubtitle:
        "Un equipo docente cercano, formado y comprometido con el aprendizaje.",
      testimonialAuthorLabel: "Alumno / Familia",
      defaultCtaText: "Reserva tu plaza",
      defaultServicesTitle: "Nuestros programas",
      defaultValorAgregadoTitle: "Por qué elegirnos",
      defaultValorAgregadoIntro:
        "Acompañamos a alumnos y familias con un proyecto educativo cercano, exigente y con propósito.",
      navServicesLabel: "Programas",
      servicesSectionPill: "Programas",
      servicesSectionSubtitle:
        "Programas diseñados para impulsar el aprendizaje y acompañar a cada alumno.",
      formTitle: "Reserva tu plaza",
      formSubmitText: "Solicitar plaza",
      contactSectionSubtitle:
        "Reserva tu plaza o resuelve tus dudas. Estamos aquí para acompañarte.",
      bridgeHeadline: "Reserva tu plaza hoy mismo",
    },
    fallbackTeam: [
      { name: "Marta Rivas", role: "Directora pedagógica", gender: "female" },
      { name: "Javier Soler", role: "Profesor de Matemáticas", gender: "male" },
      { name: "Lucía Méndez", role: "Orientadora", gender: "female" },
      { name: "Pablo Iglesias", role: "Coordinador de idiomas", gender: "male" },
    ],
    fallbackTestimonials: [
      {
        name: "María G.",
        text: "El proyecto educativo de {businessName} marca la diferencia. Mi hija ha avanzado mucho.",
      },
      {
        name: "Andrés L.",
        text: "Profesores cercanos y exigentes. Se nota que les importa cada alumno.",
      },
      {
        name: "Sofía P.",
        text: "Comunicación constante con las familias y un trato excelente.",
      },
    ],
  },
  moda: {
    photosAmbient: [
      "/img/imagina/moda/valor-agregado/foto-1.png",
      "/img/imagina/moda/valor-agregado/foto-2.png",
      "/img/imagina/moda/valor-agregado/foto-3.png",
      "/img/imagina/moda/valor-agregado/foto-4.png",
    ],
    photosMale: [
      "/img/imagina/moda/equipo/profesional-4.png",
      "/img/imagina/moda/equipo/profesional-5.png",
    ],
    photosFemale: [
      "/img/imagina/moda/equipo/profesional-1.png",
      "/img/imagina/moda/equipo/profesional-2.png",
      "/img/imagina/moda/equipo/profesional-3.png",
    ],
    serviceIcons: [
      IconHanger,
      IconScissors,
      IconShirt,
      IconGem,
      IconPalette,
      IconChart,
    ],
    labels: {
      ratingText: "Tendencia y calidad 5★",
      teamSectionTitle: "El equipo detrás de la marca",
      teamSectionSubtitle:
        "Diseñadores y profesionales con criterio, oficio y mirada propia.",
      testimonialAuthorLabel: "Cliente",
      defaultCtaText: "Descúbrelo",
      defaultServicesTitle: "Nuestras colecciones",
      defaultValorAgregadoTitle: "Por qué elegirnos",
      defaultValorAgregadoIntro:
        "Diseño con identidad. Piezas pensadas con criterio, oficio y atención al detalle.",
      navServicesLabel: "Colecciones",
      servicesSectionPill: "Colecciones",
      servicesSectionSubtitle:
        "Diseño y piezas con identidad propia, pensadas con criterio y oficio.",
      formTitle: "Reserva tu cita",
      formSubmitText: "Reservar",
      contactSectionSubtitle:
        "Visítanos en el showroom o escríbenos. Estamos para ayudarte.",
      bridgeHeadline: "Reserva tu visita al showroom",
    },
    fallbackTeam: [
      { name: "Marta Rivas", role: "Directora creativa", gender: "female" },
      { name: "Javier Soler", role: "Diseñador de producto", gender: "male" },
      { name: "Lucía Méndez", role: "Personal shopper", gender: "female" },
      { name: "Pablo Iglesias", role: "Pattern maker", gender: "male" },
    ],
    fallbackTestimonials: [
      {
        name: "María G.",
        text: "Las prendas de {businessName} tienen una calidad y un fit excepcionales.",
      },
      {
        name: "Andrés L.",
        text: "Asesoramiento personalizado y un gusto impecable. Vuelvo siempre.",
      },
      {
        name: "Sofía P.",
        text: "Diseño con identidad, no es ropa de pasarela vacía.",
      },
    ],
  },
  tecnologia: {
    photosAmbient: [
      "/img/imagina/tecnologia/valor-agregado/foto-1.png",
      "/img/imagina/tecnologia/valor-agregado/foto-2.png",
      "/img/imagina/tecnologia/valor-agregado/foto-3.png",
      "/img/imagina/tecnologia/valor-agregado/foto-4.png",
      "/img/imagina/tecnologia/valor-agregado/foto-5.png",
    ],
    photosMale: [
      "/img/imagina/tecnologia/equipo/profesional-1.png",
      "/img/imagina/tecnologia/equipo/profesional-3.png",
      "/img/imagina/tecnologia/equipo/profesional-4.png",
    ],
    photosFemale: [
      "/img/imagina/tecnologia/equipo/profesional-2.png",
      "/img/imagina/tecnologia/equipo/profesional-5.png",
    ],
    serviceIcons: [
      IconCode,
      IconLaptop,
      IconServer,
      IconLock,
      IconChip,
      IconGear,
    ],
    labels: {
      ratingText: "Clientes que recomiendan 5★",
      teamSectionTitle: "El equipo técnico",
      teamSectionSubtitle:
        "Desarrolladores y expertos que entregan soluciones, no excusas.",
      testimonialAuthorLabel: "Cliente",
      defaultCtaText: "Hablemos",
      defaultServicesTitle: "Nuestros servicios",
      defaultValorAgregadoTitle: "Por qué elegirnos",
      defaultValorAgregadoIntro:
        "Soluciones técnicas con propósito y un equipo que se involucra en cada proyecto.",
      navServicesLabel: "Servicios",
      servicesSectionPill: "Servicios",
      servicesSectionSubtitle:
        "Soluciones técnicas pensadas para resolver problemas reales con un enfoque pragmático.",
      formTitle: "Cuéntanos tu proyecto",
      formSubmitText: "Enviar",
      contactSectionSubtitle:
        "Cuéntanos tu proyecto y te respondemos en menos de 24h.",
      bridgeHeadline: "Cuéntanos tu proyecto hoy mismo",
    },
    fallbackTeam: [
      { name: "Marta Rivas", role: "Lead Frontend", gender: "female" },
      { name: "Javier Soler", role: "Backend Developer", gender: "male" },
      { name: "Lucía Méndez", role: "Product Designer", gender: "female" },
      {
        name: "Pablo Iglesias",
        role: "Cybersecurity Specialist",
        gender: "male",
      },
    ],
    fallbackTestimonials: [
      {
        name: "María G.",
        text: "{businessName} entregó nuestro proyecto en plazo y con calidad técnica top.",
      },
      {
        name: "Andrés L.",
        text: "Equipo profesional, comunicación constante y soluciones que funcionan.",
      },
      {
        name: "Sofía P.",
        text: "Migramos toda la infraestructura sin downtime. Recomendados.",
      },
    ],
  },
  servicios: {
    photosAmbient: [
      "/img/imagina/servicios/valor-agregado/foto-1.png",
      "/img/imagina/servicios/valor-agregado/foto-2.png",
      "/img/imagina/servicios/valor-agregado/foto-3.png",
      "/img/imagina/servicios/valor-agregado/foto-4.png",
      "/img/imagina/servicios/valor-agregado/foto-5.png",
    ],
    photosMale: [
      "/img/imagina/servicios/equipo/profesional-3.png",
      "/img/imagina/servicios/equipo/profesional-5.png",
    ],
    photosFemale: [
      "/img/imagina/servicios/equipo/profesional-1.png",
      "/img/imagina/servicios/equipo/profesional-2.png",
      "/img/imagina/servicios/equipo/profesional-4.png",
    ],
    serviceIcons: [
      IconBriefcase,
      IconDocument,
      IconScale,
      IconChart,
      IconHandshakeAlt,
      IconShieldCheck,
    ],
    labels: {
      ratingText: "Clientes satisfechos 5★",
      teamSectionTitle: "El equipo experto",
      teamSectionSubtitle:
        "Profesionales con experiencia, criterio y enfoque consultivo.",
      testimonialAuthorLabel: "Cliente",
      defaultCtaText: "Solicita presupuesto",
      defaultServicesTitle: "Nuestros servicios",
      defaultValorAgregadoTitle: "Por qué elegirnos",
      defaultValorAgregadoIntro:
        "Asesoramiento experto adaptado a las necesidades de cada cliente, con resultados medibles.",
      navServicesLabel: "Servicios",
      servicesSectionPill: "Servicios",
      servicesSectionSubtitle:
        "Asesoramiento profesional adaptado a las necesidades de cada cliente.",
      formTitle: "Solicita información",
      formSubmitText: "Enviar consulta",
      contactSectionSubtitle:
        "Cuéntanos tu caso. Te respondemos con un enfoque consultivo y honesto.",
      bridgeHeadline: "Solicita tu primera consulta hoy mismo",
    },
    fallbackTeam: [
      { name: "Marta Rivas", role: "Socia directora", gender: "female" },
      { name: "Javier Soler", role: "Consultor senior", gender: "male" },
      { name: "Lucía Méndez", role: "Account manager", gender: "female" },
      { name: "Pablo Iglesias", role: "Asesor fiscal", gender: "male" },
    ],
    fallbackTestimonials: [
      {
        name: "María G.",
        text: "{businessName} nos asesoró con un enfoque cercano y muy profesional. Resultados claros.",
      },
      {
        name: "Andrés L.",
        text: "Equipo serio, exigentes con los detalles. La diferencia se nota.",
      },
      {
        name: "Sofía P.",
        text: "Resolvieron en días lo que llevaba meses atascado. Recomendados.",
      },
    ],
  },
};

export function isSupportedSector(sector: string): sector is SupportedSector {
  return sector in SECTOR_ASSETS;
}
