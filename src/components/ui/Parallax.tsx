"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

interface ParallaxProps {
  children: ReactNode;
  /** Magnitud del parallax en px. Positivo = más lento que el scroll, negativo = más rápido. */
  offset?: number;
  className?: string;
}

/**
 * Wrapper que mueve el contenido con la velocidad del scroll para crear
 * efecto parallax. Útil para fondos decorativos.
 */
export function Parallax({ children, offset = 80, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
