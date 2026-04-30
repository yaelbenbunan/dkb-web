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
      <header className="relative isolate overflow-hidden py-24 md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "80%", ["--sy" as string]: "30%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <Container className="grid gap-10 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[--color-bg-elevated] shadow-[0_0_40px_rgba(24,123,239,0.25)] ring-1 ring-[--color-accent]/20">
            <Image
              src={`/img/icons/servicios/${service.slug}.png`}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
              {service.title}
            </p>
            <h1
              className="mt-4 font-black leading-[0.95] tracking-tight"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              {service.titleLong ?? service.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[--color-fg-muted] md:text-xl">
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
                      className="flex h-24 items-center justify-center rounded-2xl bg-[--color-bg-elevated] p-4 ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-[--color-accent]/40"
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
            {/* CTA Box — fondo azul sólido para destacar */}
            {service.ctaBox && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[--color-accent] via-[#1a6fd9] to-[#0f4a9c] p-7 text-white shadow-[0_0_60px_-15px_rgba(24,123,239,0.6)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-noise opacity-[0.08] mix-blend-overlay"
                />
                <p className="relative text-xl font-bold leading-tight">
                  {service.ctaBox.title}
                </p>
                {service.ctaBox.subtitle && (
                  <p className="relative mt-2 text-sm text-white/85">
                    {service.ctaBox.subtitle}
                  </p>
                )}
                <ButtonLink
                  href={service.ctaBox.buttonHref}
                  size="lg"
                  variant="ghost"
                  className="relative mt-6 w-full bg-white text-[--color-accent] hover:bg-white hover:opacity-90"
                >
                  {service.ctaBox.buttonText} →
                </ButtonLink>
              </div>
            )}

            {/* Menu de servicios sin border */}
            <nav className="rounded-3xl bg-[--color-bg-elevated] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--color-fg-muted]">
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
                            ? "bg-[--color-accent-soft] font-semibold text-[--color-accent]"
                            : "text-[--color-fg-muted] hover:bg-[--color-bg] hover:text-[--color-fg]"
                        }`}
                      >
                        <span>{s.title}</span>
                        <span className={isActive ? "text-[--color-accent]" : "text-[--color-fg-dim]"}>→</span>
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
