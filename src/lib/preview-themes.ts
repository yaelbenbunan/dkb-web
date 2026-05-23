export interface Palette {
  slug: string;
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  heroGradient: string;
}

export interface Typography {
  slug: string;
  name: string;
  displayVar: string;
  bodyVar: string;
}

export interface Sector {
  slug: string;
  label: string;
}

export const PALETTES: Palette[] = [
  {
    slug: "pastel-suave",
    name: "Pastel suave",
    bg: "#fef7f4",
    surface: "#ffffff",
    text: "#2a2438",
    accent: "#c084fc",
    heroGradient:
      "linear-gradient(135deg, #fce7f3 0%, #e9d5ff 60%, #ddd6fe 100%)",
  },
  {
    slug: "oscuro-moderno",
    name: "Oscuro moderno",
    bg: "#0a0a0f",
    surface: "#16161f",
    text: "#f5f5f7",
    accent: "#22d3ee",
    heroGradient:
      "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0e7490 100%)",
  },
  {
    slug: "azul-corporativo",
    name: "Azul corporativo",
    bg: "#f4f7fc",
    surface: "#ffffff",
    text: "#0c1c40",
    accent: "#187bef",
    heroGradient:
      "linear-gradient(135deg, #dbeafe 0%, #93c5fd 60%, #187bef 100%)",
  },
  {
    slug: "tierra-natural",
    name: "Tierra natural",
    bg: "#faf6f0",
    surface: "#ffffff",
    text: "#2d2419",
    accent: "#a16207",
    heroGradient:
      "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #d97706 100%)",
  },
];

export const TYPOGRAPHIES: Typography[] = [
  {
    slug: "moderna-sans",
    name: "Moderna sans",
    displayVar: "--font-prev-inter",
    bodyVar: "--font-prev-inter",
  },
  {
    slug: "geometrica",
    name: "Geométrica",
    displayVar: "--font-prev-space",
    bodyVar: "--font-prev-space",
  },
  {
    slug: "elegante-serif",
    name: "Elegante serif",
    displayVar: "--font-prev-playfair",
    bodyVar: "--font-prev-source",
  },
  {
    slug: "friendly",
    name: "Friendly",
    displayVar: "--font-prev-fraunces",
    bodyVar: "--font-prev-fraunces",
  },
];

export const SECTORS: Sector[] = [
  { slug: "salud", label: "Salud" },
  { slug: "educacion", label: "Educación" },
  { slug: "restauracion", label: "Restauración" },
  { slug: "moda", label: "Moda" },
  { slug: "tecnologia", label: "Tecnología" },
  { slug: "servicios", label: "Servicios profesionales" },
  { slug: "otro", label: "Otro" },
];

export const SECTOR_ICONS: Record<string, string> = {
  salud: "🩺",
  educacion: "🎓",
  restauracion: "🍽️",
  moda: "👗",
  tecnologia: "💻",
  servicios: "💼",
  otro: "✨",
};

const PALETTE_SLUGS = new Set(PALETTES.map((p) => p.slug));
const TYPO_SLUGS = new Set(TYPOGRAPHIES.map((t) => t.slug));
const SECTOR_SLUGS = new Set(SECTORS.map((s) => s.slug));

export function isPaletteSlug(v: unknown): v is string {
  return typeof v === "string" && PALETTE_SLUGS.has(v);
}

export function isTypographySlug(v: unknown): v is string {
  return typeof v === "string" && TYPO_SLUGS.has(v);
}

export function isSectorSlug(v: unknown): v is string {
  return typeof v === "string" && SECTOR_SLUGS.has(v);
}

export function getPalette(slug: string): Palette | undefined {
  return PALETTES.find((p) => p.slug === slug);
}

export function getTypography(slug: string): Typography | undefined {
  return TYPOGRAPHIES.find((t) => t.slug === slug);
}

export function getSectorLabel(slug: string): string {
  return SECTORS.find((s) => s.slug === slug)?.label ?? slug;
}
