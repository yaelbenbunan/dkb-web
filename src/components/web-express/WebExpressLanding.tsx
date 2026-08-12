import { Container } from "@/components/ui/Container";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { WebExpressForm } from "./WebExpressForm";
import {
  WEB_EXPRESS_PRICE,
  WEB_EXPRESS_DAYS,
  type WebExpressLanding as Landing,
} from "@/lib/web-express-landings";

/**
 * Landing de captación para el producto de web cerrada.
 *
 * El hero va sobre fondo oscuro con imagen: en un nicho donde todos los
 * competidores usan blanco y azul claro, el contraste es lo que hace que el
 * anuncio no parezca uno más. El formulario ocupa casi la mitad del ancho y
 * está a la vista desde el primer scroll, porque en tráfico de pago la mayoría
 * no baja.
 */
export function WebExpressLandingPage({ landing }: { landing: Landing }) {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        {/* Imagen de fondo + velo para que el texto se lea siempre */}
        <div className="absolute inset-0 -z-10">
          <ImageSlot
            {...landing.heroImage}
            width={1600}
            height={933}
            ready={landing.heroImage.ready}
            label="Fondo del hero"
            priority
            sizes="100vw"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/80" />
          <div
            className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
            style={{ background: "var(--color-accent-glow)", opacity: 0.18 }}
          />
        </div>

        <Container size="wide" className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-12 lg:py-20">
          <div className="lg:pt-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[13px] font-bold text-accent-hover">
              <span aria-hidden="true">🎓</span>
              {landing.eyebrow}
            </span>

            <h1 className="mt-6 text-[2.6rem] font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
              {landing.headline}{" "}
              <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                {landing.headlineAccent}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              {landing.subhead}
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {landing.heroBullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-black text-white">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            {/* Aviso de a quién va dirigido: posiciona y filtra a la vez */}
            <p className="mt-8 max-w-lg rounded-xl border-l-[3px] border-accent bg-white/5 py-3 pl-4 pr-3 text-sm leading-relaxed text-slate-300">
              {landing.audienceNote}
            </p>
          </div>

          <div id="formulario" className="lg:sticky lg:top-24 lg:h-max lg:self-start">
            <WebExpressForm landing={landing} />
          </div>
        </Container>
      </section>

      {/* ── SEÑALES DE CONFIANZA ─────────────────────────────── */}
      <section className="border-b border-slate-200 bg-white">
        <Container size="wide">
          <dl className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {landing.trustPoints.map((t) => (
              <div key={t.label} className="px-2 py-7 text-center">
                <dt className="text-3xl font-black tracking-tight text-accent">{t.value}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-600">{t.label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ── DOLORES DEL NICHO ────────────────────────────────── */}
      <section className="bg-slate-50 py-16">
        <Container size="wide">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {landing.painTitle}
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {landing.pains.map((p) => (
              <li
                key={p}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-[15px] leading-relaxed text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <span className="mb-3 block text-xl" aria-hidden="true">
                  💭
                </span>
                {p}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ── CÓMO QUEDA ───────────────────────────────────────── */}
      <section className="py-16">
        <Container size="wide" className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {landing.showcaseTitle}
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">
              {landing.showcaseIntro}
            </p>
            <a
              href="#formulario"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Quiero la mía
            </a>
          </div>
          <ImageSlot
            {...landing.mockupImage}
            width={1400}
            height={1000}
            ready={landing.mockupImage.ready}
            label="Mockup: la web en ordenador y móvil"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="w-full rounded-2xl"
          />
        </Container>
      </section>

      {/* ── QUÉ INCLUYE / QUÉ NO ─────────────────────────────── */}
      <section className="bg-slate-950 py-16">
        <Container size="wide">
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.07] p-7">
              <h2 className="text-xl font-black text-white">
                {landing.includesTitle}{" "}
                <span className="text-accent-hover">por {WEB_EXPRESS_PRICE}</span>
              </h2>
              <ul className="mt-5 flex flex-col gap-3.5">
                {landing.includes.map((i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-200">
                    <span className="mt-0.5 shrink-0 font-black text-accent-hover">✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            {/* Al mismo peso visual a propósito: esconder lo que queda fuera es
                lo que provoca la discusión incómoda a mitad de proyecto. */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
              <h2 className="text-xl font-black text-white">{landing.excludesTitle}</h2>
              <ul className="mt-5 flex flex-col gap-3.5">
                {landing.excludes.map((e) => (
                  <li key={e} className="flex gap-3 text-[15px] leading-relaxed text-slate-400">
                    <span className="mt-0.5 shrink-0 font-black text-slate-600">—</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────── */}
      <section className="py-16">
        <Container size="wide">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {landing.stepsTitle}
          </h2>
          <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {landing.steps.map((s, i) => (
              <li
                key={s.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[15px] font-black text-white">
                  {i + 1}
                </span>
                <p className="mt-4 font-bold text-slate-900">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <Container className="max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {landing.faqsTitle}
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {landing.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-slate-200 bg-white px-6 py-5 transition-colors open:border-accent/40"
              >
                <summary className="flex cursor-pointer list-none items-start gap-3 font-semibold text-slate-900 marker:hidden">
                  <span className="mt-0.5 shrink-0 text-lg leading-none text-accent transition-transform group-open:rotate-45">
                    +
                  </span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-8 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CIERRE ───────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-slate-950 py-20">
        <div
          className="absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "var(--color-accent-glow)", opacity: 0.16 }}
        />
        <Container className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Tu web lista en {WEB_EXPRESS_DAYS} días laborables
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-300">
            Precio cerrado de {WEB_EXPRESS_PRICE}. Sin cuotas mensuales y sin sorpresas.
          </p>
          <a
            href="#formulario"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-accent px-9 py-4 text-base font-bold text-white transition-colors hover:bg-accent-hover"
          >
            Quiero mi web por {WEB_EXPRESS_PRICE}
          </a>
        </Container>
      </section>
    </>
  );
}
