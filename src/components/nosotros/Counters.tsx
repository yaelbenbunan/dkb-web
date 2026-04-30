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
    <section className="border-y border-[--color-border] bg-[--color-bg-subtle] py-20">
      <Container>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <Image
                src={s.icon}
                alt=""
                width={48}
                height={48}
                className="mx-auto h-12 w-12"
              />
              <p className="mt-4 text-5xl font-bold text-[--color-accent]">
                +<AnimatedCounter end={s.value} />
              </p>
              <p className="mt-2 text-sm text-[--color-fg-muted]">{s.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
