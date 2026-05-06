"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

type Omitted = "initial" | "whileInView" | "viewport" | "transition";

interface RevealProps extends Omit<HTMLMotionProps<"div">, Omitted> {
  children: ReactNode;
  /** Retraso en segundos. Útil para encadenar varias secciones. */
  delay?: number;
  /** Distancia del slide vertical en px. Default 24. */
  y?: number;
  /** Duración en segundos. Default 0.6. */
  duration?: number;
  /** Si es true no aplica el slide vertical, solo el fade. Default false. */
  fadeOnly?: boolean;
}

/**
 * Wrapper que hace fade-in + slide hacia arriba cuando el contenido entra
 * en el viewport. Una sola vez. Ideal para envolver secciones completas
 * de la home u otras páginas para darles aparición suave al scrollear.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  fadeOnly = false,
  ...rest
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: fadeOnly ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
