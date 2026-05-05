"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
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
  const [members, setMembers] = useState(TEAM);

  useEffect(() => {
    setMembers(shuffle(TEAM));
  }, []);

  return (
    <section className="relative isolate overflow-hidden py-20 md:py-24">
      {/* Spotlight azul + grid sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "80%", ["--sy" as string]: "20%" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-25 fade-edges-y"
      />
      {/* Líneas brillantes azules superior + inferior */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
      />

      <Container>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#3a90f2]">
              <span className="inline-block h-px w-8 bg-[#3a90f2]" />
              Conoce a nuestro equipo
            </p>
            <h2
              className="mt-6 max-w-3xl font-black leading-[1.05] tracking-tight"
              style={{ fontSize: "var(--text-display-md)" }}
            >
              Lo que hacemos importa, pero{" "}
              <span className="italic text-accent">
                quién lo hace marca la diferencia
              </span>
              .
            </h2>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-bg-elevated ring-1 ring-white/[0.05]">
                <Image
                  src={m.avatar}
                  alt={m.name}
                  width={300}
                  height={300}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-5 text-base font-bold text-fg">
                {m.name}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-[#3a90f2]/80">
                {m.role}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="mt-16 text-center text-sm text-fg-muted">
          ¿Buscas al equipo en México?{" "}
          <a
            href="https://dinkbit.com/es/equipo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent hover:text-accent-hover"
          >
            Conócelos →
          </a>
        </p>
      </Container>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/40 to-transparent"
      />
    </section>
  );
}
