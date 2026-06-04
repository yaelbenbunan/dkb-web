import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { CONTACT_INFO } from "@/lib/contact-info";
import { KitDigitalForm } from "./KitDigitalForm";
import {
  WINDOWS_DEVICES,
  APPLE_DEVICES,
  ALL_DEVICE_OPTIONS,
  EMPLOYEE_RANGES,
  KIT_TERMS,
  MIN_PAY,
  type KitDevice,
} from "@/lib/kit-digital-data";

function eur(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export const metadata: Metadata = {
  title: "Ordenadores con el Kit Digital — dinkbit",
  description: `Renueva tu equipo con el Bono del Kit Digital: cubre 1.000€ del precio y tú pagas desde ${MIN_PAY}€. Portátiles y sobremesas de Lenovo, Acer, Asus, Dell, Samsung y Apple, con tramitación, entrega y soporte incluidos.`,
  alternates: { canonical: "/kit-digital" },
  openGraph: {
    type: "website",
    url: "/kit-digital",
    title: "Ordenadores con el Kit Digital — dinkbit",
    description: `El Bono del Kit Digital cubre 1.000€ de tu nuevo ordenador. Equipos desde ${MIN_PAY}€, con tramitación, entrega y soporte incluidos.`,
    siteName: "dinkbit",
  },
};

function DeviceCard({ device }: { device: KitDevice }) {
  return (
    <Link
      href={`/kit-digital/${device.slug}`}
      className="surface surface-hover group flex h-full flex-col overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[4/3] w-full bg-white">
        <Image
          src={device.image}
          alt={`${device.brand} ${device.name}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-accent/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-accent/40">
          Pagas {eur(device.pricePay)}€
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">
          {device.brand}
        </p>
        <p className="mt-1 text-base font-bold leading-snug text-fg">{device.name}</p>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{device.blurb}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-hover">
          Ver ficha
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default function KitDigitalPage() {
  return (
    <>
      {/* Hero */}
      <header className="relative isolate overflow-hidden py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "75%", ["--sy" as string]: "25%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent ring-1 ring-accent/30">
                Bono Kit Digital
              </p>
              <h1
                className="mt-6 font-black leading-[1.02] tracking-tight"
                style={{ fontSize: "var(--text-display-lg)" }}
              >
                Renueva tu ordenador{" "}
                <span className="text-accent">con el Kit Digital.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-muted">
                El Bono del Kit Digital cubre{" "}
                <strong className="text-fg">1.000€</strong> del precio de tu nuevo
                equipo: tú pagas solo la diferencia, desde{" "}
                <strong className="text-fg">{eur(MIN_PAY)}€</strong>. Nosotros nos
                encargamos de toda la tramitación.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#catalogo"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
                >
                  Ver catálogo
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
            </div>

            {/* Highlight card */}
            <Reveal from="right" className="lg:justify-self-end">
              <div className="surface-elevated relative w-full max-w-sm rounded-3xl p-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  El bono cubre
                </p>
                <p className="mt-2 text-6xl font-black text-[#0c1c40]">1.000€</p>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                  Tu equipo desde
                </p>
                <p className="mt-1 text-5xl font-black text-accent">{eur(MIN_PAY)}€</p>
                <div className="mt-6 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-[#0c1c40]">
                  Tramitación, entrega y soporte técnico{" "}
                  <strong>incluidos.</strong>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </header>

      {/* Value props */}
      <Container className="pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "El bono cubre 1.000€", d: "Descontamos 1.000€ del precio del equipo; pagas solo la diferencia." },
            { t: "Tramitación incluida", d: "Nos encargamos de todo el papeleo del Kit Digital, de principio a fin." },
            { t: "Soporte técnico incluido", d: "Reparaciones en remoto o in situ y equipo de sustitución si hace falta." },
            { t: "Entrega en España", d: "Recibes el ordenador configurado y listo para trabajar." },
          ].map((v, i) => (
            <Reveal key={v.t} delay={Math.min(i, 4) * 0.07}>
              <div className="surface h-full rounded-2xl p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                  <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7.5L6 10.5L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="mt-4 text-base font-bold text-fg">{v.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{v.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Cómo funciona */}
      <Container className="py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Cómo funciona
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Tu ordenador en <span className="text-accent">4 pasos</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Solicita el bono", d: "Te ayudamos con toda la tramitación del Kit Digital, de principio a fin." },
            { n: "02", t: "Elige tu equipo", d: "Del catálogo, escoge el portátil o sobremesa que mejor encaje contigo." },
            { n: "03", t: "Aplica el bono", d: "Descontamos 1.000€ del precio; abonas solo la diferencia." },
            { n: "04", t: "Recíbelo configurado", d: "Entrega dentro de España, listo para ponerte a trabajar." },
          ].map((s, i) => (
            <Reveal key={s.n} delay={Math.min(i, 4) * 0.07}>
              <div className="surface h-full rounded-2xl p-6">
                <p className="text-3xl font-black text-accent/30">{s.n}</p>
                <p className="mt-3 text-base font-bold text-fg">{s.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Catálogo: PC / Windows */}
      <div id="catalogo" className="scroll-mt-24" />
      <Container className="py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Catálogo
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Portátiles y sobremesas
          </h2>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Equipos profesionales de Lenovo, Acer, Asus, Dell y Samsung. Todos con
            el bono de 1.000€ ya descontado.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WINDOWS_DEVICES.map((d, i) => (
            <Reveal key={d.slug} delay={Math.min(i, 6) * 0.04} scale>
              <DeviceCard device={d} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Catálogo: Apple */}
      <Container className="py-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Apple
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            MacBook con el Kit Digital
          </h2>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Toda la gama MacBook Air y Pro con chip M5. Aplica el bono y paga solo
            la diferencia.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPLE_DEVICES.map((d, i) => (
            <Reveal key={d.slug} delay={Math.min(i, 6) * 0.04} scale>
              <DeviceCard device={d} />
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Solicitud + términos */}
      <section id="solicitar" className="scroll-mt-24 py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Solicítalo
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Empieza hoy tu solicitud
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              Déjanos tus datos y un asesor te contactará para tramitar tu Bono del
              Kit Digital y elegir el equipo perfecto para ti.
            </p>

            <div className="mt-8 space-y-3">
              <a
                href={`tel:${CONTACT_INFO.phoneE164}`}
                className="flex items-center gap-3 text-fg transition-colors hover:text-accent"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-semibold">{CONTACT_INFO.phone}</span>
              </a>
              <a
                href={CONTACT_INFO.socials?.whatsapp ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-fg transition-colors hover:text-accent"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.06 24l1.69-6.16A11.87 11.87 0 010 11.94 11.94 11.94 0 0111.94 0 11.94 11.94 0 0124 11.94a11.94 11.94 0 01-17.8 10.38L.06 24zM6.6 20.13l.37.22a9.86 9.86 0 005 1.38 9.92 9.92 0 100-19.84 9.92 9.92 0 00-8.4 15.2l.25.4-1 3.65 3.78-1.01z" />
                  </svg>
                </span>
                <span className="font-semibold">Escríbenos por WhatsApp</span>
              </a>
            </div>

            {/* Términos */}
            <div className="surface mt-10 rounded-2xl p-6">
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
              employeeRanges={EMPLOYEE_RANGES}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
