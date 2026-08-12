import { Container } from "@/components/ui/Container";
import { WebExpressForm } from "./WebExpressForm";
import {
  WEB_EXPRESS_PRICE,
  WEB_EXPRESS_DAYS,
  type WebExpressLanding as Landing,
} from "@/lib/web-express-landings";

/**
 * Landing de captación para el producto de web cerrada.
 *
 * El formulario va arriba, junto al titular: en tráfico de pago la mayoría no
 * baja, así que la conversión tiene que estar a la vista desde el primer
 * momento. El resto de secciones existen para quien sí baja a informarse.
 */
export function WebExpressLandingPage({ landing }: { landing: Landing }) {
  return (
    <>
      {/* Hero + formulario */}
      <section className="border-b border-slate-200 bg-slate-50">
        <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14 lg:py-16">
          <div className="lg:pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              {landing.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              {landing.headline}{" "}
              <span className="text-accent">{landing.headlineAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {landing.subhead}
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {landing.heroBullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-[15px] font-semibold text-slate-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-white">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div id="formulario" className="lg:sticky lg:top-24 lg:h-max lg:self-start">
            <WebExpressForm landing={landing} />
          </div>
        </Container>
      </section>

      {/* Dolores del nicho */}
      <section className="py-14">
        <Container>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{landing.painTitle}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {landing.pains.map((p) => (
              <li
                key={p}
                className="rounded-xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700"
              >
                {p}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Qué incluye y qué no. Juntos y al mismo peso visual: esconder lo que
          queda fuera es lo que genera la discusión incómoda a mitad de proyecto. */}
      <section className="border-y border-slate-200 bg-slate-50 py-14">
        <Container className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {landing.includesTitle}{" "}
              <span className="text-accent">por {WEB_EXPRESS_PRICE}</span>
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {landing.includes.map((i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
                  <span className="mt-0.5 shrink-0 font-black text-accent">✓</span>
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{landing.excludesTitle}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {landing.excludes.map((e) => (
                <li key={e} className="flex gap-3 text-[15px] leading-relaxed text-slate-500">
                  <span className="mt-0.5 shrink-0 font-black text-slate-400">—</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Cómo funciona */}
      <section className="py-14">
        <Container>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{landing.stepsTitle}</h2>
          <ol className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {landing.steps.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-black text-white">
                  {i + 1}
                </span>
                <p className="mt-3 font-bold text-slate-900">{s.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-50 py-14">
        <Container className="max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{landing.faqsTitle}</h2>
          <div className="mt-6 flex flex-col gap-3">
            {landing.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">
                  <span className="mr-2 text-accent group-open:hidden">+</span>
                  <span className="mr-2 hidden text-accent group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Cierre */}
      <section className="py-14">
        <Container className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Tu web lista en {WEB_EXPRESS_DAYS} días laborables
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Precio cerrado de {WEB_EXPRESS_PRICE}. Sin cuotas mensuales y sin sorpresas.
          </p>
          <a
            href="#formulario"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-lg bg-accent px-8 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Quiero mi web
          </a>
        </Container>
      </section>
    </>
  );
}
