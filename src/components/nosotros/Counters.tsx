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
    <section className="relative isolate overflow-hidden bg-[--color-bg-deep] py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "50%", ["--sy" as string]: "50%" }}
      />
      <Container>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <Image
                src={s.icon}
                alt=""
                width={56}
                height={56}
                className="mx-auto h-14 w-14"
              />
              <p
                className="mt-6 font-black leading-none text-[--color-accent]"
                style={{ fontSize: "var(--text-display-md)" }}
              >
                +<AnimatedCounter end={s.value} />
              </p>
              <p className="mt-3 text-sm text-[--color-fg-muted]">{s.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
