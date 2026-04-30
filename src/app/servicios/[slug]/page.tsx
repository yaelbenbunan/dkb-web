import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ServiceFaqs } from "@/components/servicios/ServiceFaqs";
import { RelatedCasesMarquee } from "@/components/casos/RelatedCasesMarquee";
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
  const relatedCases = getAllCaseStudies().filter((c) => c.tags.includes(slug));

  return (
    <article>
      {/* Hero del servicio: bg image + capas decorativas + chip y línea inferior brillante */}
      <header className="relative isolate overflow-hidden">
        <Image
          src="/img/servicios/hero-desarrollo-web1.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center opacity-50"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,9,13,0.55) 0%, rgba(14,16,21,0.85) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "75%", ["--sy" as string]: "30%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30 fade-edges-y"
        />

        <Container className="relative py-24 md:py-32">
          {/* Breadcrumb minimal arriba */}
          <nav className="mb-10 flex items-center gap-2 text-xs text-[--color-fg-dim]">
            <Link
              href="/servicios"
              className="font-medium transition-colors hover:text-[--color-accent]"
            >
              Servicios
            </Link>
            <span aria-hidden>/</span>
            <span className="text-[--color-fg-muted]">{service.title}</span>
          </nav>

          <div className="grid items-end gap-10 md:grid-cols-[auto_1fr] md:gap-12">
            {/* Icono del servicio en card grande con glow */}
            <div className="surface flex h-24 w-24 items-center justify-center rounded-3xl shadow-[0_0_50px_rgba(24,123,239,0.35)]">
              <Image
                src={`/img/icons/servicios/${service.slug}.png`}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16"
              />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#187bef]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#3a90f2] ring-1 ring-[#187bef]/30">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#3a90f2] animate-ping-soft" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3a90f2]" />
                </span>
                Servicio
              </p>
              <h1
                className="mt-5 font-black leading-[1] tracking-tight"
                style={{ fontSize: "var(--text-display-lg)" }}
              >
                {service.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[--color-fg-muted] md:text-xl">
                {service.shortDescription}
              </p>
            </div>
          </div>
        </Container>

        {/* Línea brillante inferior que separa del cuerpo */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
        />
      </header>

      {/* Body 2/3 + 1/3 */}
      <Container className="grid gap-12 py-20 lg:grid-cols-[2fr_1fr] lg:gap-14">
        <div className="min-w-0 space-y-16">
          {/* Intro + bullets */}
          {(service.intro || service.bullets) && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                ¿Qué <span className="text-[#187bef]">ofrecemos</span>?
              </h2>
              {service.intro && (
                <p className="mt-5 text-lg leading-relaxed text-[--color-fg-muted]">
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
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#187bef]/15 text-[#3a90f2]">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M3 7.5L6 10.5L11 4.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
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
                ¿Qué hace diferente nuestro{" "}
                <span className="text-[#187bef]">enfoque</span>?
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
                Preguntas{" "}
                <span className="text-[#187bef]">frecuentes</span>
              </h2>
              <div className="mt-6">
                <ServiceFaqs faqs={service.faqs} />
              </div>
            </section>
          )}

          {/* Casos relacionados — carrusel marquee */}
          {relatedCases.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Casos de <span className="text-[#187bef]">éxito</span>
              </h2>
              <p className="mt-2 text-[--color-fg-muted]">
                Algunos clientes a los que ayudamos con{" "}
                {service.title.toLowerCase()}.
              </p>
              <div className="mt-8 overflow-hidden">
                <RelatedCasesMarquee cases={relatedCases} />
              </div>
            </section>
          )}
        </div>

        {/* Aside sticky */}
        <aside className="lg:sticky lg:top-28 lg:h-max lg:self-start">
          <div className="space-y-5">
            {service.ctaBox && (
              <div className="surface-elevated relative rounded-2xl p-7">
                <p className="text-xl font-bold leading-tight text-[#0c1c40]">
                  {service.ctaBox.title}
                </p>
                {service.ctaBox.subtitle && (
                  <p className="mt-2 text-sm text-[#1e3a8a]">
                    {service.ctaBox.subtitle}
                  </p>
                )}
                <Link
                  href={service.ctaBox.buttonHref}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#187bef] px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-[#3a90f2]"
                >
                  {service.ctaBox.buttonText}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7h8m0 0L7 3m4 4l-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            )}

            <nav className="surface rounded-2xl p-5">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-[--color-fg-muted]">
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
                            ? "bg-[#187bef]/15 font-semibold text-[#3a90f2]"
                            : "text-[--color-fg-muted] hover:bg-white/[0.04] hover:text-[--color-fg]"
                        }`}
                      >
                        <span>{s.title}</span>
                        <span className="text-[#3a90f2]">→</span>
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
