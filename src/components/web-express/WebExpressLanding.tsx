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
 * encaja con el nicho mejor que el blanco clínico y da profundidad sin salirse
 * de la paleta corporativa.
 */

const INK = "#0B1020";
const CREAM = "#FBF8F4";
const ACCENT = "#187bef";
/** Para texto sobre fondos CLAROS: el acento a secas se queda justo. */
const ACCENT_DEEP = "#0F5FBD";
/**
 * Para texto sobre la tinta. El azul de marca sobre la tinta se queda en 4.4 de
 * contraste, justo por debajo del mínimo para texto pequeño. Esta versión
 * aclarada sube a 7.3 y sirve para etiquetas, cifras y glifos sobre oscuro.
 */
const ACCENT_ON_DARK = "#7DB0F7";

/**
 * Franja diagonal que separa secciones sin recurrir a otra línea recta.
 *
 * En SVG y no con clip-path sobre un div: el borde recortado se antialiasea y
 * a ciertos zooms dejaba asomar una línea de un píxel del color de detrás. El
 * SVG con `shape-rendering` y el desbordamiento de medio píxel arriba y abajo
 * hacen que la costura no aparezca a ningún zoom.
 */
function Slant({ from, to }: { from: string; to: string }) {
  return (
    <div
      aria-hidden="true"
      style={{ background: from, lineHeight: 0, marginTop: -1, marginBottom: -1 }}
    >
      <svg
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: 56 }}
      >
        {/* El polígono rebasa el lienzo por los cuatro lados para que el borde
            antialiaseado quede fuera del área visible. */}
        <polygon points="-1,7 101,-1 101,7" fill={to} />
      </svg>
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
            style={{ background: "#0EA5E9", opacity: 0.2 }}
          />
        </div>

        {/* Sin etiqueta sobre el titular: en móvil se comía la altura que hace
            falta para que el botón entre sin hacer scroll, que es lo que decide
            si alguien que llega del anuncio convierte o se va. */}
        <Container size="wide" className="py-10 text-center sm:py-16 lg:py-24">
          <h1 className="mx-auto max-w-4xl text-[2.4rem] font-black leading-[1.03] tracking-[-0.03em] text-white sm:text-[4.25rem]">
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

          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-slate-300 sm:mt-8 sm:text-xl">
            {landing.subhead}
          </p>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 sm:mt-9 sm:gap-x-7">
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

          <div className="mt-7 flex flex-col items-center gap-3 sm:mt-10 sm:gap-4">
            <a
              href="#formulario"
              className="inline-flex items-center justify-center rounded-2xl px-9 py-4 text-base font-black transition-transform hover:-translate-y-0.5"
              style={{ background: ACCENT, color: "#fff", boxShadow: "0 14px 34px -12px rgba(24,123,239,.8)" }}
            >
              Quiero mi web por {WEB_EXPRESS_PRICE} →
            </a>
            <p className="text-[15px] text-slate-400">Sin compromiso · Te contactamos en 24 h</p>
          </div>
        </Container>
      </section>

      {/* ── DATOS ────────────────────────────────────────────── */}
      <section style={{ background: INK }}>
        <Container size="wide">
          {/* Separadores con borde explícito y no con el truco de gap-px sobre un
              fondo: aquello dejaba asomar una línea clara por el borde superior. */}
          <dl
            className="grid divide-y divide-white/10 rounded-3xl sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)" }}
          >
            {landing.trustPoints.map((t) => (
              <div key={t.label} className="relative px-6 py-12 text-center">
                <span
                  className="mx-auto mb-5 block h-1 w-12 rounded-full"
                  style={{ background: ACCENT_ON_DARK }}
                  aria-hidden="true"
                />
                <dt className="text-5xl font-black leading-none tracking-[-0.04em] text-white sm:text-6xl">
                  {t.value}
                </dt>
                <dd className="mx-auto mt-3 max-w-[18ch] text-base font-medium text-slate-300">
                  {t.label}
                </dd>
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
          <p className="mt-3 text-lg" style={{ color: "#5A6178" }}>
            {landing.painIntro}
          </p>

          {/* Problema arriba, en grande y entrecomillado como si lo dijera quien
              lee; respuesta debajo, separada y en el acento. Reconocerse en la
              queja es lo que engancha, pero sin la respuesta al lado la sección
              solo describe el problema y no da motivo para seguir. */}
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {landing.pains.map((p) => (
              <li
                key={p.problem}
                className="flex flex-col rounded-3xl bg-white p-7 transition-transform duration-200 hover:-translate-y-1"
                style={{
                  border: "1px solid rgba(11,16,32,.08)",
                  boxShadow: "0 2px 14px -6px rgba(11,16,32,.14)",
                }}
              >
                <p
                  className="text-lg font-bold leading-snug sm:text-xl"
                  style={{ color: INK }}
                >
                  {p.problem}
                </p>
                <div
                  className="mt-5 flex gap-3 border-t pt-5 text-[15px] leading-relaxed"
                  style={{ borderColor: "rgba(11,16,32,.08)", color: "#3D4356" }}
                >
                  <span
                    className="mt-1 shrink-0 text-base font-black leading-none"
                    style={{ color: ACCENT_DEEP }}
                    aria-hidden="true"
                  >
                    →
                  </span>
                  {p.answer}
                </div>
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
                background: `repeating-linear-gradient(90deg, rgba(125,176,247,.5) 0 10px, transparent 10px 20px)`,
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
                    boxShadow: i === landing.steps.length - 1 ? "0 12px 30px -12px rgba(24,123,239,.9)" : "none",
                  }}
                >
                  {i + 1}
                </span>
                <p className="mt-5 text-lg font-bold text-white">{s.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{s.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── QUÉ INCLUYE / QUÉ NO ─────────────────────────────── */}
      <section className="pb-16" style={{ background: INK }}>
        <Container size="wide">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl p-8" style={{ background: "rgba(24,123,239,.09)", border: `1px solid rgba(24,123,239,.3)` }}>
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
            style={{ background: ACCENT, color: "#fff", boxShadow: "0 14px 34px -12px rgba(24,123,239,.8)" }}
          >
            Quiero mi web por {WEB_EXPRESS_PRICE} →
          </a>
        </Container>
      </section>
    </div>
  );
}
