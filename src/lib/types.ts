export interface Service {
  slug: string;
  title: string;
  shortDescription: string;
  heroImage?: string;
  order: number;
  body: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  client: string;
  tags: string[];
  heroImage?: string;
  metricHeadline?: string;
  publishedAt: string;
  body: string;
}
