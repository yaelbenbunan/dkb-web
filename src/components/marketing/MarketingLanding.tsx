import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { CONTACT_INFO } from "@/lib/contact-info";
import { getCaseStudyBySlug } from "@/lib/content";
import type { MarketingCase, MarketingLanding } from "@/lib/marketing-landings";
import { MarketingLeadForm } from "./MarketingLeadForm";

interface Props {
  landing: MarketingLanding;
}

export function MarketingLandingPage({ landing }: Props) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landing.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Script
        id={`ld-faq-${landing.key}`}
        type="application/ld+json"
        strategy="beforeInteractive"
      >
        {JSON.stringify(faqSchema).replace(/</g, "\\u003c")}
      </Script>

      {/* ───────── Hero con formulario ───────── */}
      <section className="relative isolate overflow-hidden bg-bg-deep pb-16 pt-12 md:pb-24 md:pt-16">
        {landing.heroImage && (
          <Image
            src={landing.heroImage}
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="pointer-events-none absolute inset-0 -z-20 object-cover opacity-[0.18]"
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(24,123,239,0.35), transparent 70%)",
          }}
        />
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-14">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
                {landing.eyebrow}
              </p>
              <h1
                className="mt-5 text-balance font-black leading-[0.98] tracking-tight text-fg"
                style={{ fontSize: "var(--text-display-lg)" }}
              >
                <span className="text-accent">{landing.headlineAccent}</span>{" "}
                {landing.headlineRest}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
                {landing.subhead.pre}
                <mark className="rounded bg-accent/15 px-1.5 font-semibold text-accent-hover decoration-clone">
                  {landing.subhead.highlight}
                </mark>
                {landing.subhead.post}
              </p>
              <ul className="mt-8 grid gap-3">
                {landing.heroBullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-fg">
                    <CheckIcon />
                    <span className="text-base font-medium leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal from="up" delay={0.1} id="lead-form" className="scroll-mt-24">
              <MarketingLeadForm landing={landing} formLocation="hero" />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ───────── Subservicios (oferta integral) ───────── */}
      <section className="border-t border-border/60 bg-bg py-20 md:py-28">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-black tracking-tight text-fg md:text-4xl">
                {landing.subservicesTitle}
              </h2>
              <p className="mt-4 text-pretty text-lg text-fg-muted">
                {landing.subservicesIntro}
              </p>
            </div>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
            {landing.subservices.map((s, i) => (
              <Reveal
                key={s.title}
                delay={i * 0.1}
                className="surface surface-hover relative flex h-full flex-col overflow-hidden rounded-2xl p-7 md:p-8"
              >
                {/* Sheen de cristal */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent"
                />
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent-hover ring-1 ring-inset ring-white/10">
                  {i === 0 ? <MonitorIcon /> : <MegaphoneIcon />}
                </span>
                <h3 className="relative mt-5 text-xl font-bold leading-snug text-fg">
                  {s.title}
                </h3>
                <p className="relative mt-3 text-base leading-relaxed text-fg-muted">
                  {s.description}
                </p>
                <ul className="relative mt-6 grid gap-2.5 border-t border-border/50 pt-6">
                  {s.includes.map((inc) => (
                    <li
                      key={inc}
                      className="flex items-start gap-2.5 text-sm text-fg"
                    >
                      <CheckIcon small />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────── Casos de éxito ───────── */}
      <section className="border-t border-border/60 bg-bg-subtle py-20 md:py-28">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
                Casos de éxito
              </p>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-fg md:text-4xl">
                {landing.casesTitle}
              </h2>
              <p className="mt-4 text-pretty text-lg text-fg-muted">
                {landing.casesIntro}
              </p>
            </div>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
            {landing.cases.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.1}>
                <CaseCard caseRef={c} />
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-12 flex justify-center">
              <Link
                href="/casos-de-exito"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border-strong px-7 text-base font-semibold text-fg transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
              >
                Ver todos los casos de éxito
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowRightIcon />
                </span>
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="border-t border-border/60 bg-bg py-20 md:py-28">
        <Container size="narrow">
          <Reveal>
            <h2 className="text-center text-balance text-3xl font-black tracking-tight text-fg md:text-4xl">
              {landing.faqsTitle}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-3">
            {landing.faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <details className="group surface surface-hover relative overflow-hidden rounded-2xl">
                  {/* Sheen de cristal */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent"
                  />
                  <summary className="relative flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-base font-bold text-fg">
                    {f.q}
                    <span className="shrink-0 text-accent transition-transform group-open:rotate-45">
                      <PlusIcon />
                    </span>
                  </summary>
                  <p className="relative px-6 pb-6 text-base leading-relaxed text-fg-muted">
                    {f.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────── CTA final ───────── */}
      <section className="relative isolate overflow-hidden border-t border-border/60 bg-bg-deep py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-40"
        />
        <Container size="narrow">
          <Reveal>
            <div className="text-center">
              <h2 className="text-balance text-3xl font-black tracking-tight text-fg md:text-4xl">
                {landing.finalCtaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-fg-muted">
                {landing.finalCtaSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#lead-form"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.5)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
                >
                  Pide información
                </a>
                <a
                  href={`tel:${CONTACT_INFO.phoneE164}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border-strong px-7 text-base font-semibold text-fg transition-all hover:border-accent hover:text-accent"
                >
                  <PhoneIcon />
                  {CONTACT_INFO.phone}
                </a>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

function CaseCard({ caseRef }: { caseRef: MarketingCase }) {
  const study = getCaseStudyBySlug(caseRef.slug);
  if (!study) return null;
  const logoColor =
    study.clientLogo ?? `/img/casos/${study.slug}/logo/positivo.webp`;
  const logoWhite = logoColor.includes("/positivo.")
    ? logoColor.replace("/positivo.", "/negativo.")
    : `/img/casos/${study.slug}/logo/negativo.webp`;

  return (
    <Link
      href={`/casos-de-exito/${study.slug}`}
      aria-label={`Ver caso de éxito: ${study.client}`}
      className="surface surface-hover group relative flex h-full flex-col overflow-hidden rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-subtle"
    >
      {/* Brillo de marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-accent/25 opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Sheen de cristal */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent"
      />
      {/* Logo: blanco por defecto, a color en hover */}
      <div className="relative flex h-24 items-center justify-center">
        <span className="relative inline-flex h-20 w-full items-center justify-center">
          <Image
            src={logoWhite}
            alt={study.client}
            width={360}
            height={120}
            className="h-20 w-auto max-w-[260px] object-contain opacity-90 transition-opacity duration-300 group-hover:opacity-0"
          />
          <Image
            src={logoColor}
            alt=""
            aria-hidden
            width={360}
            height={120}
            className="absolute inset-0 m-auto h-20 w-auto max-w-[260px] object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </span>
      </div>
      <p className="relative mt-6 flex-1 text-pretty text-[15px] leading-relaxed text-fg-muted">
        {caseRef.description}
      </p>
      <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
        Ver caso
        <span className="transition-transform duration-200 group-hover:translate-x-1">
          <ArrowRightIcon />
        </span>
      </span>
    </Link>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ small }: { small?: boolean }) {
  const size = small ? 16 : 20;
  return (
    <span
      className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-hover"
      style={{ width: size + 6, height: size + 6 }}
    >
      <svg width={size - 6} height={size - 6} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function MonitorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="3.5" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 20.5h7M12 16.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10v4a1 1 0 001 1h2l1.5 4.5a1 1 0 001 .7h.5a1 1 0 001-1V15l9 4V5l-9 4H4a1 1 0 00-1 1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M9 3v12M3 9h12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
