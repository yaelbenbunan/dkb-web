export interface ServiceFaq {
  q: string;
  a: string;
}

export interface ServiceCtaBox {
  title: string;
  subtitle?: string;
  buttonText: string;
  buttonHref: string;
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
  ctaBox?: ServiceCtaBox;
  body: string;
}

export interface CaseSection {
  tag: string;
  title: string;
  body: string;
  images?: string[];
}

export interface CaseSocial {
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
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
