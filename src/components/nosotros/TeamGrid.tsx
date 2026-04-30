"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Container } from "@/components/ui/Container";
import { TEAM } from "@/lib/team";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TeamGrid() {
  // Orden distinto en cada render del cliente. SSR sirve el orden fijo, cliente
  // hidrata con orden aleatorio (acepta hydration mismatch silencioso).
  const members = useMemo(() => shuffle(TEAM), []);

  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
            Conoce a nuestro equipo
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl">
            Lo que hacemos importa, pero quién lo hace marca la diferencia.
          </h2>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
              className="group flex flex-col items-center text-center"
            >
              <div className="aspect-square w-full overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] transition-colors group-hover:border-[--color-accent]">
                <Image
                  src={m.avatar}
                  alt={m.name}
                  width={300}
                  height={300}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-4 text-base font-semibold text-[--color-fg]">
                {m.name}
              </p>
              <p className="text-sm text-[--color-fg-muted]">{m.role}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-[--color-fg-muted]">
          ¿Buscas al equipo en México?{" "}
          <a
            href="https://dinkbit.com/es/equipo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[--color-accent] hover:text-[--color-accent-hover]"
          >
            Conócelos →
          </a>
        </p>
      </Container>
    </section>
  );
}
