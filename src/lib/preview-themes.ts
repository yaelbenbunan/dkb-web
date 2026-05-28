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

export type SectorSlug =
  | "salud"
  | "educacion"
  | "restauracion"
  | "moda"
  | "tecnologia"
  | "servicios";

export interface Sector {
  slug: SectorSlug;
  label: string;
}

export const PALETTES: Palette[] = [
  {
    slug: "azul-electrico",
    name: "Azul eléctrico",
    bg: "#f5fafd",
    surface: "#ffffff",
    text: "#0f172a",
    accent: "#2563eb",
    heroGradient:
      "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #bae6fd 100%)",
  },
  {
    slug: "verde-bienestar",
    name: "Verde bienestar",
    bg: "#f6fbf7",
    surface: "#ffffff",
    text: "#1b3b2f",
    accent: "#2d6a4f",
    heroGradient:
      "linear-gradient(135deg, #ffffff 0%, #d8f3dc 50%, #95d5b2 100%)",
  },
  {
    slug: "tierra-suave",
    name: "Tierra suave",
    bg: "#faf3ec",
    surface: "#ffffff",
    text: "#6b4f4f",
    accent: "#b08968",
    heroGradient:
      "linear-gradient(135deg, #ffffff 0%, #e8c5a0 50%, #d4a88c 100%)",
  },
  {
    slug: "coral-suave",
    name: "Coral suave",
    bg: "#fdfcfb",
    surface: "#ffffff",
    text: "#2d3142",
    accent: "#ff6b6b",
    heroGradient:
      "linear-gradient(135deg, #ffffff 0%, #ffd3b6 40%, #ffa07a 75%, #ff6b6b 100%)",
  },
  {
    slug: "morado-atrevido",
    name: "Morado atrevido",
    bg: "#0e0420",
    surface: "#1a0a3d",
    text: "#f5ecff",
    accent: "#c084fc",
    heroGradient:
      "linear-gradient(135deg, #0e0420 0%, #4c1d95 50%, #c084fc 100%)",
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
];

export const SECTOR_ICONS: Record<SectorSlug, string> = {
  salud: "🩺",
  educacion: "🎓",
  restauracion: "🍽️",
  moda: "👗",
  tecnologia: "💻",
  servicios: "💼",
};

/** Slug used when the user picks the "Personalizada" option in the wizard
 *  and supplies their own three colors. The Palette object is built on the
 *  fly via {@link buildCustomPalette}. */
export const CUSTOM_PALETTE_SLUG = "personalizada";

export interface CustomPaletteColors {
  /** Dark color — used for text and the testimonios section background */
  text: string;
  /** Brand/accent color — CTAs, gradient endpoint, highlights */
  accent: string;
  /** Light color — base for hero gradient and soft tints */
  tint: string;
}

/** Linear-interpolate two #rrggbb colors. `t ∈ [0,1]`. */
function mixHex(a: string, b: string, t: number): string {
  const parse = (s: string) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/** Build a Palette from the user's 3 custom colors. Layout follows the same
 *  `surface`/`text` contract as the catalog so contrast helpers keep working. */
export function buildCustomPalette(colors: CustomPaletteColors): Palette {
  return {
    slug: CUSTOM_PALETTE_SLUG,
    name: "Personalizada",
    bg: mixHex("#ffffff", colors.tint, 0.18),
    surface: "#ffffff",
    text: colors.text,
    accent: colors.accent,
    heroGradient: `linear-gradient(135deg, ${colors.tint} 0%, ${mixHex(
      colors.tint,
      colors.accent,
      0.35,
    )} 55%, ${mixHex(colors.tint, colors.accent, 0.6)} 100%)`,
  };
}

const PALETTE_SLUGS = new Set<string>(PALETTES.map((p) => p.slug));
PALETTE_SLUGS.add(CUSTOM_PALETTE_SLUG);
const TYPO_SLUGS = new Set(TYPOGRAPHIES.map((t) => t.slug));
const SECTOR_SLUGS = new Set<string>(SECTORS.map((s) => s.slug));

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

/** Returns the palette to use given the wizard's `palette` slug and the
 *  optional custom colors. When the slug is `personalizada` and the colors
 *  are provided, a synthetic palette is built; otherwise the catalog lookup
 *  applies. */
export function resolvePalette(
  slug: string,
  colors?: CustomPaletteColors,
): Palette | undefined {
  if (slug === CUSTOM_PALETTE_SLUG) {
    return colors ? buildCustomPalette(colors) : undefined;
  }
  return getPalette(slug);
}

export function getTypography(slug: string): Typography | undefined {
  return TYPOGRAPHIES.find((t) => t.slug === slug);
}

export function getSectorLabel(slug: string): string {
  return SECTORS.find((s) => s.slug === slug)?.label ?? slug;
}
