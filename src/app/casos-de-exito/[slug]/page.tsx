import Script from "next/script";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { CaseHeader } from "@/components/casos/CaseHeader";
import { CaseSections } from "@/components/casos/CaseSections";
import { RelatedCases } from "@/components/casos/RelatedCases";
import { Reveal } from "@/components/ui/Reveal";
import {
  Breadcrumbs,
  buildBreadcrumbSchema,
} from "@/components/ui/Breadcrumbs";
import {
  getAllCaseStudies,
  getCaseStudyBySlug,
  getRelatedCases,
  getAllServices,
} from "@/lib/content";

const SITE_URL = "https://www.dinkbit.es";

export async function generateStaticParams() {
  return getAllCaseStudies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCaseStudyBySlug(slug);
  if (!c) return {};
  const description =
    c.description ?? c.metricHeadline ?? `Caso de éxito: ${c.client}`;
  const url = `/casos-de-exito/${c.slug}`;
  return {
    title: c.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: c.title,
      description,
      siteName: "dinkbit",
    },
    twitter: {
      card: "summary_large_image",
      title: c.title,
      description,
    },
  };
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);
  if (!caseStudy) notFound();

  const related = getRelatedCases(slug, 8);
  const serviceTitleBySlug = Object.fromEntries(
    getAllServices().map((s) => [s.slug, s.title]),
  );

  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: "Casos de éxito", href: "/casos-de-exito" },
    { label: caseStudy.title },
  ];

  const description =
    caseStudy.description ??
    caseStudy.metricHeadline ??
    `Caso de éxito: ${caseStudy.client}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: caseStudy.title,
    description,
    url: `${SITE_URL}/casos-de-exito/${caseStudy.slug}`,
    datePublished: caseStudy.publishedAt,
    inLanguage: "es-ES",
    image: `${SITE_URL}/casos-de-exito/${caseStudy.slug}/opengraph-image`,
    author: { "@type": "Organization", name: "dinkbit", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "dinkbit",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    about: caseStudy.client
      ? { "@type": "Organization", name: caseStudy.client }
      : undefined,
    keywords: caseStudy.tags?.join(", "),
  };

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbItems);

  return (
    <article>
      <Script
        id={`ld-article-${caseStudy.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(articleSchema).replace(/</g, "\\u003c")}
      </Script>
      <Script
        id={`ld-breadcrumb-${caseStudy.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c")}
      </Script>
      <Container className="pt-8">
        <Breadcrumbs items={breadcrumbItems} />
      </Container>
      <CaseHeader
        caseStudy={caseStudy}
        serviceTitleBySlug={serviceTitleBySlug}
      />

      {/* Reto */}
      {caseStudy.reto && (
        <Reveal>
          <section className="relative isolate overflow-hidden bg-bg-deep py-16 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-40"
            />
            <Container>
              <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-16">
                <h2 className="flex w-fit items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-accent">
                  <span aria-hidden className="h-px w-10 bg-accent" />
                  El reto
                </h2>
                <p className="max-w-3xl text-lg leading-relaxed text-fg md:text-xl">
                  {caseStudy.reto}
                </p>
              </div>
            </Container>
          </section>
        </Reveal>
      )}

      {/* Soluciones por servicio */}
      {caseStudy.sections && caseStudy.sections.length > 0 && (
        <Reveal>
          <CaseSections
            sections={caseStudy.sections}
            websiteUrl={caseStudy.social?.website}
          />
        </Reveal>
      )}

      <Reveal>
        <RelatedCases cases={related} />
      </Reveal>
    </article>
  );
}
