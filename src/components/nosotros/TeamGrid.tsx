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
  const members = useMemo(() => shuffle(TEAM), []);

  return (
    <section className="relative isolate overflow-hidden py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-30 fade-edges-y"
      />
      <Container>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Conoce a nuestro equipo
          </p>
          <h2
            className="mt-6 font-black leading-[1.05] tracking-tight"
            style={{ fontSize: "var(--text-display-md)" }}
          >
            Lo que hacemos importa, pero{" "}
            <span className="italic text-[--color-accent]">
              quién lo hace marca la diferencia
            </span>
            .
          </h2>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[--color-bg-elevated] transition-all group-hover:-translate-y-1">
                <Image
                  src={m.avatar}
                  alt={m.name}
                  width={300}
                  height={300}
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[--color-bg-deep]/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
              <p className="mt-5 text-base font-bold text-[--color-fg]">
                {m.name}
              </p>
              <p className="text-sm text-[--color-fg-muted]">{m.role}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-16 text-center text-sm text-[--color-fg-muted]">
          ¿Buscas al equipo en México?{" "}
          <a
            href="https://dinkbit.com/es/equipo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[--color-accent] hover:text-[--color-accent-hover]"
          >
            Conócelos →
          </a>
        </p>
      </Container>
    </section>
  );
}
