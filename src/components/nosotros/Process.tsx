"use client";

import { motion } from "motion/react";
import { Container } from "@/components/ui/Container";

const STEPS = [
  {
    n: "01",
    title: "Análisis y descubrimiento",
    body: "Entendemos tu negocio, tu cliente y tu mercado antes de proponer nada. Sin atajos.",
  },
  {
    n: "02",
    title: "Estrategia",
    body: "Definimos el camino: objetivos medibles, canales adecuados y roadmap claro.",
  },
  {
    n: "03",
    title: "Implementación",
    body: "Diseñamos, desarrollamos y activamos cada palanca con foco en el resultado final.",
  },
  {
    n: "04",
    title: "Optimización continua",
    body: "Medimos, iteramos y escalamos. Lo que funciona se amplifica, lo que no, se ajusta.",
  },
];

export function Process() {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "85%", ["--sy" as string]: "30%" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-25 fade-edges-y"
      />

      <Container>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Cómo trabajamos
          </p>
          <h2
            className="mt-6 font-bold leading-[1.05] tracking-tight"
            style={{ fontSize: "var(--text-display-md)" }}
          >
            Un proceso{" "}
            <span className="italic text-[--color-accent]">claro</span> que
            convierte ideas en resultados.
          </h2>
        </div>

        {/* Línea horizontal decorativa que conecta los pasos en desktop */}
        <div className="relative mt-16">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-[#187bef]/0 via-[#187bef]/40 to-[#187bef]/0 md:block"
          />

          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                className="surface surface-hover group relative rounded-2xl p-7 transition-transform duration-300 hover:-translate-y-1"
              >
                {/* Número grande de fondo */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-5 top-3 text-7xl font-black leading-none text-white/[0.04] transition-colors group-hover:text-[#187bef]/20"
                >
                  {step.n}
                </span>

                {/* Dot azul superior */}
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#187bef]/15 text-[#3a90f2] ring-1 ring-[#187bef]/30">
                  <span className="text-xs font-bold">{step.n}</span>
                </span>

                <h3 className="relative mt-5 text-lg font-bold leading-tight text-[--color-fg]">
                  {step.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-[--color-fg-muted]">
                  {step.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
