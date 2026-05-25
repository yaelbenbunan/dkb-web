import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ServiceFaqs } from "@/components/servicios/ServiceFaqs";
import { ServiceCtaForm } from "@/components/servicios/ServiceCtaForm";
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
      {/* Hero del servicio: bg image + overlay azul + glow + línea inferior */}
      <header className="relative isolate overflow-hidden">
        <Image
          src="/img/servicios/hero-desarrollo-web1.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center opacity-45"
        />
        {/* Overlay con tinte azul corporativo */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "linear-gradient(180deg, rgba(12,28,64,0.7) 0%, rgba(8,17,42,0.92) 100%)",
          }}
        />
        {/* Spotlight azul */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(58,144,242,0.4), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30 fade-edges-y"
        />

        <Container className="relative py-16 md:py-20">
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-10">
            {/* Icono del servicio en card grande con glow azul */}
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-[#0c5ec4] shadow-[0_0_60px_rgba(24,123,239,0.5)]">
              <Image
                src={`/img/icons/servicios/${service.slug}.png`}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 brightness-0 invert"
              />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white ring-1 ring-accent/40">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white animate-ping-soft" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Servicio
              </p>
              <h1
                className="mt-4 font-black leading-[1] tracking-tight text-white"
                style={{ fontSize: "var(--text-display-lg)" }}
              >
                {service.heroTitle ?? service.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#cfdcf2] md:text-xl">
                {service.heroSubtitle ?? service.shortDescription}
              </p>
            </div>
          </div>
        </Container>

        {/* Línea brillante inferior */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
        />
      </header>

      {/* Body 2/3 + 1/3 */}
      <Container className="grid gap-12 py-20 lg:grid-cols-[2fr_1fr] lg:gap-14">
        <div className="min-w-0 space-y-16">
          {/* Intro + bullets */}
          {(service.intro || service.bullets) && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                ¿Qué <span className="text-accent">ofrecemos</span>?
              </h2>
              {service.intro && (
                <p className="mt-5 text-lg leading-relaxed text-fg-muted">
                  {service.intro}
                </p>
              )}
              {service.bullets && service.bullets.length > 0 && (
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {service.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-fg"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
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
                <span className="text-accent">enfoque</span>?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-fg-muted">
                {service.diferenciador}
              </p>
            </section>
          )}

          {/* FAQs */}
          {service.faqs && service.faqs.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Preguntas{" "}
                <span className="text-accent">frecuentes</span>
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
                Casos de <span className="text-accent">éxito</span>
              </h2>
              <p className="mt-2 text-fg-muted">
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
            <ServiceCtaForm serviceTitle={service.title} />

            <nav className="surface rounded-2xl p-5">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-fg-muted">
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
                            ? "bg-accent/15 font-semibold text-accent-hover"
                            : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"
                        }`}
                      >
                        <span>{s.title}</span>
                        <span className="text-accent-hover">→</span>
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
