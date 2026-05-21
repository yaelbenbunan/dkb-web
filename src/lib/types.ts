export interface ServiceFaq {
  q: string;
  a: string;
}

export interface Service {
  slug: string;
  title: string;
  titleLong?: string;
  shortDescription: string;
  heroImage?: string;
  order: number;
  intro?: string;
  bullets?: string[];
  diferenciador?: string;
  faqs?: ServiceFaq[];
  body: string;
}

export type MockupKind = "desktop" | "mobile" | "mobile-tilt" | "none";

export interface CaseImage {
  src: string;
  /** Frame estilo browser/teléfono. Por defecto "none" (sin frame, solo rounded) */
  mockup?: MockupKind;
  /** Texto alternativo opcional */
  alt?: string;
}

export interface CaseSection {
  tag: string;
  title: string;
  body: string;
  /** Acepta strings (sin frame) o objetos {src, mockup} para frame específico */
  images?: Array<string | CaseImage>;
}

export interface CaseSocial {
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  client: string;
  clientLogo?: string;
  description?: string;
  reto?: string;
  tags: string[];
  metricHeadline?: string;
  social?: CaseSocial;
  clientSince?: string;
  publishedAt: string;
  sections?: CaseSection[];
  body: string;
}
