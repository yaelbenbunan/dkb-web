import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { AnimatedCounter } from "./AnimatedCounter";

const STATS = [
  { icon: "/img/icons/counters/experiencia.svg", value: 15, label: "años de experiencia", prefix: "+" },
  { icon: "/img/icons/counters/webs.svg", value: 80, label: "webs desarrolladas", prefix: "+" },
  { icon: "/img/icons/counters/clientes.svg", value: 130, label: "clientes satisfechos", prefix: "+" },
  { icon: "/img/icons/counters/cafe.svg", value: 3000, label: "cafés", prefix: "+" },
];

/**
 * "Stats band" — formato inline de cuatro números en banda full-bleed.
 * Sin caja: integrado en el flujo, con separadores verticales sutiles.
 * El bg deep + glow azul lo conecta visualmente con las secciones contiguas.
 */
export function Counters() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Bg integrado: degradado vertical desde transparente para fundirse con la sección anterior */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(8,9,13,0.55) 18%, rgba(8,9,13,0.55) 82%, transparent 100%)",
        }}
      />
      {/* Spotlight central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(58,144,242,0.25), transparent 70%)",
        }}
      />
      {/* Línea brillante sutil arriba y abajo del bloque de stats */}
      <Container className="py-16 md:py-20">
        <div
          aria-hidden
          className="mb-12 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
        />

        <ul className="grid grid-cols-2 gap-y-10 lg:grid-cols-4 lg:gap-y-0">
          {STATS.map((s, i) => (
            <li
              key={s.label}
              className="group relative flex flex-col items-center text-center lg:px-4"
            >
              {/* Separador vertical entre items en desktop (excepto el primero) */}
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 hidden h-20 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-[#187bef]/25 to-transparent lg:block"
                />
              )}

              {/* Icono pequeño + label inline */}
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#3a90f2]/70">
                <Image
                  src={s.icon}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 opacity-80"
                />
              </div>

              {/* Número gigante con gradiente azul */}
              <p
                className="mt-3 font-black leading-none transition-transform duration-500 group-hover:scale-105"
                style={{
                  fontSize: "clamp(3rem, 6vw, 5rem)",
                  background: "linear-gradient(135deg, #ffffff 0%, #3a90f2 70%, #187bef 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.prefix}
                <AnimatedCounter end={s.value} />
              </p>

              <p className="mt-3 max-w-[180px] text-sm font-medium leading-snug text-[--color-fg-muted]">
                {s.label}
              </p>
            </li>
          ))}
        </ul>

        <div
          aria-hidden
          className="mt-12 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
        />
      </Container>
    </section>
  );
}
