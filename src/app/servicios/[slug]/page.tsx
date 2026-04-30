import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceFaqs } from "@/components/servicios/ServiceFaqs";
import { getAllServices, getServiceBySlug, getAllCaseStudies } from "@/lib/content";

export async function generateStaticParams() {
  return getAllServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.title} — dinkbit`,
    description: service.shortDescription,
  };
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const allServices = getAllServices();
  // Casos relacionados con este servicio (que tengan este tag)
  const relatedCases = getAllCaseStudies().filter((c) => c.tags.includes(slug));

  return (
    <article>
      {/* Hero del servicio */}
      <header className="border-b border-[--color-border] bg-[--color-bg-subtle] py-20 md:py-24">
        <Container className="grid gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
          <Image
            src={`/img/icons/servicios/${service.slug}.png`}
            alt=""
            width={72}
            height={72}
            className="h-16 w-16"
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
              {service.title}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
              {service.titleLong ?? service.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[--color-fg-muted]">
              {service.shortDescription}
            </p>
          </div>
        </Container>
      </header>

      {/* Body 2/3 + 1/3 */}
      <Container className="grid gap-12 py-20 lg:grid-cols-[2fr_1fr] lg:gap-14">
        {/* Columna izq: contenido */}
        <div className="space-y-16">
          {/* Intro + bullets */}
          {(service.intro || service.bullets) && (
            <section>
              {service.intro && (
                <p className="text-lg leading-relaxed text-[--color-fg-muted]">
                  {service.intro}
                </p>
              )}
              {service.bullets && service.bullets.length > 0 && (
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {service.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[--color-fg]"
                    >
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[--color-accent]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Diferenciador */}
          {service.diferenciador && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                ¿Qué hace diferente nuestro enfoque?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[--color-fg-muted]">
                {service.diferenciador}
              </p>
            </section>
          )}

          {/* FAQs */}
          {service.faqs && service.faqs.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Preguntas frecuentes
              </h2>
              <div className="mt-6">
                <ServiceFaqs faqs={service.faqs} />
              </div>
            </section>
          )}

          {/* Casos relacionados */}
          {relatedCases.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Casos de éxito
              </h2>
              <p className="mt-2 text-[--color-fg-muted]">
                Algunos clientes a los que ayudamos con {service.title.toLowerCase()}.
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {relatedCases.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/casos-de-exito/${c.slug}`}
                      className="flex h-24 items-center justify-center rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-4 transition-colors hover:border-[--color-accent]"
                    >
                      {c.clientLogo ? (
                        <Image
                          src={c.clientLogo}
                          alt={c.client}
                          width={120}
                          height={48}
                          className="max-h-12 w-auto object-contain opacity-70 transition hover:opacity-100"
                        />
                      ) : (
                        <span className="text-sm font-medium text-[--color-fg]">
                          {c.client}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Columna der: sticky CTA + menu de servicios */}
        <aside className="lg:sticky lg:top-28 lg:h-max lg:self-start">
          <div className="space-y-6">
            {/* CTA Box */}
            {service.ctaBox && (
              <div className="rounded-3xl border border-[--color-accent] bg-gradient-to-br from-[--color-accent-soft] to-transparent p-7">
                <p className="text-xl font-bold leading-tight text-[--color-fg]">
                  {service.ctaBox.title}
                </p>
                {service.ctaBox.subtitle && (
                  <p className="mt-2 text-sm text-[--color-fg-muted]">
                    {service.ctaBox.subtitle}
                  </p>
                )}
                <ButtonLink
                  href={service.ctaBox.buttonHref}
                  size="lg"
                  className="mt-6 w-full"
                >
                  {service.ctaBox.buttonText}
                </ButtonLink>
              </div>
            )}

            {/* Menu de servicios */}
            <nav className="rounded-3xl border border-[--color-border] bg-[--color-bg-elevated] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-fg-muted]">
                Otros servicios
              </p>
              <ul className="mt-4 space-y-1">
                {allServices.map((s) => {
                  const isActive = s.slug === service.slug;
                  return (
                    <li key={s.slug}>
                      <Link
                        href={`/servicios/${s.slug}`}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-[--color-accent-soft] text-[--color-accent]"
                            : "text-[--color-fg-muted] hover:bg-[--color-bg] hover:text-[--color-fg]"
                        }`}
                      >
                        <span>{s.title}</span>
                        <span className="text-[--color-fg-dim]">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>
      </Container>
    </article>
  );
}
