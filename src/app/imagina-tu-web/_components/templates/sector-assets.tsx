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

// --- RESTAURACION ----------------------------------------------------------
export const IconUtensils = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M7 2v8M7 10c-1.5 0-2.5 1-2.5 2.5V21M11 2v6a2 2 0 0 1-4 0V2" />
    <path d="M17 2c-2 0-3.5 1.5-3.5 4v6h3V21h3V2c-1 0-2.5.5-2.5 0z" />
  </svg>
);
export const IconChefHat = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M6 14a4 4 0 0 1 0-8 5 5 0 0 1 9-2 5 5 0 0 1 5 2 4 4 0 0 1 0 8" />
    <path d="M6 14h12v6c0 1-1 2-2 2H8c-1 0-2-1-2-2v-6z" />
  </svg>
);
export const IconWineGlass = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M7 3h10v6a5 5 0 0 1-10 0V3z" />
    <path d="M12 14v7M8 21h8" />
  </svg>
);
export const IconPlate = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
  </svg>
);
export const IconLeafFresh = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M4 20c10 0 16-6 16-16-8 0-16 4-16 14a3 3 0 0 0 0 2z" />
    <path d="M4 20l8-8" />
  </svg>
);
export const IconCake = (p: IconProps) => (
  <svg {...baseSvg} {...p}>
    <path d="M5 11h14v9H5z" />
    <path d="M5 15h14" />
    <path d="M9 11V8a3 3 0 0 1 6 0v3" />
    <path d="M12 5V3" />
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
  /** Hero subtitle used when the AI didn't produce a heroTagline. NEVER use
   *  the user's valueProp directly — the user's text is just inspiration and
   *  must be rewritten by the AI; this default is a clean fallback. */
  defaultHeroTagline: string;
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
  | "servicios"
  | "restauracion";

// Cuisine types offered when sector === "restauracion". The dish photos for
// the "Especialidades de la casa" section come from per-cuisine subfolders
// in /img/imagina/restauracion/platos/<cuisine>/. "Fusión" still works as a
// fallback that mixes photos from whatever buckets do have content.
export type Cuisine =
  | "tradicional"
  | "italiana"
  | "asiatica"
  | "mexicana"
  | "americana"
  | "fusion";

export const CUISINES: { slug: Cuisine; label: string }[] = [
  { slug: "tradicional", label: "Tradicional / mediterránea" },
  { slug: "italiana", label: "Italiana" },
  { slug: "asiatica", label: "Asiática (japonesa, china, tailandesa…)" },
  { slug: "mexicana", label: "Mexicana / latina" },
  { slug: "americana", label: "Americana / burger / BBQ" },
  { slug: "fusion", label: "Fusión / autor" },
];

// IMPORTANT: only list paths that ACTUALLY exist on disk. The browser will
// 404 on missing files, so keep these arrays in sync with what's been
// uploaded to public/img/imagina/restauracion/platos/<cuisine>/. Buckets
// that are still empty stay as empty arrays so the fallback in
// `getCuisinePhotos` kicks in.
const CUISINE_PHOTOS: Record<Cuisine, string[]> = {
  tradicional: [
    "/img/imagina/restauracion/platos/tradicional/39.jpg",
    "/img/imagina/restauracion/platos/tradicional/40.jpg",
    "/img/imagina/restauracion/platos/tradicional/41.jpg",
  ],
  italiana: [
    "/img/imagina/restauracion/platos/italiana/foto-1.jpg",
    "/img/imagina/restauracion/platos/italiana/foto-2.jpg",
    "/img/imagina/restauracion/platos/italiana/foto-3.jpg",
    "/img/imagina/restauracion/platos/italiana/foto-4.jpg",
  ],
  asiatica: [
    "/img/imagina/restauracion/platos/asiatica/36.jpg",
    "/img/imagina/restauracion/platos/asiatica/37.jpg",
    "/img/imagina/restauracion/platos/asiatica/38.jpg",
  ],
  mexicana: [
    "/img/imagina/restauracion/platos/mexicana/42.jpg",
    "/img/imagina/restauracion/platos/mexicana/43.jpg",
    "/img/imagina/restauracion/platos/mexicana/44.jpg",
  ],
  americana: [
    "/img/imagina/restauracion/platos/americana/48.jpg",
    "/img/imagina/restauracion/platos/americana/49.jpg",
    "/img/imagina/restauracion/platos/americana/50.jpg",
  ],
  fusion: [
    "/img/imagina/restauracion/platos/fusion/45.jpg",
    "/img/imagina/restauracion/platos/fusion/46.jpg",
    "/img/imagina/restauracion/platos/fusion/47.jpg",
  ],
};

/** Returns the dish photos to render for the chosen cuisine. If the bucket
 *  for the chosen cuisine is empty, falls back to a mix of photos from
 *  whichever buckets DO have content. */
export function getCuisinePhotos(cuisine: Cuisine): string[] {
  const requested = CUISINE_PHOTOS[cuisine];
  if (requested && requested.length > 0) return requested;
  return Object.values(CUISINE_PHOTOS)
    .filter((arr) => arr.length > 0)
    .flatMap((arr) => arr.slice(0, 3));
}

/** Cuisine-specific fallback dishes used when the AI didn't return a valid
 *  `offerings` payload. Without these, restauración previews fall back to
 *  the wizard's `offerings = [cuisineLabel]` which produces cards titled
 *  "ITALIANA" instead of real dish names. */
interface FallbackDish {
  name: string;
  tagline: string;
  blurb: string;
}

const CUISINE_FALLBACK_DISHES: Record<Cuisine, FallbackDish[]> = {
  italiana: [
    {
      name: "Spaghetti al pomodoro",
      tagline: "Clásico imprescindible",
      blurb:
        "Pasta artesana, tomate San Marzano cocinado a fuego lento y un puñado de albahaca fresca.",
    },
    {
      name: "Pizza Margherita",
      tagline: "Receta napolitana",
      blurb:
        "Masa con masa madre, mozzarella di bufala y tomate de la huerta. Cocción al horno de leña.",
    },
    {
      name: "Lasaña a la boloñesa",
      tagline: "Sabor a domingo",
      blurb:
        "Capas de pasta fresca, ragù cocinado durante horas y bechamel cremosa al horno.",
    },
    {
      name: "Tiramisú casero",
      tagline: "Para terminar dulce",
      blurb:
        "Mascarpone, bizcochos de soletilla bañados en café espresso y un toque de cacao puro.",
    },
    {
      name: "Risotto alla milanese",
      tagline: "Plato bandera",
      blurb:
        "Arroz arborio, caldo de carne, azafrán y un nudo final de mantequilla y parmesano.",
    },
    {
      name: "Burrata con tomate",
      tagline: "Producto en primer plano",
      blurb:
        "Burrata di Andria, tomate rosa de temporada y aceite de oliva virgen extra. Sin más.",
    },
  ],
  mexicana: [
    { name: "Tacos al pastor", tagline: "Sabor de la calle", blurb: "Carne marinada con achiote y especias, piña fresca y cilantro." },
    { name: "Guacamole tradicional", tagline: "Para empezar", blurb: "Aguacate, cebolla, cilantro, lima y chile servido con totopos crujientes." },
    { name: "Enchiladas verdes", tagline: "Receta de la abuela", blurb: "Tortillas rellenas bañadas en salsa de tomatillo, crema y queso fresco." },
    { name: "Mole poblano", tagline: "Plato bandera", blurb: "Salsa compleja con chiles, especias y chocolate, servida con pollo y arroz." },
    { name: "Quesadilla de flor", tagline: "Hoy en la pizarra", blurb: "Tortilla recién hecha con flor de calabaza y queso oaxaca fundido." },
    { name: "Chiles en nogada", tagline: "De temporada", blurb: "Chile poblano relleno con picadillo, salsa de nuez y granada." },
  ],
  asiatica: [
    { name: "Nigiri de salmón", tagline: "Para empezar", blurb: "Arroz vinagrado y salmón fresco cortado a mano, un toque de wasabi." },
    { name: "Ramen tonkotsu", tagline: "Reconfortante", blurb: "Caldo de cerdo cocinado 12 horas, fideos al huevo, chashu y huevo curado." },
    { name: "Gyozas a la plancha", tagline: "Casi imprescindible", blurb: "Empanadillas de cerdo y verduras, doradas por una cara y al vapor por la otra." },
    { name: "Pad thai de gambas", tagline: "Wok del día", blurb: "Fideos de arroz salteados al wok con gambas, cacahuete y lima." },
    { name: "Dim sum variado", tagline: "Para compartir", blurb: "Selección de bocados al vapor: cerdo, gamba y verdura." },
    { name: "Mochi de matcha", tagline: "Para terminar", blurb: "Pasta de arroz dulce rellena de helado de matcha." },
  ],
  tradicional: [
    { name: "Tortilla de patatas", tagline: "Plato bandera", blurb: "Patata confitada en aceite de oliva, huevo de campo y cebolla pochada lentamente." },
    { name: "Croquetas de jamón", tagline: "Casi imprescindible", blurb: "Bechamel cremosa con jamón ibérico, rebozadas y fritas al momento." },
    { name: "Pulpo a la gallega", tagline: "Producto de Galicia", blurb: "Pulpo cocido, patata, pimentón de la Vera y aceite de oliva virgen extra." },
    { name: "Solomillo al whisky", tagline: "Sabor de toda la vida", blurb: "Lomos de solomillo flambados con whisky, ajo y aceite de oliva." },
    { name: "Pisto manchego", tagline: "De la huerta", blurb: "Pimiento, calabacín, cebolla y tomate cocinados a fuego lento con un huevo encima." },
    { name: "Tarta de Santiago", tagline: "Para terminar dulce", blurb: "Almendra molida, huevo y azúcar. Sin gluten y con la cruz por encima." },
  ],
  americana: [
    { name: "Smash burger doble", tagline: "Plato bandera", blurb: "Dos carnes prensadas a la plancha, queso fundido, salsa de la casa y pan brioche." },
    { name: "Pulled pork BBQ", tagline: "Cocción lenta", blurb: "Cerdo deshilachado tras 12 horas en horno bajo, salsa BBQ ahumada y coleslaw." },
    { name: "Buffalo wings", tagline: "Para compartir", blurb: "Alitas crujientes glaseadas con salsa buffalo y dip de queso azul." },
    { name: "Mac & cheese trufado", tagline: "Reconfortante", blurb: "Macarrones con bechamel de quesos curados y aceite de trufa negra." },
    { name: "Ribs glaseadas", tagline: "Sabor a humo", blurb: "Costillas de cerdo a baja temperatura con glaseado dulce y notas de bourbon." },
    { name: "Apple pie casera", tagline: "Para terminar dulce", blurb: "Tarta de manzana con masa quebrada, canela y bola de helado de vainilla." },
  ],
  fusion: [
    { name: "Tartar de atún oriental", tagline: "Hoy en la pizarra", blurb: "Atún rojo, sésamo, lima, jengibre y aceite de oliva virgen extra." },
    { name: "Bao bun de cochinita", tagline: "Casi imprescindible", blurb: "Pan al vapor relleno de cochinita pibil, cebolla encurtida y cilantro." },
    { name: "Risotto de pimentón", tagline: "Receta de autor", blurb: "Arroz arborio cremoso con pimentón de la Vera y polvo de chorizo." },
    { name: "Ceviche nikkei", tagline: "Fresca y ligera", blurb: "Pescado curado en leche de tigre con soja, sésamo y boniato glaseado." },
    { name: "Pescado del día a la brasa", tagline: "Producto en primer plano", blurb: "Pieza entera a la brasa con jugo dashi y guarnición de huerta." },
    { name: "Coulant de matcha", tagline: "Para terminar", blurb: "Bizcocho fluido de matcha con corazón de chocolate blanco." },
  ],
};

export function getFallbackDishes(cuisine: Cuisine): FallbackDish[] {
  return CUISINE_FALLBACK_DISHES[cuisine] ?? CUISINE_FALLBACK_DISHES.fusion;
}

// ---------------------------------------------------------------------------
// Featured menu — magazine-style "Carta destacada" section rendered between
// Especialidades and Equipo for restauración. Two columns (entrantes + main
// course) with prices, plus a centered cuisine photo. Items are 100%
// invented (with €) so we don't need anything from the user or the AI.
// ---------------------------------------------------------------------------

export interface MenuItem {
  name: string;
  /** One short line — ingredients or preparation, no marketing-speak */
  desc: string;
  /** Price including € symbol */
  price: string;
}

export interface FeaturedMenu {
  leftTitle: string;
  leftItems: MenuItem[];
  rightTitle: string;
  rightItems: MenuItem[];
}

const FEATURED_MENUS: Record<Cuisine, FeaturedMenu> = {
  italiana: {
    leftTitle: "Antipasti",
    leftItems: [
      { name: "Burrata di Bufala", desc: "Tomate rosa, aceite virgen extra y albahaca.", price: "€14" },
      { name: "Carpaccio di Manzo", desc: "Buey, rúcula, parmesano y limón.", price: "€16" },
      { name: "Caprese tradicional", desc: "Mozzarella, tomate raf y pesto de la casa.", price: "€13" },
      { name: "Vitello tonnato", desc: "Ternera, salsa de atún, alcaparras y limón.", price: "€18" },
      { name: "Bruschetta del día", desc: "Pan rústico, producto de temporada.", price: "€10" },
    ],
    rightTitle: "Pasta e Secondi",
    rightItems: [
      { name: "Tagliatelle al Ragù", desc: "Pasta fresca con ragù boloñés de seis horas.", price: "€18" },
      { name: "Spaghetti alle Vongole", desc: "Almeja, ajo, perejil y un toque de guindilla.", price: "€22" },
      { name: "Risotto alla Milanese", desc: "Arroz arborio, azafrán, mantequilla y parmesano.", price: "€20" },
      { name: "Osso buco con polenta", desc: "Jarrete de ternera braseado, polenta cremosa.", price: "€28" },
      { name: "Lubina al horno", desc: "Lubina entera, tomate cherry, alcaparras y olivas.", price: "€26" },
    ],
  },
  mexicana: {
    leftTitle: "Para empezar",
    leftItems: [
      { name: "Guacamole tradicional", desc: "Aguacate machacado a mano, cilantro y lima.", price: "€11" },
      { name: "Tacos al pastor (3 uds)", desc: "Cerdo marinado con achiote, piña y cilantro.", price: "€14" },
      { name: "Ceviche de pescado", desc: "Pescado del día, lima, cebolla morada y chile.", price: "€16" },
      { name: "Quesadillas de flor", desc: "Tortilla, flor de calabaza y queso oaxaca.", price: "€13" },
      { name: "Sopa de tortilla", desc: "Caldo de pollo, chiles, tortilla crujiente y aguacate.", price: "€12" },
    ],
    rightTitle: "Platos fuertes",
    rightItems: [
      { name: "Cochinita pibil", desc: "Cerdo marinado con achiote, cocinado a baja temperatura.", price: "€22" },
      { name: "Mole poblano", desc: "Pollo, salsa de mole tradicional con cacao y especias.", price: "€24" },
      { name: "Pescado a la veracruzana", desc: "Pescado, tomate, alcaparras, aceitunas y guindilla.", price: "€26" },
      { name: "Carnitas michoacanas", desc: "Cerdo confitado, tortillas calientes y salsas.", price: "€23" },
      { name: "Chiles en nogada", desc: "Chile poblano relleno, salsa de nuez y granada.", price: "€25" },
    ],
  },
  asiatica: {
    leftTitle: "Entrantes",
    leftItems: [
      { name: "Edamame con sal de yuzu", desc: "Vainas de soja al vapor, sal cítrica.", price: "€8" },
      { name: "Gyozas a la plancha", desc: "Empanadillas de cerdo y verduras, doradas y al vapor.", price: "€12" },
      { name: "Dim sum variado", desc: "Selección de bocados al vapor: cerdo, gamba y verdura.", price: "€15" },
      { name: "Tartar de salmón", desc: "Salmón fresco, aguacate, sésamo y soja.", price: "€16" },
      { name: "Tataki de atún", desc: "Atún sellado, salsa ponzu y cebolla tierna.", price: "€18" },
    ],
    rightTitle: "Principales",
    rightItems: [
      { name: "Ramen tonkotsu", desc: "Caldo de cerdo cocinado 12 horas, chashu, huevo.", price: "€18" },
      { name: "Sushi nigiri (10 piezas)", desc: "Selección del chef según pescado del día.", price: "€28" },
      { name: "Don de chirashi", desc: "Bol de arroz con sashimi variado y verduras.", price: "€24" },
      { name: "Pad thai de gambas", desc: "Fideos de arroz al wok con gambas, cacahuete y lima.", price: "€22" },
      { name: "Pato laqueado", desc: "Pato glaseado al estilo cantonés, panqueques y hoisin.", price: "€26" },
    ],
  },
  tradicional: {
    leftTitle: "Entrantes",
    leftItems: [
      { name: "Croquetas de jamón", desc: "Bechamel cremosa con jamón ibérico, rebozadas al momento.", price: "€10" },
      { name: "Tortilla de patatas", desc: "Cebolla pochada lentamente, huevo de campo, jugosa.", price: "€9" },
      { name: "Pulpo a la gallega", desc: "Pulpo cocido, patata, pimentón de la Vera y aceite.", price: "€18" },
      { name: "Ensaladilla rusa", desc: "Patata, mayonesa de la casa, atún y huevo cocido.", price: "€11" },
      { name: "Anchoas del Cantábrico", desc: "Filetes de anchoa con tomate raf y aceite.", price: "€16" },
    ],
    rightTitle: "Principales",
    rightItems: [
      { name: "Solomillo al whisky", desc: "Lomos de solomillo flambados con whisky y ajo.", price: "€24" },
      { name: "Bacalao al pil-pil", desc: "Lomo de bacalao, ajo, guindilla y emulsión de su gelatina.", price: "€26" },
      { name: "Cochinillo asado", desc: "Cochinillo segoviano asado al horno de leña.", price: "€28" },
      { name: "Merluza en salsa verde", desc: "Merluza, guisantes, espárragos y caldo de pescado.", price: "€25" },
      { name: "Carrillera de ternera", desc: "Carrillera braseada al vino tinto, puré de patata.", price: "€22" },
    ],
  },
  americana: {
    leftTitle: "Para empezar",
    leftItems: [
      { name: "Buffalo wings (6 uds)", desc: "Alitas crujientes glaseadas con salsa buffalo.", price: "€10" },
      { name: "Nachos cargados", desc: "Totopos, queso fundido, chili con carne y guacamole.", price: "€12" },
      { name: "Onion rings", desc: "Aros de cebolla rebozados, salsa ranchera.", price: "€8" },
      { name: "Loaded fries", desc: "Patatas con queso, bacon ahumado y cebollino.", price: "€11" },
      { name: "Caesar salad", desc: "Lechuga romana, pollo, parmesano y crutones.", price: "€13" },
    ],
    rightTitle: "Principales",
    rightItems: [
      { name: "Smash burger doble", desc: "Dos carnes prensadas, queso fundido y salsa de la casa.", price: "€16" },
      { name: "Pulled pork BBQ", desc: "Cerdo deshilachado a baja temperatura con coleslaw.", price: "€18" },
      { name: "Ribs al bourbon", desc: "Costillas glaseadas, notas de bourbon y miel.", price: "€22" },
      { name: "Mac & cheese trufado", desc: "Macarrones con cuatro quesos y aceite de trufa.", price: "€15" },
      { name: "Apple pie con helado", desc: "Tarta de manzana caliente y helado de vainilla.", price: "€9" },
    ],
  },
  fusion: {
    leftTitle: "Para empezar",
    leftItems: [
      { name: "Tartar de atún oriental", desc: "Atún rojo, sésamo, lima, jengibre y aceite de oliva.", price: "€18" },
      { name: "Bao bun de cochinita", desc: "Pan al vapor, cochinita pibil y encurtidos.", price: "€14" },
      { name: "Ceviche nikkei", desc: "Pescado curado, leche de tigre, soja y boniato.", price: "€16" },
      { name: "Croquetas del chef", desc: "Receta del chef, cambia según temporada.", price: "€11" },
      { name: "Ensalada de mercado", desc: "Brotes, verduras y vinagreta de la casa.", price: "€12" },
    ],
    rightTitle: "Principales",
    rightItems: [
      { name: "Risotto de pimentón", desc: "Arroz cremoso con pimentón de la Vera y chorizo.", price: "€22" },
      { name: "Pescado a la brasa con dashi", desc: "Pieza del día a la brasa con caldo dashi y huerta.", price: "€28" },
      { name: "Solomillo con teriyaki", desc: "Solomillo de ternera, glaseado teriyaki y patata.", price: "€30" },
      { name: "Vegetal de autor", desc: "Creación vegetal del chef, cambia cada semana.", price: "€19" },
      { name: "Coulant de matcha", desc: "Bizcocho fluido de matcha, corazón de chocolate.", price: "€9" },
    ],
  },
};

export function getFeaturedMenu(cuisine: Cuisine): FeaturedMenu {
  return FEATURED_MENUS[cuisine] ?? FEATURED_MENUS.fusion;
}

/** Role-coded photos for restauración. When the AI returns the team, we
 *  match roles by keyword and route them to the photo that visually fits
 *  (e.g. the chef-hat photo only goes to a chef-level role). */
export interface RestauracionRoleHints {
  chefMale: string;
  chefFemale: string;
  managerMale: string;
  managerFemale: string;
}

// TEMP: with the new natural-bg photo set, the role-coded mapping is gone
// — we don't know yet which of 16-21.jpg is the chef vs the gerente. Until
// the user re-labels them, leave the function as a no-op and let the
// generic pool drive the picks. Re-enable by filling in actual paths.
export const RESTAURACION_ROLE_PHOTOS: RestauracionRoleHints = {
  chefMale: "",
  chefFemale: "",
  managerMale: "",
  managerFemale: "",
};

/** Pick the photo that best matches a given role keyword + gender. Returns
 *  null if no specific override applies — caller should fall back to the
 *  generic sequential gender-pool pick. */
export function getRestauracionRolePhoto(
  _role: string,
  _gender: "male" | "female",
): string | null {
  return null;
}

export const SECTOR_ASSETS: Record<SupportedSector, SectorAssets> = {
  salud: {
    photosAmbient: [
      "/img/imagina/salud/valor-agregado/foto-1.jpg",
      "/img/imagina/salud/valor-agregado/foto-2.jpg",
      "/img/imagina/salud/valor-agregado/foto-3.jpg",
      "/img/imagina/salud/valor-agregado/foto-4.jpg",
      "/img/imagina/salud/valor-agregado/foto-5.jpg",
    ],
    // TEMP: gender-agnostic pools while the new photo set (with backgrounds)
    // doesn't have a male/female split yet. The template still asks for both
    // arrays so we point them at the same pool — refine later by hand.
    photosMale: [
      "/img/imagina/salud/equipo/1.jpg",
      "/img/imagina/salud/equipo/2.jpg",
      "/img/imagina/salud/equipo/3.jpg",
      "/img/imagina/salud/equipo/4.jpg",
      "/img/imagina/salud/equipo/5.jpg",
    ],
    photosFemale: [
      "/img/imagina/salud/equipo/1.jpg",
      "/img/imagina/salud/equipo/2.jpg",
      "/img/imagina/salud/equipo/3.jpg",
      "/img/imagina/salud/equipo/4.jpg",
      "/img/imagina/salud/equipo/5.jpg",
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
      defaultHeroTagline:
        "Cuidamos cada detalle de tu salud con un equipo cercano, instalaciones modernas y atención personalizada.",
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
      { name: "Javier Soler", role: "Especialista", gender: "male" },
      { name: "Lucía Méndez", role: "Profesional sanitaria", gender: "female" },
      { name: "Pablo Iglesias", role: "Recepción", gender: "male" },
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
      "/img/imagina/educacion/equipo/11.jpg",
      "/img/imagina/educacion/equipo/12.jpg",
      "/img/imagina/educacion/equipo/13.jpg",
      "/img/imagina/educacion/equipo/14.jpg",
      "/img/imagina/educacion/equipo/15.jpg",
    ],
    photosFemale: [
      "/img/imagina/educacion/equipo/11.jpg",
      "/img/imagina/educacion/equipo/12.jpg",
      "/img/imagina/educacion/equipo/13.jpg",
      "/img/imagina/educacion/equipo/14.jpg",
      "/img/imagina/educacion/equipo/15.jpg",
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
      defaultHeroTagline:
        "Educación con criterio, profesores que conocen a cada alumno y un proyecto pensado para acompañar de verdad.",
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
      "/img/imagina/moda/equipo/moda-1.jpg",
      "/img/imagina/moda/equipo/moda-2.jpg",
      "/img/imagina/moda/equipo/moda-3.jpg",
      "/img/imagina/moda/equipo/moda-4.jpg",
      "/img/imagina/moda/equipo/moda-5.jpg",
    ],
    photosFemale: [
      "/img/imagina/moda/equipo/moda-1.jpg",
      "/img/imagina/moda/equipo/moda-2.jpg",
      "/img/imagina/moda/equipo/moda-3.jpg",
      "/img/imagina/moda/equipo/moda-4.jpg",
      "/img/imagina/moda/equipo/moda-5.jpg",
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
      defaultHeroTagline:
        "Diseño con identidad y oficio. Piezas pensadas para quienes tienen criterio propio.",
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
      "/img/imagina/tecnologia/equipo/22.jpg",
      "/img/imagina/tecnologia/equipo/23.jpg",
      "/img/imagina/tecnologia/equipo/24.jpg",
      "/img/imagina/tecnologia/equipo/25.jpg",
      "/img/imagina/tecnologia/equipo/26.jpg",
      "/img/imagina/tecnologia/equipo/27b.jpg",
    ],
    photosFemale: [
      "/img/imagina/tecnologia/equipo/22.jpg",
      "/img/imagina/tecnologia/equipo/23.jpg",
      "/img/imagina/tecnologia/equipo/24.jpg",
      "/img/imagina/tecnologia/equipo/25.jpg",
      "/img/imagina/tecnologia/equipo/26.jpg",
      "/img/imagina/tecnologia/equipo/27b.jpg",
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
      defaultHeroTagline:
        "Soluciones tecnológicas pensadas para resolver problemas reales, con un equipo que se involucra en cada proyecto.",
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
      "/img/imagina/servicios/equipo/27.jpg",
      "/img/imagina/servicios/equipo/28.jpg",
      "/img/imagina/servicios/equipo/29.jpg",
      "/img/imagina/servicios/equipo/30.jpg",
      "/img/imagina/servicios/equipo/31.jpg",
    ],
    photosFemale: [
      "/img/imagina/servicios/equipo/27.jpg",
      "/img/imagina/servicios/equipo/28.jpg",
      "/img/imagina/servicios/equipo/29.jpg",
      "/img/imagina/servicios/equipo/30.jpg",
      "/img/imagina/servicios/equipo/31.jpg",
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
      defaultHeroTagline:
        "Asesoramiento experto con enfoque consultivo. Decisiones informadas, resultados medibles.",
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
  restauracion: {
    photosAmbient: [
      "/img/imagina/restauracion/valor-agregado/foto-1.png",
      "/img/imagina/restauracion/valor-agregado/foto-2.png",
      "/img/imagina/restauracion/valor-agregado/foto-3.png",
      "/img/imagina/restauracion/valor-agregado/foto-4.png",
      "/img/imagina/restauracion/valor-agregado/foto-5.png",
    ],
    photosMale: [
      "/img/imagina/restauracion/equipo/16.jpg",
      "/img/imagina/restauracion/equipo/17.jpg",
      "/img/imagina/restauracion/equipo/18.jpg",
      "/img/imagina/restauracion/equipo/19.jpg",
      "/img/imagina/restauracion/equipo/20.jpg",
      "/img/imagina/restauracion/equipo/21.jpg",
    ],
    photosFemale: [
      "/img/imagina/restauracion/equipo/16.jpg",
      "/img/imagina/restauracion/equipo/17.jpg",
      "/img/imagina/restauracion/equipo/18.jpg",
      "/img/imagina/restauracion/equipo/19.jpg",
      "/img/imagina/restauracion/equipo/20.jpg",
      "/img/imagina/restauracion/equipo/21.jpg",
    ],
    serviceIcons: [
      IconUtensils,
      IconChefHat,
      IconWineGlass,
      IconPlate,
      IconLeafFresh,
      IconCake,
    ],
    labels: {
      ratingText: "Cocina con alma 5★",
      teamSectionTitle: "Nuestro equipo",
      teamSectionSubtitle:
        "Cocina, sala y atención que cuidan cada detalle del paso por el restaurante.",
      testimonialAuthorLabel: "Comensal",
      defaultHeroTagline:
        "Cocina con producto, sala que cuida y una mesa pensada para volver.",
      defaultCtaText: "Reserva tu mesa",
      defaultServicesTitle: "Especialidades de la casa",
      defaultValorAgregadoTitle: "Por qué elegirnos",
      defaultValorAgregadoIntro:
        "Producto de temporada, cocina con criterio y una sala que sabe acompañar la experiencia.",
      navServicesLabel: "Carta",
      servicesSectionPill: "Carta",
      servicesSectionSubtitle:
        "Una selección de platos que define nuestra cocina y la mesa que ofrecemos.",
      formTitle: "Reserva tu mesa",
      formSubmitText: "Reservar mesa",
      contactSectionSubtitle:
        "Reserva tu mesa o pregúntanos lo que necesites. Estamos para acompañar tu visita.",
      bridgeHeadline: "Reserva tu mesa para hoy o mañana",
    },
    fallbackTeam: [
      { name: "Carlos Rivas", role: "Jefe de cocina", gender: "male" },
      { name: "Marta Soler", role: "Jefa de sala", gender: "female" },
      { name: "Andrés Méndez", role: "Sumiller", gender: "male" },
      { name: "Lucía Iglesias", role: "Maître", gender: "female" },
    ],
    fallbackTestimonials: [
      {
        name: "María G.",
        text: "Una experiencia redonda en {businessName}. El producto se nota desde la primera cucharada.",
      },
      {
        name: "Andrés L.",
        text: "Sala atenta sin agobiar, platos con identidad propia. Volveremos sin duda.",
      },
      {
        name: "Sofía P.",
        text: "El sumiller bordó el maridaje. Cena que recuerdas semanas después.",
      },
    ],
  },
};

export function isSupportedSector(sector: string): sector is SupportedSector {
  return sector in SECTOR_ASSETS;
}
