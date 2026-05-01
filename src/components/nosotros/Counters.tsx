import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { AnimatedCounter } from "./AnimatedCounter";

const STATS = [
  { icon: "/img/icons/counters/experiencia.svg", value: 15, label: "años de experiencia" },
  { icon: "/img/icons/counters/webs.svg", value: 80, label: "webs desarrolladas" },
  { icon: "/img/icons/counters/clientes.svg", value: 130, label: "clientes satisfechos" },
  { icon: "/img/icons/counters/cafe.svg", value: 3000, label: "cafés para seguir haciendo cosas increíbles" },
];

export function Counters() {
  return (
    <section className="relative isolate overflow-hidden bg-[--color-bg-deep] py-12 md:py-16">
      {/* Línea brillante azul superior + inferior */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
      />
      {/* Spotlight central + grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 50%, rgba(24,123,239,0.18), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30"
      />

      <Container>
        <div className="grid divide-y divide-[#187bef]/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="group relative flex flex-col items-center gap-3 px-6 py-8 text-center transition-colors hover:bg-white/[0.02]"
            >
              {/* Subtle accent dot top-left visible on hover */}
              <span
                aria-hidden
                className="absolute left-6 top-6 h-1.5 w-1.5 rounded-full bg-[#187bef] opacity-0 transition-opacity group-hover:opacity-100"
              />
              <Image
                src={s.icon}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 transition-transform duration-500 group-hover:scale-110"
              />
              <p
                className="font-black leading-none"
                style={{
                  fontSize: "var(--text-display-md)",
                  background: "linear-gradient(135deg, #3a90f2 0%, #187bef 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                +<AnimatedCounter end={s.value} />
              </p>
              <p className="text-sm leading-snug text-[--color-fg-muted]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
