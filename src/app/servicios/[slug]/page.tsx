import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
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
  const relatedCases = getAllCaseStudies().filter((c) => c.tags.includes(slug));

  return (
    <article>
      {/* Hero del servicio con foto de fondo + overlay fuerte */}
      <header className="relative isolate overflow-hidden py-24 md:py-32">
        <Image
          src="/img/home/hero-bg-alt-meeting.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center opacity-30"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,9,13,0.85) 0%, rgba(14,16,21,0.92) 100%)",
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

        <Container className="grid gap-10 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[--color-bg-elevated] shadow-[0_0_40px_rgba(24,123,239,0.3)] ring-1 ring-[--color-accent]/30">
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
        <div className="space-y-16">
          {/* Intro + bullets con check azul */}
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
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[--color-accent-soft] text-[--color-accent]">
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
                <span className="text-[--color-accent]">enfoque</span>?
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
                <span className="text-[--color-accent]">frecuentes</span>
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
                Casos de <span className="text-[--color-accent]">éxito</span>
              </h2>
              <p className="mt-2 text-[--color-fg-muted]">
                Algunos clientes a los que ayudamos con {service.title.toLowerCase()}.
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {relatedCases.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/casos-de-exito/${c.slug}`}
                      className="flex h-24 items-center justify-center rounded-2xl bg-[#16181f] p-4 ring-1 ring-white/[0.05] transition-all hover:-translate-y-0.5 hover:ring-[--color-accent]/40"
                    >
                      {c.clientLogo ? (
                        <Image
                          src={c.clientLogo}
                          alt={c.client}
                          width={140}
                          height={56}
                          className="max-h-12 w-auto object-contain opacity-80 transition group-hover:opacity-100"
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

        {/* Aside sticky */}
        <aside className="lg:sticky lg:top-28 lg:h-max lg:self-start">
          <div className="space-y-5">
            {/* CTA Box estilo formulario blanco */}
            {service.ctaBox && (
              <div className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),0_0_60px_-10px_rgba(24,123,239,0.4)]">
                <p className="text-xl font-bold leading-tight text-slate-900">
                  {service.ctaBox.title}
                </p>
                {service.ctaBox.subtitle && (
                  <p className="mt-2 text-sm text-slate-600">
                    {service.ctaBox.subtitle}
                  </p>
                )}
                <Link
                  href={service.ctaBox.buttonHref}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[--color-accent] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:bg-[--color-accent-hover]"
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

            {/* Menu de servicios sticky con ring sutil */}
            <nav className="rounded-2xl bg-[#16181f] p-5 ring-1 ring-white/[0.05]">
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
                            ? "bg-[--color-accent-soft] font-semibold text-[--color-accent]"
                            : "text-[--color-fg-muted] hover:bg-white/[0.03] hover:text-[--color-fg]"
                        }`}
                      >
                        <span>{s.title}</span>
                        <span className="text-[--color-accent]">→</span>
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
