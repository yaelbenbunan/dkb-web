import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CONTACT_INFO } from "@/lib/contact-info";
import { KitDigitalForm } from "../KitDigitalForm";
import {
  ALL_DEVICES,
  ALL_DEVICE_OPTIONS,
  KIT_TERMS,
  deviceLabel,
  getDevice,
} from "@/lib/kit-digital-data";

/** Formato de euros con separador de miles (sin depender de ICU del servidor). */
function eur(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function generateStaticParams() {
  return ALL_DEVICES.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = getDevice(slug);
  if (!d) return {};
  const label = deviceLabel(d);
  return {
    title: `${label} con el Kit Digital — dinkbit`,
    description: `${d.blurb}. Con el Bono del Kit Digital pagas solo ${eur(d.pricePay)}€ (el bono cubre 1.000€).`,
    alternates: { canonical: `/kit-digital/${d.slug}` },
    openGraph: {
      type: "website",
      url: `/kit-digital/${d.slug}`,
      title: `${label} con el Kit Digital — dinkbit`,
      description: d.blurb,
      images: [d.image],
      siteName: "dinkbit",
    },
  };
}

export default async function DeviceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const device = getDevice(slug);
  if (!device) notFound();

  const label = deviceLabel(device);
  const related = ALL_DEVICES.filter(
    (d) => d.slug !== device.slug && d.apple === device.apple,
  ).slice(0, 3);

  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: "Kit Digital", href: "/kit-digital" },
    { label: label },
  ];

  return (
    <article>
      <header className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30 fade-edges-y"
        />
        <Container className="py-10 md:py-14">
          <Breadcrumbs
            items={breadcrumbItems}
            className="text-xs font-medium uppercase tracking-[0.16em] text-fg-muted"
          />

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
            {/* Imagen */}
            <div className="surface overflow-hidden rounded-3xl bg-white lg:sticky lg:top-24">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={device.image}
                  alt={`${device.brand} ${device.name}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-8"
                />
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-accent/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent ring-1 ring-accent/30">
                  {device.kind === "desktop" ? "Sobremesa" : "Portátil"}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-muted">
                  {device.brand}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                {device.name}
              </h1>

              <p className="mt-4 text-lg leading-relaxed text-fg-muted">
                {device.description}
              </p>

              {/* Precio */}
              <div className="mt-6 rounded-2xl border border-border bg-bg-elevated p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm text-fg-muted line-through">
                    {eur(device.priceTotal)}€
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    bono cubre 1.000€
                  </span>
                  <span className="w-full text-3xl font-black text-fg">
                    Pagas solo {eur(device.pricePay)}€
                  </span>
                </div>
              </div>

              {/* Highlights */}
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {device.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-sm text-fg">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7.5L6 10.5L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#solicitar"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
                >
                  Solicitar este modelo
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href={`tel:${CONTACT_INFO.phoneE164}`}
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-base font-semibold text-fg transition-colors hover:bg-bg-subtle"
                >
                  {CONTACT_INFO.phone}
                </a>
              </div>

              {/* Ficha técnica */}
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">
                  Ficha técnica
                </h2>
                <dl className="mt-4 overflow-hidden rounded-2xl border border-border">
                  {device.specs.map((s, i) => (
                    <div
                      key={s.label}
                      className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
                        i % 2 === 0 ? "bg-bg-elevated" : "bg-bg-subtle"
                      }`}
                    >
                      <dt className="font-semibold text-fg-muted">{s.label}</dt>
                      <dd className="text-right font-medium text-fg">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* Solicitud */}
      <section id="solicitar" className="scroll-mt-24 py-14 md:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Solicítalo
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              ¿Te interesa este equipo?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              Déjanos tus datos —ya con el modelo seleccionado— y un asesor te
              contactará para tramitar tu Bono del Kit Digital.
            </p>

            <div className="surface mt-8 rounded-2xl p-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">
                Términos y condiciones
              </p>
              <ul className="mt-4 space-y-2.5">
                {KIT_TERMS.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-fg-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:h-max lg:self-start">
            <KitDigitalForm
              deviceOptions={ALL_DEVICE_OPTIONS}
              defaultDevice={label}
            />
          </div>
        </Container>
      </section>

      {/* Otros modelos */}
      {related.length > 0 && (
        <Container className="pb-20">
          <h2 className="text-2xl font-bold tracking-tight">Otros modelos</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {related.map((d) => (
              <Link
                key={d.slug}
                href={`/kit-digital/${d.slug}`}
                className="surface surface-hover group flex flex-col overflow-hidden rounded-2xl"
              >
                <div className="relative aspect-[4/3] w-full bg-white">
                  <Image
                    src={d.image}
                    alt={`${d.brand} ${d.name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">
                    {d.brand}
                  </p>
                  <p className="mt-1 text-sm font-bold text-fg">{d.name}</p>
                  <p className="mt-1 text-sm font-semibold text-accent-hover">
                    Pagas {eur(d.pricePay)}€
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      )}
    </article>
  );
}
