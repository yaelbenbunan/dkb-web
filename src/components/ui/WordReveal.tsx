"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface WordRevealProps {
  /** Texto a animar (palabra por palabra). */
  text: string;
  /** Retraso inicial en segundos. */
  delay?: number;
  /** Tiempo entre palabras en segundos. */
  staggerChildren?: number;
  /** Clase aplicada al contenedor. */
  className?: string;
  /** Elemento a renderizar. Default span. */
  as?: "span" | "div";
  /** Renderiza en cada palabra (útil para resaltar accent en una). */
  renderWord?: (word: string, i: number) => ReactNode;
}

/**
 * Anima un texto palabra-por-palabra con fade + slide hacia arriba.
 * Útil para titulares grandes — las palabras suben en cascada al entrar
 * en viewport.
 */
export function WordReveal({
  text,
  delay = 0,
  staggerChildren = 0.06,
  className,
  as = "span",
  renderWord,
}: WordRevealProps) {
  const words = text.split(/\s+/);
  const Container = as === "div" ? motion.div : motion.span;

  return (
    <Container
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        delayChildren: delay,
        staggerChildren,
      }}
      className={className}
    >
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          variants={{
            hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: {
                duration: 0.6,
                ease: [0.21, 0.47, 0.32, 0.98],
              },
            },
          }}
          className="inline-block whitespace-pre"
          style={{ willChange: "transform, opacity, filter" }}
        >
          {renderWord ? renderWord(w, i) : w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </Container>
  );
}
