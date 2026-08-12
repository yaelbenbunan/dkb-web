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
 * PALETA PROPIA, a propósito. La primera versión usaba los tokens del sitio y
 * en modo oscuro media landing quedaba con texto casi negro sobre fondo casi
 * negro: las secciones sin fondo explícito heredaban el tema del visitante
 * mientras el texto seguía fijado en claro. Aquí cada superficie declara su
 * fondo Y su color, así que se ve igual venga quien venga del anuncio.
 *
 * Tinta y crema en vez de blanco y gris: el azul de marca sobre crema cálido
 * encaja con el nicho mejor que el blanco clínico, y el coral da el punto de
 * energía que evita que parezca una plantilla corporativa más.
 */

const INK = "#0B1020";
const CREAM = "#FBF8F4";
const ACCENT = "#4F46E5";
/** Para texto sobre fondos CLAROS: el acento a secas se queda justo. */
const ACCENT_DEEP = "#3B32C4";
/**
 * Para texto sobre la tinta. El índigo es un color oscuro, así que sobre fondo
 * oscuro se queda en 3.0 de contraste y no se lee; esta versión aclarada sube a
 * 6.0. Es la diferencia con el coral, que al ser claro valía en ambos sitios.
 */
const ACCENT_ON_DARK = "#A9A2FF";

/** Franja diagonal que separa secciones sin recurrir a otra línea recta. */
function Slant({ from, to }: { from: string; to: string }) {
  return (
    <div aria-hidden="true" style={{ background: from }}>
      <div style={{ background: to, height: 56, clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }} />
    </div>
  );
}

export function WebExpressLandingPage({ landing }: { landing: Landing }) {
  return (
    <div style={{ background: CREAM, color: INK }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden" style={{ background: INK }}>
        <div className="absolute inset-0 -z-10">
          <ImageSlot
            {...landing.heroImage}
            width={1600}
            height={933}
            ready={landing.heroImage.ready}
            label="Fondo del hero"
            priority
            sizes="100vw"
            className="h-full w-full object-cover opacity-25"
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${INK} 30%, rgba(11,16,32,.82) 100%)` }}
          />
          <div
            className="absolute -right-32 -top-24 h-[560px] w-[560px] rounded-full blur-3xl"
            style={{ background: ACCENT, opacity: 0.16 }}
          />
          <div
            className="absolute -left-40 top-40 h-[520px] w-[520px] rounded-full blur-3xl"
            style={{ background: "#4F46E5", opacity: 0.22 }}
          />
        </div>

        <Container size="wide" className="py-16 text-center lg:py-24">
          {/* Píldora rellena en vez de contorno tenue: es lo primero que se ve
              al llegar del anuncio y tiene que sostener la mirada un segundo. */}
          <span
            className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-[13px] font-black uppercase tracking-[0.1em]"
            style={{ background: ACCENT, color: "#fff", boxShadow: "0 10px 30px -12px rgba(79,70,229,.9)" }}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {landing.eyebrow}
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-[2.75rem] font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-[4.25rem]">
            {landing.headline}{" "}
            <span className="relative inline-block">
              <span style={{ color: ACCENT_ON_DARK }}>{landing.headlineAccent}</span>
              {/* Subrayado a mano alzada: rompe la rigidez del bloque de texto */}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="14"
                viewBox="0 0 300 14"
                fill="none"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 9C60 3 130 2 190 5c40 2 80 5 108 4"
                  stroke={ACCENT_ON_DARK}
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity=".55"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
            {landing.subhead}
          </p>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {landing.heroBullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[15px] font-semibold text-white">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                  style={{ background: ACCENT, color: "#fff" }}
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="#formulario"
              className="inline-flex items-center justify-center rounded-2xl px-9 py-4 text-base font-black transition-transform hover:-translate-y-0.5"
              style={{ background: ACCENT, color: "#fff", boxShadow: "0 14px 34px -12px rgba(79,70,229,.8)" }}
            >
              Quiero mi web por {WEB_EXPRESS_PRICE} →
            </a>
            <p className="text-sm text-slate-400">Sin compromiso · Te contactamos en 24 h</p>
          </div>
        </Container>
      </section>

      {/* ── DATOS ────────────────────────────────────────────── */}
      <section style={{ background: INK }}>
        <Container size="wide">
          <dl className="grid gap-px overflow-hidden rounded-3xl sm:grid-cols-3" style={{ background: "rgba(255,255,255,.1)" }}>
            {landing.trustPoints.map((t) => (
              <div key={t.label} className="px-4 py-8 text-center" style={{ background: INK }}>
                <dt className="text-4xl font-black tracking-tight text-white sm:text-[2.75rem]">
                  {t.value}
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-300">{t.label}</dd>
              </div>
            ))}
          </dl>
          <div className="h-14" />
        </Container>
      </section>
      <Slant from={INK} to={CREAM} />

      {/* ── FORMULARIO A LO ANCHO ────────────────────────────── */}
      <section id="formulario" className="scroll-mt-20 py-16" style={{ background: CREAM }}>
        <Container size="wide">
          <WebExpressForm landing={landing} />
        </Container>
      </section>

      {/* ── DOLORES ──────────────────────────────────────────── */}
      <section className="py-16" style={{ background: CREAM }}>
        <Container size="wide">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
            {landing.painTitle}
          </h2>
          <ul className="mt-9 grid gap-5 md:grid-cols-2">
            {landing.pains.map((p, i) => (
              <li
                key={p}
                className="rounded-3xl bg-white p-7 text-[15px] leading-relaxed"
                style={{
                  color: "#3D4356",
                  border: "1px solid rgba(11,16,32,.08)",
                  boxShadow: "0 2px 10px -4px rgba(11,16,32,.1)",
                }}
              >
                <span
                  className="mb-4 block h-1 w-10 rounded-full"
                  style={{ background: ACCENT }}
                  aria-hidden="true"
                />
                {p}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ── PROCESO ──────────────────────────────────────────── */}
      <Slant from={CREAM} to={INK} />
      <section className="py-16" style={{ background: INK }}>
        <Container size="wide">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-[2.6rem]">
            {landing.stepsTitle}
          </h2>
          <p className="mt-3 text-lg text-slate-400">De la primera respuesta a tu web publicada.</p>

          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {/* Hilo que une los pasos: convierte cuatro tarjetas sueltas en un recorrido */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-7 hidden lg:block"
              style={{
                height: 2,
                background: `repeating-linear-gradient(90deg, rgba(169,162,255,.5) 0 10px, transparent 10px 20px)`,
              }}
            />
            {landing.steps.map((s, i) => (
              <li key={s.title} className="group relative transition-transform duration-200 hover:-translate-y-1.5">
                <span
                  className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
                  style={{
                    background: i === landing.steps.length - 1 ? ACCENT : INK,
                    color: i === landing.steps.length - 1 ? "#fff" : ACCENT_ON_DARK,
                    border: `2px solid ${ACCENT_ON_DARK}`,
                    boxShadow: i === landing.steps.length - 1 ? "0 12px 30px -12px rgba(79,70,229,.9)" : "none",
                  }}
                >
                  {i + 1}
                </span>
                <p className="mt-5 text-lg font-bold text-white">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── QUÉ INCLUYE / QUÉ NO ─────────────────────────────── */}
      <section className="pb-16" style={{ background: INK }}>
        <Container size="wide">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl p-8" style={{ background: "rgba(79,70,229,.09)", border: `1px solid rgba(79,70,229,.3)` }}>
              <h2 className="text-xl font-black text-white">
                {landing.includesTitle} <span style={{ color: ACCENT_ON_DARK }}>por {WEB_EXPRESS_PRICE}</span>
              </h2>
              <ul className="mt-6 flex flex-col gap-4">
                {landing.includes.map((i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-200">
                    <span className="mt-0.5 shrink-0 font-black" style={{ color: ACCENT_ON_DARK }}>✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            {/* Al mismo peso visual a propósito: esconder lo que queda fuera es
                lo que provoca la discusión incómoda a mitad de proyecto. */}
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)" }}>
              <h2 className="text-xl font-black text-white">{landing.excludesTitle}</h2>
              <ul className="mt-6 flex flex-col gap-4">
                {landing.excludes.map((e) => (
                  <li key={e} className="flex gap-3 text-[15px] leading-relaxed text-slate-400">
                    <span className="mt-0.5 shrink-0 font-black text-slate-500">—</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>
      <Slant from={INK} to={CREAM} />

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-16" style={{ background: CREAM }}>
        <Container className="max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
            {landing.faqsTitle}
          </h2>
          <div className="mt-9 flex flex-col gap-3">
            {landing.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl bg-white px-6 py-5"
                style={{ border: "1px solid rgba(11,16,32,.09)" }}
              >
                <summary
                  className="flex cursor-pointer list-none items-start gap-3 font-bold marker:hidden"
                  style={{ color: INK }}
                >
                  <span
                    className="mt-0.5 shrink-0 text-xl leading-none transition-transform group-open:rotate-45"
                    style={{ color: ACCENT_DEEP }}
                  >
                    +
                  </span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-8 text-[15px] leading-relaxed" style={{ color: "#3D4356" }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CIERRE ───────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden py-20" style={{ background: INK }}>
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 h-[460px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: ACCENT, opacity: 0.14 }}
        />
        <Container className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-[2.75rem]">
            Tu web lista en {WEB_EXPRESS_DAYS} días laborables
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-300">
            Precio cerrado de {WEB_EXPRESS_PRICE}. Sin cuotas mensuales y sin sorpresas.
          </p>
          <a
            href="#formulario"
            className="mt-9 inline-flex items-center justify-center rounded-2xl px-10 py-4 text-base font-black transition-transform hover:-translate-y-0.5"
            style={{ background: ACCENT, color: "#fff", boxShadow: "0 14px 34px -12px rgba(79,70,229,.8)" }}
          >
            Quiero mi web por {WEB_EXPRESS_PRICE} →
          </a>
        </Container>
      </section>
    </div>
  );
}
